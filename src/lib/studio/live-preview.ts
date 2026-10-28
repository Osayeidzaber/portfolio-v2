import { invoiceTotals, toMinor, type Business, type Invoice, type Currency, type InvoiceStyling } from "./schema"
import type { InvoiceDesign } from "./designs"

export type LiveInvoiceFields = {
  title: string; number: string; design: InvoiceDesign; issueDate: string; dueDate: string; currency: Currency
  client: Invoice["client"]; items: Array<{ description: string; quantity: string; price: string }>
  discount: string; tax: string; notes: string; styling?: InvoiceStyling
}

/** A display-only draft can be incomplete. Saving and issuing still use the strict schema. */
export function liveInvoicePreview(fields: LiveInvoiceFields, business: Business, today: string) {
  let calculationsReady = true
  function amount(value: string) {
    try { return toMinor(value || "0") } catch { calculationsReady = false; return 0 }
  }
  const items = fields.items.map((item) => {
    const quantity = Number(item.quantity)
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10000) calculationsReady = false
    return { description: item.description, quantity: Number.isInteger(quantity) && quantity >= 1 && quantity <= 10000 ? quantity : 0, unitPrice: amount(item.price) }
  })
  const invoice: Invoice = {
    ...fields, items, discount: amount(fields.discount), taxBasisPoints: amount(fields.tax), business,
    id: "00000000-0000-4000-8000-000000000000", status: "draft", createdAt: `${today}T12:00:00.000Z`,
  }
  if (invoice.taxBasisPoints > 10000) calculationsReady = false
  try { invoiceTotals(invoice) } catch { calculationsReady = false }
  return { invoice, calculationsReady }
}
