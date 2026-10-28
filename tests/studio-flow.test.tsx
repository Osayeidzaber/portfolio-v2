// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { emptyStudio, saveInvoice, type InvoiceInput, type StudioData } from "@/lib/studio/schema"

const state = vi.hoisted(() => ({ data: null as StudioData | null, failSave: false }))
vi.mock("@/app/admin/actions", () => ({ logoutAction: vi.fn() }))
vi.mock("@/components/studio/pdf-viewer", () => ({ PdfViewer: () => <section aria-label="PDF attachment preview" /> }))
vi.mock("@/lib/studio/browser-pdf", () => ({ browserInvoicePdf: vi.fn(async () => new TextEncoder().encode("%PDF-1.7\nTest attachment\n%%EOF")), pdfBase64: (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)) }))
vi.mock("@/app/admin/oz-studio/actions", () => ({
  loadWorkspace: vi.fn(async () => ({ ok: true, mode: "local", snapshot: { data: structuredClone(state.data), sha: "s0" }, email: { ready: true, sender: "invoices@example.com" } })),
  saveInvoiceAction: vi.fn(async (input: InvoiceInput) => {
    if (state.failSave) return { ok: false, error: "The draft could not be saved." }
    saveInvoice(state.data!, input, "aaaabbbb-cccc-4000-8000-111122223333", "2026-10-28T10:00:00.000Z")
    return { ok: true, snapshot: { data: structuredClone(state.data), sha: "s1" } }
  }),
  sendInvoiceAction: vi.fn(async () => ({ ok: true, snapshot: { data: structuredClone(state.data), sha: "s2" } })),
  checkEmailStatusAction: vi.fn(), archiveInvoicesAction: vi.fn(), restoreArchiveAction: vi.fn(), saveServicesAction: vi.fn(), changeInvoiceStatus: vi.fn(), issueInvoiceAction: vi.fn(), saveBusinessAction: vi.fn(),
}))
import { Workspace } from "@/components/studio/workspace"
import { saveInvoiceAction, sendInvoiceAction } from "@/app/admin/oz-studio/actions"

beforeEach(() => {
  vi.clearAllMocks()
  state.data = emptyStudio(); state.failSave = false
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
    expect(send.disabled).toBe(true)
    fireEvent.click(screen.getByRole("checkbox", { name: "I have checked the saved recipient, dates, payment instructions and amounts." }))
    expect(send.disabled).toBe(false)
    fireEvent.click(send)
    await waitFor(() => expect(sendInvoiceAction).toHaveBeenCalledWith("aaaabbbb-cccc-4000-8000-111122223333", "s1", expect.any(String), expect.objectContaining({ subject: "OZ Studio — Invoice OZ-0001" })))
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
