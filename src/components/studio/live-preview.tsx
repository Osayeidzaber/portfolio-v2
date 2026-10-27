"use client"

import { useState } from "react"
import { invoiceDesignName } from "@/lib/studio/designs"
import { invoiceTotals, money, type Invoice } from "@/lib/studio/schema"
import { InvoicePreview } from "./invoice-preview"

export function LivePreview({ invoice, calculationsReady, pdfReady, onOpenPdf }: { invoice: Invoice; calculationsReady: boolean; pdfReady: boolean; onOpenPdf: () => void }) {
  const [expanded, setExpanded] = useState(true)
  return <aside className="oz-live-preview" aria-label="Live preview panel" data-expanded={expanded}>
    <div className="oz-live-preview-header"><div><h2>Live preview</h2><p>{invoiceDesignName(invoice.design)} · Unsaved draft</p></div><button type="button" className="oz-small-button" aria-expanded={expanded} aria-controls="oz-live-preview-sheet" onClick={() => setExpanded(!expanded)}>{expanded ? "Hide" : "Show"}<span className="sr-only"> live invoice preview</span></button></div>
    <div className="oz-live-preview-total"><span>Draft total</span><strong aria-live="polite">{calculationsReady ? money(invoiceTotals(invoice).total, invoice.currency) : "—"}</strong></div>
    {!calculationsReady && <p className="oz-live-calculation-hint" role="status">Check quantities, rates, discount and tax to calculate the total.</p>}
    <div id="oz-live-preview-sheet" className="oz-live-sheet" hidden={!expanded}><InvoicePreview invoice={invoice} calculationsReady={calculationsReady} live /></div>
    <div className="oz-live-preview-footer"><p>Updates as you type. Open the PDF for its final layout and pagination.</p><button type="button" className="oz-small-button" disabled={!pdfReady} onClick={onOpenPdf}>Open PDF viewer ↗</button></div>
  </aside>
}
