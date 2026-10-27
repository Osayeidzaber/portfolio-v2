import { invoiceTotals, type Currency, type Invoice, type InvoiceInput } from "./schema"

/** Keep currencies separate: no exchange-rate assumptions in the accounts. */
export function ledgerSummary(invoices: Invoice[], today: string, currency: Currency) {
  const rows = invoices.filter((invoice) => invoice.currency === currency)
  const issued = rows.filter((invoice) => invoice.status === "issued")
  const overdue = issued.filter((invoice) => invoice.dueDate < today)
  const paid = rows.filter((invoice) => invoice.status === "paid")
  const total = (list: Invoice[]) => list.reduce((sum, invoice) => sum + invoiceTotals(invoice).total, 0)
  return { outstanding: total(issued), overdue: total(overdue), paid: total(paid), overdueCount: overdue.length }
}

/** Reuse the work without carrying over identity, payment or email state. */
export function draftFromInvoice(invoice: Invoice, today: string): InvoiceInput {
  return { title: invoice.title, design: invoice.design ?? "signature", client: { ...invoice.client }, issueDate: today, dueDate: today, currency: invoice.currency, items: invoice.items.map((item) => ({ ...item })), discount: invoice.discount, taxBasisPoints: invoice.taxBasisPoints, notes: invoice.notes }
}

export function invoiceCsv(invoices: Invoice[]) {
  const cell = (value: string | number) => {
    const text = String(value)
    const safe = /^[\s]*[=+@-]|^[\t\r\n]/.test(text) ? `'${text}` : text
    return `"${safe.replaceAll('"', '""')}"`
  }
  const header = ["Invoice", "Client", "Project", "Status", "Invoice date", "Due date", "Currency", "Subtotal", "Discount", "Tax", "Total"]
  const rows = invoices.map((invoice) => {
    const totals = invoiceTotals(invoice)
    return [invoice.number, invoice.client.company || invoice.client.name, invoice.title, invoice.status, invoice.issueDate, invoice.dueDate, invoice.currency, ...[totals.subtotal, totals.discount, totals.tax, totals.total].map((amount) => (amount / 100).toFixed(2))]
  })
  return "\uFEFF" + [header, ...rows].map((row) => row.map(cell).join(",")).join("\r\n")
}
