import { paymentDetails, displayDate, invoiceTotals, money, type Invoice } from "@/lib/studio/schema"

export function InvoicePreview({ invoice, live = false, calculationsReady = true }: { invoice: Invoice; live?: boolean; calculationsReady?: boolean }) {
  const totals = calculationsReady ? invoiceTotals(invoice) : { subtotal: 0, discount: 0, tax: 0, total: 0 }
  const format = (amount: number) => calculationsReady ? money(amount, invoice.currency) : "—"
  return <article className={`oz-invoice-paper${live ? " oz-live-paper" : ""}`} data-design={invoice.design || "signature"} aria-label={live ? "Live invoice preview" : "Invoice preview"}>
    <div className="oz-paper-header"><div><div className="oz-paper-brand">OZ STUDIO</div><p>{invoice.status === "draft" ? "DRAFT / NOT YET ISSUED" : invoice.status === "paid" ? "PAID / THANK YOU" : invoice.status === "void" ? "VOID / DO NOT PAY" : "INVOICE"}</p></div><div><strong>{invoice.number}</strong><p>{invoice.currency} / SERVICES</p></div></div>
    {live && <div className="oz-live-document-title" aria-hidden>{invoice.design === "monolith" ? "INVOICE" : "Invoice."}</div>}
    <h2>{invoice.title || <span className="oz-preview-placeholder">Your project title</span>}</h2><p className="oz-paper-meta">Issued {invoice.issueDate ? displayDate(invoice.issueDate) : "—"} · Due {invoice.dueDate ? displayDate(invoice.dueDate) : "—"}</p>
    <div className="oz-paper-parties"><div><h3>From</h3><p><strong>{invoice.business.name}</strong><br />{invoice.business.email}{invoice.business.address && <><br />{invoice.business.address}</>}</p></div><div><h3>Bill to</h3><p><strong>{invoice.client.name || <span className="oz-preview-placeholder">Client name</span>}</strong>{invoice.client.company && <><br />{invoice.client.company}</>}<br />{invoice.client.email || <span className="oz-preview-placeholder">Client email</span>}{invoice.client.address && <><br />{invoice.client.address}</>}</p></div></div>
    <table className="oz-paper-table"><caption className="sr-only">Invoice services and amounts</caption><thead><tr><th scope="col">Description</th><th scope="col">Qty</th><th scope="col">Rate</th><th scope="col">Amount</th></tr></thead><tbody>{invoice.items.map((item, index) => <tr key={index}><td>{item.description || <span className="oz-preview-placeholder">Service description</span>}</td><td>{item.quantity || "—"}</td><td>{format(item.unitPrice)}</td><td>{format(item.quantity * item.unitPrice)}</td></tr>)}</tbody></table>
    <div className="oz-invoice-totals"><div><span>Subtotal</span><span>{format(totals.subtotal)}</span></div><div><span>Discount</span><span>− {format(totals.discount)}</span></div><div><span>Tax ({invoice.taxBasisPoints / 100}%)</span><span>{format(totals.tax)}</span></div><div className="oz-total"><strong>{invoice.status === "paid" ? "Total paid" : "Total"}</strong><strong>{format(totals.total)}</strong></div></div>
    <div className="oz-paper-note"><h3>Payment instructions</h3><p>{paymentDetails(invoice.business) || "Add payment instructions in workspace Settings before sending."}</p></div>
    {invoice.notes && <div className="oz-paper-note"><h3>A note from the studio</h3><p>{invoice.notes}</p></div>}
    <div className="oz-paper-note"><p>Questions? Contact {invoice.business.email}.</p></div>
  </article>
}
