"use client"

import { useState } from "react"
import { ledgerSummary } from "@/lib/studio/ledger"
import { money, type Currency, type Invoice } from "@/lib/studio/schema"

export function FinanceSummary({ invoices, today, defaultCurrency }: { invoices: Invoice[]; today: string; defaultCurrency: Currency }) {
  const [currency, setCurrency] = useState(defaultCurrency)
  const currencies = [...new Set([defaultCurrency, ...invoices.map((invoice) => invoice.currency)])]
  const summary = ledgerSummary(invoices, today, currency)
  return <section className="oz-finance" aria-labelledby="oz-finance-title">
    <div className="oz-finance-heading"><div><p className="oz-label">ACCOUNTS / AT A GLANCE</p><h2 id="oz-finance-title">Know where things stand.</h2></div><label>Reporting currency<select aria-label="Reporting currency" value={currency} onChange={(event) => setCurrency(event.target.value as Currency)}>{currencies.map((value) => <option key={value}>{value}</option>)}</select></label></div>
    <div className="oz-finance-values"><div><span>Outstanding</span><strong>{money(summary.outstanding, currency)}</strong><p>Issued, awaiting full payment.</p></div><div><span>Overdue</span><strong>{money(summary.overdue, currency)}</strong><p>{summary.overdueCount} {summary.overdueCount === 1 ? "invoice past its due date" : "invoices past their due dates"}.</p></div><div><span>Paid</span><strong>{money(summary.paid, currency)}</strong><p>Full payment recorded. All time.</p></div></div>
    <p className="oz-form-hint">Amounts in {currency} only. Drafts and void invoices are excluded.</p>
  </section>
}
