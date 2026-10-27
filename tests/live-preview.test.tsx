import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { InvoicePreview } from "@/components/studio/invoice-preview"
import { InvoiceEmailStatus } from "@/components/studio/email-status"
import { liveInvoicePreview, type LiveInvoiceFields } from "@/lib/studio/live-preview"
import { emptyStudio, invoiceInputSchema, invoiceTotals } from "@/lib/studio/schema"

const fields: LiveInvoiceFields = { title: "", number: "OZ-0001", design: "noir", issueDate: "2026-10-28", dueDate: "2026-10-28", currency: "BDT", client: { name: "", company: "", email: "", address: "" }, items: [{ description: "", quantity: "1", price: "0.00" }], discount: "0", tax: "0", notes: "" }
const preview = (overrides: Partial<LiveInvoiceFields> = {}) => liveInvoicePreview({ ...fields, ...overrides }, emptyStudio().settings, "2026-10-28")

describe("live invoice editing", () => {
  it("renders incomplete drafts without relaxing save validation or inventing billing details", () => {
    const live = preview({ title: "First characters", client: { ...fields.client, email: "unfinished@" } })
    expect(live.calculationsReady).toBe(true)
    expect(live.invoice.client.name).toBe("")
    expect(live.invoice.client.email).toBe("unfinished@")
    expect(invoiceInputSchema.safeParse(live.invoice).success).toBe(false)
    const html = renderToStaticMarkup(<InvoicePreview {...live} live />)
    expect(html).toContain("First characters")
    expect(html).toContain("unfinished@")
    expect(html).toContain('data-design="noir"')
  })
  it("updates integer accounting while rates and lines are edited", () => {
    const live = preview({ items: [{ description: "Live service", quantity: "2", price: "1250.50" }], discount: "100", tax: "5" })
    expect(live.calculationsReady).toBe(true)
    expect(invoiceTotals(live.invoice).total).toBe(252105)
    const html = renderToStaticMarkup(<InvoicePreview {...live} live />)
    expect(html).toContain("2,521.05")
    expect(html).toContain("Live service")
  })
  it("suppresses misleading totals for invalid numbers and excessive discounts", () => {
    for (const overrides of [{ items: [{ description: "Test", quantity: "", price: "12" }] }, { tax: "101" }, { discount: "100" }, { items: [{ description: "Test", quantity: "1", price: "invalid" }] }]) {
      const live = preview(overrides)
      expect(live.calculationsReady).toBe(false)
      const html = renderToStaticMarkup(<InvoicePreview {...live} live />)
      expect(html).not.toContain("NaN")
      expect(html).not.toContain("0.00")
    }
  })
  it("accepts temporarily empty dates and zero-value inputs without throwing", () => {
    const live = preview({ issueDate: "", dueDate: "", discount: "", tax: "", items: [{ description: "", quantity: "1", price: "" }] })
    expect(live.calculationsReady).toBe(true)
    expect(() => renderToStaticMarkup(<InvoicePreview {...live} live />)).not.toThrow()
  })
  it("shows not-sent, unconfirmed and accepted receipts without claiming inbox delivery", () => {
    const { invoice } = preview()
    expect(renderToStaticMarkup(<InvoiceEmailStatus invoice={invoice} compact />)).toContain("Email not sent")
    invoice.emailAttempt = { key: "aaaabbbb-cccc-4000-8000-111122223333", startedAt: "2026-10-28T10:00:00.000Z" }
    expect(renderToStaticMarkup(<InvoiceEmailStatus invoice={invoice} compact />)).toContain("Email send unconfirmed")
    invoice.emailAttempt.acceptedAt = "2026-10-28T10:01:00.000Z"
    invoice.emailAttempt.providerId = "preview-provider-id"
    const receipt = renderToStaticMarkup(<InvoiceEmailStatus invoice={invoice} />)
    expect(receipt).toContain("Email accepted by Resend")
    expect(receipt).toContain("16:01")
    expect(receipt).toContain("preview-provider-id")
    expect(receipt).toContain("OZ-0001.pdf")
    expect(receipt).toContain("Check Resend for delivery or bounce status")
  })
})
