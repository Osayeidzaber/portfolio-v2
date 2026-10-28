"use client"

import { useState } from "react"
import { monthReport, recentMonths, recordedPaymentDate } from "@/lib/studio/reporting"
import { displayDate, invoiceTotals, money, type Currency, type Invoice } from "@/lib/studio/schema"
import { invoiceCsv } from "@/lib/studio/ledger"

export function Reports({ invoices, today, defaultCurrency, onOpen }: { invoices: Invoice[]; today: string; defaultCurrency: Currency; onOpen: (id: string) => void }) {
  const [month, setMonth] = useState(today.slice(0, 7))
  const [currency, setCurrency] = useState<Currency>(defaultCurrency)
  const report = monthReport(invoices, month, currency)
  const chart = recentMonths(`${month}-01`).map((month) => ({ month, amount: monthReport(invoices, month, currency).received }))
  const maximum = Math.max(1, ...chart.map((row) => row.amount))
  function exportPayments() {
    const url = URL.createObjectURL(new Blob([invoiceCsv(report.payments)], { type: "text/csv;charset=utf-8" }))
    const link = document.createElement("a"); link.href = url; link.download = `oz-payments-${month}-${currency}.csv`; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return <div className="oz-reports"><div className="oz-report-toolbar oz-panel"><label>Report month<input aria-label="Report month" type="month" required value={month} onChange={(event) => { if (/^\d{4}-\d{2}$/.test(event.target.value)) setMonth(event.target.value) }} /></label><label>Report currency<select aria-label="Report currency" value={currency} onChange={(event) => setCurrency(event.target.value as Currency)}>{[...new Set([defaultCurrency, ...invoices.map((invoice) => invoice.currency)])].map((value) => <option key={value}>{value}</option>)}</select></label><button className="oz-button" disabled={!report.payments.length} onClick={exportPayments}>Export payments CSV</button></div>
    <div className="oz-report-values">{[{ label: "Invoiced", amount: report.billed, note: "Issued or paid invoices dated this month." }, { label: "Payment recorded", amount: report.received, note: "Full payments dated this month." }, { label: "Currently unpaid", amount: report.unpaid, note: "Invoices from this month that are still issued." }].map((value) => <section className="oz-panel" key={value.label}><p className="oz-label">{value.label}</p><strong>{money(value.amount, currency)}</strong><p className="oz-form-hint">{value.note}</p></section>)}</div>
    <section className="oz-panel"><div className="oz-section-title"><div><p className="oz-label">SIX MONTHS THROUGH {month} / RECORDED PAYMENTS</p><h2>A clearer view of the work.</h2></div><span className="oz-badge">{currency}</span></div><div className="oz-payment-chart" role="img" aria-label={`Payments in ${currency} over six months ending ${month}. Exact amounts follow below.`}>{chart.map((row) => <div key={row.month}><span className="oz-chart-track"><span style={{ height: `${row.amount / maximum * 100}%` }} /></span><span>{row.month.slice(5)}</span></div>)}</div><dl className="oz-chart-values">{chart.map((row) => <div key={row.month}><dt>{row.month}</dt><dd>{money(row.amount, currency)}</dd></div>)}</dl></section>
    <section className="oz-panel"><div className="oz-section-title"><h2>Payment history · {month}</h2><span className="oz-badge">{report.payments.length} records</span></div>{report.payments.length ? report.payments.map((invoice) => <div className="oz-row" key={invoice.id}><div><strong>{invoice.number} · {invoice.client.company || invoice.client.name}</strong><p>{displayDate(recordedPaymentDate(invoice)!)} · {invoice.payment?.method || "Method not recorded"}</p>{invoice.payment?.reference && <p>Reference: {invoice.payment.reference}</p>}</div><div className="oz-row-actions"><strong>{money(invoiceTotals(invoice).total, currency)}</strong><button className="oz-small-button" onClick={() => onOpen(invoice.id)}>Open invoice ↗</button></div></div>) : <div className="oz-empty"><strong>No payments recorded for this month.</strong><p>Record full payment on an issued invoice to include it here.</p></div>}<p className="oz-form-hint">Currencies remain separate. Archived records are excluded. Older entries use the date full payment was recorded when a payment date is unavailable.{report.unknownPaymentDates > 0 && ` ${report.unknownPaymentDates} older paid records have no payment date and are excluded from monthly totals.`} This is a view of the current ledger, not a historical balance snapshot.</p></section>
  </div>
}
