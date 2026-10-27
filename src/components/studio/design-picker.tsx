"use client"

import { invoiceDesigns, type InvoiceDesign } from "@/lib/studio/designs"

export function DesignPicker({ value, onChange }: { value: InvoiceDesign; onChange: (design: InvoiceDesign) => void }) {
  return <fieldset className="oz-design-picker">
    <legend>Choose your invoice design</legend>
    <p className="oz-form-hint">Four dark layouts and three paper layouts. Every design uses the portfolio’s Black Press typography.</p>
    <div className="oz-design-grid">{invoiceDesigns.map((design) => <button type="button" key={design.id} aria-pressed={value === design.id} aria-label={`${design.name} invoice design`} onClick={() => onChange(design.id)} className="oz-design-card">
      <span className={`oz-design-mini oz-design-mini-${design.id}`} aria-hidden><span className="oz-mini-brand">OZ / STUDIO</span><span className="oz-mini-title">{design.id === "monolith" ? "INVOICE" : "Invoice."}</span><span className="oz-mini-rule" /><span className="oz-mini-lines"><i /><i /><i /></span><span className="oz-mini-total" /></span>
      <span className="oz-design-card-heading"><strong>{design.name}</strong><span aria-hidden>{value === design.id ? "✓" : "↗"}</span></span><span className="oz-label">{design.mood}</span><span className="oz-design-description">{design.description}</span>
    </button>)}</div>
  </fieldset>
}
