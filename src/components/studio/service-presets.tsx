"use client"

import { useState, type FormEvent } from "react"
import { servicePresetSchema, toMinor, type ServicePreset } from "@/lib/studio/schema"

export function ServicePresets({ services, busy, onSave }: { services: ServicePreset[]; busy: boolean; onSave: (value: ServicePreset[]) => void }) {
  const [rows, setRows] = useState(services.map((service) => ({ ...service, price: (service.unitPrice / 100).toFixed(2) })))
  const [error, setError] = useState("")
  const update = (index: number, patch: Partial<(typeof rows)[number]>) => setRows(rows.map((row, position) => position === index ? { ...row, ...patch } : row))
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try { const value = rows.map((row) => servicePresetSchema.parse({ ...row, unitPrice: toMinor(row.price) })); setError(""); onSave(value) }
    catch { setError("Give each service a name, description, whole quantity and a valid rate.") }
  }
  return <form className="oz-form oz-panel oz-settings" onSubmit={submit}><h2>Saved services & rates</h2><p className="oz-form-hint">Shortcuts for new line items. Editing a preset never changes existing invoices.</p>
    {rows.map((row, index) => <fieldset key={index} className="oz-payment-card"><legend>Service {index + 1}</legend><label>Preset name<input required maxLength={80} value={row.name} onChange={(event) => update(index, { name: event.target.value })} /></label><label>Service description<input required maxLength={180} value={row.description} onChange={(event) => update(index, { description: event.target.value })} /></label><div className="oz-form-grid"><label>Preset currency<select value={row.currency} onChange={(event) => update(index, { currency: event.target.value as ServicePreset["currency"] })}>{["BDT", "USD", "CAD", "EUR", "GBP"].map((value) => <option key={value}>{value}</option>)}</select></label><label>Preset quantity<input type="number" min={1} max={10000} required value={row.quantity} onChange={(event) => update(index, { quantity: Number(event.target.value) })} /></label><label>Preset rate<input inputMode="decimal" required value={row.price} onChange={(event) => update(index, { price: event.target.value })} /></label></div><button type="button" className="oz-small-button" onClick={() => setRows(rows.filter((_, position) => position !== index))}>Remove saved service {index + 1}</button></fieldset>)}
    {error && <p role="alert">{error}</p>}<div className="oz-row-actions"><button type="button" className="oz-button" disabled={rows.length >= 40 || busy} onClick={() => setRows([...rows, { name: "", description: "", currency: "BDT", quantity: 1, unitPrice: 0, price: "0.00" }])}>+ Add saved service</button><button className="oz-button oz-button-light" disabled={busy}>Save service presets</button></div>
  </form>
}
