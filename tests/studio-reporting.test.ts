import { describe, expect, it } from "vitest"
import { emptyStudio, saveInvoice, type Invoice } from "@/lib/studio/schema"
import { monthReport, recentMonths, recordedPaymentDate } from "@/lib/studio/reporting"
import { invoiceEmail } from "@/lib/studio/invoice-document"

function invoice(): Invoice {
  return saveInvoice(emptyStudio(), { title: "Preview work", issueDate: "2026-09-20", dueDate: "2026-10-20", currency: "BDT", client: { name: "Preview Client", company: "", email: "preview@example.com", address: "" }, items: [{ description: "Design", quantity: 2, unitPrice: 12345 }], discount: 0, taxBasisPoints: 0, notes: "" }, "aaaabbbb-cccc-4000-8000-111122223333", "2026-09-20T10:00:00.000Z")
}

describe("monthly payment reporting", () => {
  it("reports by payment date while keeping currencies and invoice periods separate", () => {
    const paid = invoice(); paid.status = "paid"; paid.payment = { date: "2026-10-02", method: "bKash", reference: "TEST" }
    const unpaid = { ...invoice(), id: "bbbbbbbb-cccc-4000-8000-111122223333", status: "issued" as const, issueDate: "2026-10-01" }
    const foreign = { ...paid, currency: "USD" as const }
    const draft = { ...unpaid, status: "draft" as const }
    const report = monthReport([paid, unpaid, foreign, draft], "2026-10", "BDT")
    expect(report.received).toBe(24690)
    expect(report.billed).toBe(24690)
    expect(report.unpaid).toBe(24690)
    expect(report.payments).toEqual([paid])
    expect(monthReport([paid], "2026-09", "BDT").received).toBe(0)
  })
  it("uses Dhaka dates for legacy payment timestamps and excludes unknown dates", () => {
    const paid = invoice(); paid.status = "paid"; paid.paidAt = "2026-09-30T22:00:00.000Z"
    expect(recordedPaymentDate(paid)).toBe("2026-10-01")
    expect(monthReport([paid], "2026-10", "BDT").received).toBe(24690)
    delete paid.paidAt
    expect(monthReport([paid], "2026-10", "BDT").unknownPaymentDates).toBe(1)
    expect(recentMonths("2026-02-01")).toEqual(["2025-09", "2025-10", "2025-11", "2025-12", "2026-01", "2026-02"])
  })
})

describe("invoice presentation and history", () => {
  it("records actual draft saves and preserves styling when updating", () => {
    const data = emptyStudio()
    data.settings.defaultDesign = "outline"
    const base = invoice()
    const saved = saveInvoice(data, { ...base, id: undefined, design: undefined, styling: { showRates: false, footer: "Preview footer / জাবের" } }, base.id, base.createdAt)
    expect(saved.design).toBe("outline")
    expect(saved.activity).toEqual([{ type: "draft_saved", at: base.createdAt }])
    const updated = saveInvoice(data, { ...saved, styling: undefined }, base.id, "2026-10-01T12:00:00.000Z")
    expect(updated.styling?.showRates).toBe(false)
    expect(updated.activity).toHaveLength(2)
    expect(updated.createdAt).toBe(base.createdAt)
    updated.status = "issued"
    expect(() => saveInvoice(data, updated, base.id, base.createdAt)).toThrow("locked")
  })
  it("hides unit rates and supports dark emails without altering client text", () => {
    const saved = invoice(); saved.styling = { showRates: false, footer: "" }
    const message = invoiceEmail(saved, "invoices@example.com", "/logo.png", { subject: "Preview", message: "Literal background:#fff <script>test</script>", theme: "dark" })
    expect(message.html).toContain("background:#000")
    expect(message.html).toContain("color:#f2f2f2")
    expect(message.html).toContain("Literal background:#fff &lt;script&gt;")
    expect(message.html).not.toContain("2 ×")
    expect(message.text).not.toContain("2 ×")
    expect(message.text).toMatch(/BDT\s246\.90/)
  })
})
