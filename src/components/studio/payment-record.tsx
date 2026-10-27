"use client"

import { useState, type FormEvent } from "react"
import { displayDate, type Invoice, type PaymentRecord } from "@/lib/studio/schema"

export function PaymentRecordForm({ invoice, today, busy, onSave }: { invoice: Invoice; today: string; busy: boolean; onSave: (payment: PaymentRecord) => void }) {
  const [open, setOpen] = useState(false)
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    if (window.confirm("Record full payment and close this invoice? Check the date, method and transaction reference first.")) onSave({ date: String(form.get("date")), method: String(form.get("method")), reference: String(form.get("reference")) })
  }
  return <div className="oz-payment-record">{!open ? <button type="button" className="oz-button" disabled={busy} onClick={() => setOpen(true)}>Record full payment</button> : <form className="oz-form" onSubmit={submit}><h3>Record payment received</h3><p className="oz-form-hint">For invoice {invoice.number}, issued {displayDate(invoice.issueDate)}. This records a payment you have already received.</p><div className="oz-form-grid"><label>Payment date<input type="date" name="date" required min={invoice.issueDate} max={today} defaultValue={today} /></label><label>Payment method<input name="method" list="oz-received-payment-methods" required maxLength={80} placeholder="bKash, bank transfer…" /><datalist id="oz-received-payment-methods">{[...new Set([...(invoice.business.paymentMethods ?? []).map((method) => method.name), "bKash", "Nagad", "Rocket", "Bank transfer", "Cash"])].map((name) => <option key={name} value={name} />)}</datalist></label></div><label>Transaction reference (optional)<input name="reference" maxLength={160} /></label><div className="oz-row-actions"><button className="oz-button oz-button-light" disabled={busy}>Confirm full payment</button><button type="button" className="oz-small-button" disabled={busy} onClick={() => setOpen(false)}>Cancel payment entry</button></div></form>}</div>
}
