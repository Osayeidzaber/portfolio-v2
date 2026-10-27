"use client"

import type { PaymentMethod } from "@/lib/studio/schema"

const presets = ["bKash", "Nagad", "Rocket", "Bank transfer", "Custom"]

export function PaymentMethods({ value, onChange }: { value: PaymentMethod[]; onChange: (methods: PaymentMethod[]) => void }) {
  function update(index: number, patch: Partial<PaymentMethod>) {
    onChange(value.map((method, position) => position === index ? { ...method, ...patch } : method))
  }
  return <fieldset className="oz-payment-methods">
    <legend>Payment methods</legend>
    <p className="oz-form-hint">Offer up to five ways to pay. Add your actual account details; clients will see these on their invoice and email.</p>
    <div className="oz-payment-presets">{presets.map((name) => <button key={name} type="button" className="oz-small-button" disabled={value.length >= 5} onClick={() => onChange([...value, { name: name === "Custom" ? "" : name, details: "" }])}>+ {name}</button>)}</div>
    {value.map((method, index) => <div className="oz-payment-card" key={index}>
      <div className="oz-payment-card-heading"><span className="oz-label">METHOD {String(index + 1).padStart(2, "0")}</span><button type="button" className="oz-small-button" aria-label={`Remove payment method ${index + 1}`} onClick={() => onChange(value.filter((_, position) => position !== index))}>Remove</button></div>
      <label>Method name<input aria-label={`Payment method ${index + 1} name`} required maxLength={60} value={method.name} onChange={(event) => update(index, { name: event.target.value })} placeholder="Payment method name" /></label>
      <label>Account & payment details<textarea aria-label={`Payment method ${index + 1} details`} required maxLength={400} value={method.details} onChange={(event) => update(index, { details: event.target.value })} placeholder={method.name === "Bank transfer" ? "Bank name, account holder, account number, branch and routing / SWIFT details" : "Account number, account holder and payment type (for example, Send Money or Merchant Payment)"} /></label>
    </div>)}
    <p className="oz-form-hint">Include the invoice number as the payment reference where supported. These details provide instructions; payments are recorded manually.</p>
  </fieldset>
}
