import { invoiceTotals, type Currency, type Invoice } from "./schema"

export function recordedPaymentDate(invoice: Invoice): string | null {
  if (invoice.status !== "paid") return null
  if (invoice.payment?.date) return invoice.payment.date
  return invoice.paidAt ? new Date(invoice.paidAt).toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" }) : null
}

export function monthReport(invoices: Invoice[], month: string, currency: Currency) {
  const rows = invoices.filter((invoice) => invoice.currency === currency)
  const billed = rows.filter((invoice) => ["issued", "paid"].includes(invoice.status) && invoice.issueDate.startsWith(month))
  const received = rows.filter((invoice) => recordedPaymentDate(invoice)?.startsWith(month))
  const unpaid = billed.filter((invoice) => invoice.status === "issued")
  const sum = (list: Invoice[]) => list.reduce((total, invoice) => total + invoiceTotals(invoice).total, 0)
  return { billed: sum(billed), received: sum(received), unpaid: sum(unpaid), payments: received, unknownPaymentDates: rows.filter((invoice) => invoice.status === "paid" && !recordedPaymentDate(invoice)).length }
}

export function recentMonths(today: string) {
  const [year, month] = today.split("-").map(Number)
  return Array.from({ length: 6 }, (_, index) => new Date(Date.UTC(year, month - 6 + index, 1)).toISOString().slice(0, 7))
}
