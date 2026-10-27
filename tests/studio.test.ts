import { readFile } from "node:fs/promises"
import { afterEach, describe, expect, it, vi } from "vitest"
import { PDFDocument } from "pdf-lib"

import { businessSchema, paymentDetails, emptyStudio, invoiceInputSchema, invoiceSchema, invoiceTotals, saveInvoice, toMinor, type InvoiceInput } from "@/lib/studio/schema"
import { invoiceDesigns } from "@/lib/studio/designs"
import { invoiceEmail } from "@/lib/studio/invoice-document"
import { invoicePdf } from "@/lib/studio/pdf"
import { readStudio, writeStudio } from "@/lib/studio/store"

const loadFont = async (name: string) => new Uint8Array(await readFile(`public/oz-studio/fonts/${name}`))

const id = "aaaabbbb-cccc-4000-8000-111122223333"
const input: InvoiceInput = {
  client: { name: "Preview Client", company: "Example Company", email: "client@example.com", address: "Example billing address" },
  title: "Website services", issueDate: "2026-10-27", dueDate: "2026-11-10", currency: "BDT",
  items: [{ description: "Design & development", quantity: 2, unitPrice: 10005 }], discount: 1010, taxBasisPoints: 500, notes: "Preview document only.",
}
const fixture = () => { const data = emptyStudio(); data.settings.paymentInstructions = "Payment instructions supplied by the studio."; return { data, invoice: saveInvoice(data, input, id, "2026-10-27T12:00:00.000Z") } }
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })

describe("invoice accounting and snapshots", () => {
  it("validates payment methods, preserves legacy instructions and snapshots account details", () => {
    const { data, invoice } = fixture()
    expect(businessSchema.parse(data.settings).paymentMethods).toBeUndefined()
    data.settings.paymentInstructions = "Use your invoice number as the reference."
    data.settings.paymentMethods = [{ name: "bKash", details: "TEST ACCOUNT ONLY\nMerchant Payment" }, { name: "Bank transfer", details: "Preview bank details" }]
    const draft = saveInvoice(data, { ...input, id }, id, invoice.createdAt)
    expect(paymentDetails(draft.business)).toBe("bKash: TEST ACCOUNT ONLY\nMerchant Payment\nBank transfer: Preview bank details\nUse your invoice number as the reference.")
    data.settings.paymentMethods[0].details = "Changed account"
    expect(draft.business.paymentMethods![0].details).toContain("TEST ACCOUNT ONLY")
    const email = invoiceEmail(draft, "invoices@example.com", "https://example.com/logo.png")
    expect(email.text).toContain(paymentDetails(draft.business))
    expect(email.html).toContain("Merchant Payment")
    expect(businessSchema.safeParse({ ...data.settings, paymentMethods: [{ name: "bKash", details: "  " }] }).success).toBe(false)
    expect(businessSchema.safeParse({ ...data.settings, paymentMethods: Array(6).fill({ name: "bKash", details: "Preview" }) }).success).toBe(false)
  })
  it("calculates integer totals with discount before tax", () => {
    expect(invoiceTotals(input)).toEqual({ subtotal: 20010, discount: 1010, tax: 950, total: 19950 })
    expect(toMinor("0.29")).toBe(29)
    expect(toMinor("1200.5")).toBe(120050)
    expect(() => toMinor("0.001")).toThrow()
    expect(() => toMinor("-5")).toThrow()
    expect(() => invoiceTotals({ ...input, discount: 20011 })).toThrow("Discount")
  })
  it("rejects invalid dates, negative rates and missing billing details", () => {
    expect(invoiceInputSchema.safeParse({ ...input, dueDate: "2026-10-01" }).success).toBe(false)
    expect(invoiceInputSchema.safeParse({ ...input, issueDate: "2026-02-30" }).success).toBe(false)
    expect(invoiceInputSchema.safeParse({ ...input, client: { ...input.client, email: "invalid" } }).success).toBe(false)
    expect(invoiceInputSchema.safeParse({ ...input, items: [{ description: "Service", quantity: 1, unitPrice: -1 }] }).success).toBe(false)
  })
  it("assigns unique numbers and supports a custom invoice number", () => {
    const { data, invoice } = fixture()
    expect(invoice.number).toBe("OZ-0001")
    expect(data.nextInvoice).toBe(2)
    const updated = saveInvoice(data, { ...input, id, number: "OZ/2026-001" }, "ignored", "2026-11-01T12:00:00.000Z")
    expect(updated.number).toBe("OZ/2026-001")
    expect(data.nextInvoice).toBe(2)
    expect(() => saveInvoice(data, { ...input, number: "oz/2026-001" }, "eeeeffff-cccc-4000-8000-111122223333", "2026-11-01T12:00:00.000Z")).toThrow("already in use")
  })
  it("locks issued invoices and snapshots business and billing details", () => {
    const { data, invoice } = fixture()
    data.settings.name = "Changed business"
    expect(invoice.business.name).toBe("OZ Studio")
    invoice.status = "issued"
    expect(() => saveInvoice(data, { ...input, id, title: "Changed" }, id, invoice.createdAt)).toThrow("locked")
    expect(() => saveInvoice(data, { ...input, id: "eeeeffff-cccc-4000-8000-111122223333" }, id, invoice.createdAt)).toThrow("not found")
  })
})

describe("private storage boundaries", () => {
  it("refuses to read or write client data in a public repository", async () => {
    vi.stubEnv("STUDIO_DATA_REPO", "owner/public-site")
    vi.stubEnv("STUDIO_GITHUB_TOKEN", "test-token")
    const fetch = vi.fn().mockImplementation(async () => new Response(JSON.stringify({ private: false, default_branch: "main" })))
    vi.stubGlobal("fetch", fetch)
    await expect(readStudio()).rejects.toThrow("public repository")
    await expect(writeStudio(emptyStudio(), null)).rejects.toThrow("public repository")
    expect(fetch.mock.calls.every((call) => !call[1].method)).toBe(true)
  })
  it("passes the last-seen SHA and rejects conflicts", async () => {
    vi.stubEnv("STUDIO_DATA_REPO", "owner/private-studio")
    vi.stubEnv("STUDIO_GITHUB_TOKEN", "test-token")
    const fetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ private: true, default_branch: "main" })))
      .mockResolvedValueOnce(new Response("{}", { status: 409 }))
    vi.stubGlobal("fetch", fetch)
    await expect(writeStudio(emptyStudio(), "last-seen-sha")).rejects.toThrow("changed since")
    expect(JSON.parse(fetch.mock.calls[1][1].body).sha).toBe("last-seen-sha")
  })
  it("does not silently turn an API failure into an empty ledger", async () => {
    vi.stubEnv("STUDIO_DATA_REPO", "owner/private-studio")
    vi.stubEnv("STUDIO_GITHUB_TOKEN", "test-token")
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 403 })))
    await expect(readStudio()).rejects.toThrow("403")
  })
})

describe("invoice documents", () => {
  it("defaults new invoices to Noir and persists a draft's selected layout", () => {
    const { data, invoice } = fixture()
    expect(invoice.design).toBe("noir")
    const changed = saveInvoice(data, { ...input, id, design: "outline" }, id, invoice.createdAt)
    expect(changed.design).toBe("outline")
    expect(invoiceInputSchema.safeParse({ ...input, design: "unknown" }).success).toBe(false)
  })
  it("leaves old records on the original layout and locks issued design choices", () => {
    const { data, invoice } = fixture()
    const legacy = { ...invoice }; delete legacy.design
    expect(invoiceSchema.parse(legacy).design).toBeUndefined()
    invoice.status = "issued"
    expect(() => saveInvoice(data, { ...input, id, design: "ledger" }, id, invoice.createdAt)).toThrow("locked")
    expect(invoice.design).toBe("noir")
  })
  it.each(invoiceDesigns)("renders the $name layout as a valid PDF", async ({ id: design, name }) => {
    const { invoice } = fixture()
    const document = await PDFDocument.load(await invoicePdf({ ...invoice, design }, loadFont))
    expect(document.getTitle()).toContain("OZ-0001")
    expect(document.getPageCount()).toBeGreaterThan(0)
    if (design !== "signature") expect(document.getSubject()).toBe(`OZ Studio / ${name}`)
  })
  it("escapes client-controlled HTML in the branded email", () => {
    const { invoice } = fixture()
    invoice.client.name = '<img src=x onerror="alert(1)">'
    invoice.notes = "<script>test</script>"
    const email = invoiceEmail(invoice, "invoices@example.com", "https://example.com/logo.svg")
    expect(email.html).toContain("&lt;img")
    expect(email.html).not.toContain("<script>")
    expect(email.to).toEqual(["client@example.com"])
    expect(email.text).toContain("BDT")
  })
  it("creates a branded PDF with embedded fonts and pagination", async () => {
    const { invoice } = fixture()
    invoice.client.name = "Preview Client / জাবের"
    invoice.items = Array.from({ length: 20 }, (_, i) => ({ description: `Service ${i + 1}: a detailed project deliverable`, quantity: 1, unitPrice: 10000 }))
    const bytes = await invoicePdf(invoice, loadFont)
    const document = await PDFDocument.load(bytes)
    expect(document.getTitle()).toContain("OZ-0001")
    expect(document.getPageCount()).toBeGreaterThan(1)
    expect(bytes.length).toBeGreaterThan(5000)
  })
})
