import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { emptyStudio, saveInvoice, type StudioData } from "@/lib/studio/schema"

const state = vi.hoisted(() => ({ authenticated: true, data: null as StudioData | null, sha: "s0", writes: 0 }))
vi.mock("@/lib/auth/session", () => ({ isAuthenticated: vi.fn(async () => state.authenticated) }))
vi.mock("@/lib/studio/store", () => ({
  StudioConflict: class extends Error {}, studioStorageMode: () => "local",
  readStudio: vi.fn(async () => ({ data: structuredClone(state.data), sha: state.sha })),
  writeStudio: vi.fn(async (data: StudioData, sha: string) => {
    if (sha !== state.sha) throw new Error("Conflict")
    state.data = structuredClone(data); state.writes++; state.sha = `s${state.writes}`
    return { data: structuredClone(data), sha: state.sha }
  }),
}))

import { checkEmailStatusAction, archiveInvoicesAction, restoreArchiveAction, saveServicesAction, changeInvoiceStatus, issueInvoiceAction, loadWorkspace, saveBusinessAction, saveInvoiceAction, sendInvoiceAction } from "@/app/admin/oz-studio/actions"
import { readStudio } from "@/lib/studio/store"

const attachment = Buffer.from("%PDF-1.7\nBrowser-generated test attachment\n%%EOF").toString("base64")
const id = "aaaabbbb-cccc-4000-8000-111122223333"
beforeEach(() => {
  vi.clearAllMocks()
  state.authenticated = true; state.sha = "s0"; state.writes = 0
  state.data = emptyStudio()
  state.data.settings.paymentInstructions = "Use the payment instructions agreed with the studio."
  saveInvoice(state.data, { title: "Preview invoice", client: { name: "Preview client", company: "", email: "client@example.com", address: "" }, issueDate: "2026-10-27", dueDate: "2026-11-10", currency: "BDT", items: [{ description: "Service", quantity: 1, unitPrice: 10000 }], discount: 0, taxBasisPoints: 0, notes: "" }, id, "2026-10-27T12:00:00.000Z")
  vi.stubEnv("RESEND_API_KEY", "test-resend-key")
  vi.stubEnv("STUDIO_EMAIL_FROM", "invoices@example.com")
})
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

describe("studio server actions", () => {
  it("records payment date, method and reference only on an issued invoice", async () => {
    state.data!.invoices[0].status = "issued"
    const payment = { date: "2026-10-27", method: "bKash", reference: "TEST-REFERENCE" }
    expect((await changeInvoiceStatus(id, "paid", "s0", { ...payment, date: "2099-01-01" })).ok).toBe(false)
    expect(state.writes).toBe(0)
    expect((await changeInvoiceStatus(id, "paid", "s0", payment)).ok).toBe(true)
    expect(state.data!.invoices[0].payment).toEqual(payment)
    expect((await changeInvoiceStatus(id, "paid", state.sha, payment)).ok).toBe(false)
  })
  it("validates service presets and archives before writing", async () => {
    expect((await saveServicesAction([{ name: "Invalid", description: "Service", quantity: 0, unitPrice: -1, currency: "BDT" }], "s0")).ok).toBe(false)
    expect((await archiveInvoicesAction([id], "s0")).ok).toBe(false)
    expect((await restoreArchiveAction({ kind: "bad" }, "s0")).ok).toBe(false)
    expect(state.writes).toBe(0)
    expect((await saveServicesAction([{ name: "Preview service", description: "Service", quantity: 1, unitPrice: 10000, currency: "BDT" }], "s0")).ok).toBe(true)
    expect(state.data!.services![0].unitPrice).toBe(10000)
  })
  it("checks delivery only when requested and keeps provider errors out of the saved state", async () => {
    state.data!.invoices[0].status = "issued"
    state.data!.invoices[0].emailAttempt = { key: id, startedAt: "2026-10-27T10:00:00.000Z", acceptedAt: "2026-10-27T10:01:00.000Z", providerId: "message-test" }
    const fetch = vi.fn().mockResolvedValueOnce(new Response("{}", { status: 403 })).mockResolvedValueOnce(new Response(JSON.stringify({ id: "message-test", last_event: "delivered" })))
    vi.stubGlobal("fetch", fetch)
    expect((await checkEmailStatusAction(id, "s0")).ok).toBe(false)
    expect(state.writes).toBe(0)
    expect((await checkEmailStatusAction(id, "s0")).ok).toBe(true)
    expect(state.data!.invoices[0].emailAttempt!.delivery!.event).toBe("delivered")
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(fetch.mock.calls[1][1].method).toBeUndefined()
  })

  it("guards every read, write, preview and send before accessing private data", async () => {
    state.authenticated = false
    const results = await Promise.all([loadWorkspace(), saveInvoiceAction({}, "s0"), saveBusinessAction({}, "s0"), changeInvoiceStatus(id, "paid", "s0"), issueInvoiceAction(id, "s0"), sendInvoiceAction(id, "s0", attachment), saveServicesAction([], "s0"), archiveInvoicesAction([id], "s0"), restoreArchiveAction({}, "s0"), checkEmailStatusAction(id, "s0")])
    expect(results.every((result) => !result.ok)).toBe(true)
    expect(readStudio).not.toHaveBeenCalled()
    expect(state.writes).toBe(0)
  })
  it("rejects runtime status values that could unlock an issued invoice", async () => {
    state.data!.invoices[0].status = "issued"
    const result = await changeInvoiceStatus(id, "draft" as "paid", "s0")
    expect(result.ok).toBe(false)
    expect(state.data!.invoices[0].status).toBe("issued")
    expect(state.writes).toBe(0)
  })
  it("never sends a message as part of saving a draft", async () => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch)
    const result = await saveInvoiceAction({ ...state.data!.invoices[0], id }, "s0")
    expect(result.ok).toBe(true)
    expect(fetch).not.toHaveBeenCalled()
  })
  it("sends the issued PDF once, records acceptance and does not resend accepted invoices", async () => {
    state.data!.invoices[0].design = "outline"
    state.data!.invoices[0].business.paymentInstructions = ""
    state.data!.invoices[0].business.paymentMethods = [{ name: "bKash", details: "TEST ACCOUNT ONLY" }]
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "message-test" })))
    vi.stubGlobal("fetch", fetch)
    const result = await sendInvoiceAction(id, "s0", attachment, { subject: "Your custom invoice", message: "Thanks <script>preview only</script>" })
    expect(result.ok).toBe(true)
    expect(state.data!.invoices[0].status).toBe("issued")
    expect(state.data!.invoices[0].emailAttempt?.providerId).toBe("message-test")
    expect(state.data!.invoices[0].emailAttempt?.payload).toBeUndefined()
    const body = JSON.parse(fetch.mock.calls[0][1].body)
    expect(body.attachments[0].filename).toBe("OZ-0001.pdf")
    expect(body.attachments).toHaveLength(1)
    expect(body.subject).toBe("Your custom invoice")
    expect(body.html).toContain("Thanks &lt;script&gt;preview only&lt;/script&gt;")
    expect(body.html).not.toContain("<script>")
    expect(state.data!.invoices[0].emailAttempt!.subject).toBe("Your custom invoice")
    expect(Buffer.from(body.attachments[0].content, "base64").toString()).toBe(Buffer.from(attachment, "base64").toString())
    expect(state.data!.invoices[0].emailAttempt?.acceptedAt).toBeTruthy()
    expect(body.from).toBe("OZ Studio <invoices@example.com>")
    await sendInvoiceAction(id, state.sha)
    expect(fetch).toHaveBeenCalledTimes(1)
  })
  it("rejects missing or malformed attachments before claiming or sending", async () => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch)
    for (const pdf of [undefined, "not-base64", Buffer.from("%PDF-truncated").toString("base64"), Buffer.from("not a PDF %%EOF").toString("base64")]) {
      const result = await sendInvoiceAction(id, "s0", pdf)
      expect(result.ok).toBe(false)
    }
    expect(state.writes).toBe(0)
    expect(fetch).not.toHaveBeenCalled()
  })
  it("retains the exact request and idempotency key when provider submission fails", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response("{}", { status: 503 })).mockResolvedValueOnce(new Response(JSON.stringify({ id: "retry-message" })))
    vi.stubGlobal("fetch", fetch)
    const first = await sendInvoiceAction(id, "s0", attachment)
    expect(first.ok).toBe(false)
    expect(state.data!.invoices[0].emailAttempt?.acceptedAt).toBeUndefined()
    const second = await sendInvoiceAction(id, state.sha)
    expect(second.ok).toBe(true)
    expect(fetch.mock.calls[0][1].body).toBe(fetch.mock.calls[1][1].body)
    expect(fetch.mock.calls[0][1].headers["Idempotency-Key"]).toBe(fetch.mock.calls[1][1].headers["Idempotency-Key"])
  })
  it("stops old pending requests before the provider expires its deduplication window", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 503 })))
    await sendInvoiceAction(id, "s0", attachment)
    state.data!.invoices[0].emailAttempt!.startedAt = "2020-01-01T00:00:00.000Z"
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch)
    const result = await sendInvoiceAction(id, state.sha)
    expect(result.ok).toBe(false)
    expect(fetch).not.toHaveBeenCalled()
  })
})
