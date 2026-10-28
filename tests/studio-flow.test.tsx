// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { emptyStudio, saveInvoice, type InvoiceInput, type StudioData } from "@/lib/studio/schema"

const state = vi.hoisted(() => ({ data: null as StudioData | null, failSave: false, failSend: false, emailReady: true }))
vi.mock("@/app/admin/actions", () => ({ logoutAction: vi.fn() }))
vi.mock("@/components/studio/pdf-viewer", () => ({ PdfViewer: () => <section aria-label="PDF attachment preview" /> }))
vi.mock("@/lib/studio/browser-pdf", () => ({ browserInvoicePdf: vi.fn(async () => new TextEncoder().encode("%PDF-1.7\nTest attachment\n%%EOF")), pdfBase64: (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)) }))
vi.mock("@/app/admin/oz-studio/actions", () => ({
  loadWorkspace: vi.fn(async () => ({ ok: true, mode: "local", snapshot: { data: structuredClone(state.data), sha: "s0" }, email: { ready: state.emailReady, sender: "invoices@example.com" } })),
  saveInvoiceAction: vi.fn(async (input: InvoiceInput) => {
    if (state.failSave) return { ok: false, error: "The draft could not be saved." }
    saveInvoice(state.data!, input, "aaaabbbb-cccc-4000-8000-111122223333", "2026-10-28T10:00:00.000Z")
    return { ok: true, snapshot: { data: structuredClone(state.data), sha: "s1" } }
  }),
  sendInvoiceAction: vi.fn(async () => state.failSend ? { ok: false, error: "The provider rejected the email. Reload before retrying." } : { ok: true, snapshot: { data: structuredClone(state.data), sha: "s2" } }),
  checkEmailStatusAction: vi.fn(), archiveInvoicesAction: vi.fn(), restoreArchiveAction: vi.fn(), saveServicesAction: vi.fn(), changeInvoiceStatus: vi.fn(), issueInvoiceAction: vi.fn(), saveBusinessAction: vi.fn(),
}))
import { browserInvoicePdf } from "@/lib/studio/browser-pdf"
import { Workspace } from "@/components/studio/workspace"
import { saveInvoiceAction, sendInvoiceAction } from "@/app/admin/oz-studio/actions"

beforeEach(() => {
  vi.clearAllMocks()
  state.data = emptyStudio(); state.failSave = false; state.failSend = false; state.emailReady = true
  state.data.settings.paymentInstructions = "TEST PAYMENT DETAILS ONLY"
  localStorage.clear()
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: { configurable: true, value: function (this: HTMLDialogElement) { this.open = true } },
    close: { configurable: true, value: function (this: HTMLDialogElement) { this.open = false } },
  })
})
afterEach(() => { cleanup(); vi.restoreAllMocks() })

async function fillInvoice() {
  render(<Workspace />)
  fireEvent.click(await screen.findByRole("button", { name: "+ Create invoice" }))
  for (const [label, value] of [["Project / invoice title", "A real invoice flow"], ["Client name", "Preview Client"], ["Client email", "preview@example.com"], ["Description 1", "Development service"], ["Rate 1", "100.00"]]) fireEvent.change(screen.getByLabelText(label, { exact: true }), { target: { value } })
}

describe("save and continue to email", () => {
  it("saves successfully before opening email review, then waits for an explicit send", async () => {
    await fillInvoice()
    fireEvent.click(screen.getByRole("button", { name: "Save & continue →" }))
    await screen.findByLabelText("Email subject")
    expect(saveInvoiceAction).toHaveBeenCalledTimes(1)
    expect(sendInvoiceAction).not.toHaveBeenCalled()
    const send = screen.getByRole("button", { name: "Send OZ-0001 to client" }) as HTMLButtonElement
    expect(send.disabled).toBe(false)
    fireEvent.click(send)
    const dialog = await screen.findByRole("dialog", { name: "Send invoice OZ-0001?" })
    expect(dialog.textContent).toContain("preview@example.com")
    expect(dialog.textContent).toContain("OZ-0001.pdf")
    expect(sendInvoiceAction).not.toHaveBeenCalled()
    expect(browserInvoicePdf).not.toHaveBeenCalled()
    fireEvent.click(within(dialog).getByRole("button", { name: "Send invoice" }))
    await waitFor(() => expect(sendInvoiceAction).toHaveBeenCalledWith("aaaabbbb-cccc-4000-8000-111122223333", "s1", expect.any(String), expect.objectContaining({ subject: "OZ Studio — Invoice OZ-0001" })))
  })
  it("cancels the confirmation without generating a PDF or sending", async () => {
    await fillInvoice()
    fireEvent.click(screen.getByRole("button", { name: "Save & continue →" }))
    fireEvent.click(await screen.findByRole("button", { name: "Send OZ-0001 to client" }))
    const dialog = await screen.findByRole("dialog")
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }))
    expect(browserInvoicePdf).not.toHaveBeenCalled()
    expect(sendInvoiceAction).not.toHaveBeenCalled()
    await waitFor(() => expect((screen.getByRole("button", { name: "Send OZ-0001 to client" }) as HTMLButtonElement).disabled).toBe(false))
  })
  it("shows provider errors beside the Send button", async () => {
    state.failSend = true
    await fillInvoice()
    fireEvent.click(screen.getByRole("button", { name: "Save & continue →" }))
    fireEvent.click(await screen.findByRole("button", { name: "Send OZ-0001 to client" }))
    const dialog = await screen.findByRole("dialog")
    fireEvent.click(within(dialog).getByRole("button", { name: "Send invoice" }))
    const review = document.querySelector(".oz-review") as HTMLElement
    await within(review).findByRole("alert")
    expect(within(review).getByRole("alert").textContent).toContain("The provider rejected the email")
  })
  it("shows attachment failures beside Send without contacting the provider", async () => {
    vi.mocked(browserInvoicePdf).mockRejectedValueOnce(new Error("The invoice font could not be loaded."))
    await fillInvoice()
    fireEvent.click(screen.getByRole("button", { name: "Save & continue →" }))
    fireEvent.click(await screen.findByRole("button", { name: "Send OZ-0001 to client" }))
    const dialog = await screen.findByRole("dialog")
    fireEvent.click(within(dialog).getByRole("button", { name: "Send invoice" }))
    const review = document.querySelector(".oz-review") as HTMLElement
    expect((await within(review).findByRole("alert")).textContent).toContain("font could not be loaded")
    expect(sendInvoiceAction).not.toHaveBeenCalled()
  })
  it("explains missing email configuration instead of a silently disabled button", async () => {
    state.emailReady = false
    await fillInvoice()
    fireEvent.click(screen.getByRole("button", { name: "Save & continue →" }))
    fireEvent.click(await screen.findByRole("button", { name: "Send OZ-0001 to client" }))
    const review = document.querySelector(".oz-review") as HTMLElement
    expect((await within(review).findByRole("alert")).textContent).toContain("Connect a verified email sender")
    expect(sendInvoiceAction).not.toHaveBeenCalled()
  })
  it("can return to details and continue again without losing the email draft", async () => {
    await fillInvoice()
    fireEvent.click(screen.getByRole("button", { name: "Save & continue →" }))
    fireEvent.change(await screen.findByLabelText("Email subject"), { target: { value: "Keep this subject" } })
    fireEvent.change(screen.getByLabelText("Personal message (optional)"), { target: { value: "Keep this message" } })
    fireEvent.click(screen.getByRole("button", { name: "Details" }))
    fireEvent.change(screen.getByLabelText("Project / invoice title"), { target: { value: "Updated invoice title" } })
    fireEvent.click(screen.getByRole("button", { name: "Save & continue →" }))
    await waitFor(() => expect((screen.getByLabelText("Email subject") as HTMLInputElement).value).toBe("Keep this subject"))
    expect((screen.getByLabelText("Personal message (optional)") as HTMLTextAreaElement).value).toBe("Keep this message")
    expect(saveInvoiceAction).toHaveBeenCalledTimes(2)
    expect(sendInvoiceAction).not.toHaveBeenCalled()
  })
  it("keeps the form and typing intact if saving fails", async () => {
    state.failSave = true
    await fillInvoice()
    fireEvent.click(screen.getByRole("button", { name: "Save & continue →" }))
    await screen.findByText("The draft could not be saved.")
    expect(screen.queryByLabelText("Email subject")).toBeNull()
    expect((screen.getByLabelText("Project / invoice title") as HTMLInputElement).value).toBe("A real invoice flow")
    expect(sendInvoiceAction).not.toHaveBeenCalled()
  })
})
