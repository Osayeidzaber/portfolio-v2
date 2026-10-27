import { displayDate, invoiceTotals, money, type Invoice } from "@/lib/studio/schema"

export function InvoicePreview({ invoice }: { invoice: Invoice }) {
  const totals = invoiceTotals(invoice)
  const format = (amount: number) => money(amount, invoice.currency)
  return <article className="oz-invoice-paper" aria-label="Invoice preview">
    <div className="oz-paper-header"><div><div className="oz-paper-brand">OZ STUDIO</div><p>{invoice.status === "draft" ? "DRAFT / NOT YET ISSUED" : invoice.status === "paid" ? "PAID / THANK YOU" : invoice.status === "void" ? "VOID / DO NOT PAY" : "INVOICE"}</p></div><div><strong>{invoice.number}</strong><p>{invoice.currency} / SERVICES</p></div></div>
    <h2>{invoice.title}</h2><p className="oz-paper-meta">Issued {displayDate(invoice.issueDate)} · Due {displayDate(invoice.dueDate)}</p>
    <div className="oz-paper-parties"><div><h3>From</h3><p><strong>{invoice.business.name}</strong><br />{invoice.business.email}{invoice.business.address && <><br />{invoice.business.address}</>}</p></div><div><h3>Bill to</h3><p><strong>{invoice.client.name}</strong>{invoice.client.company && <><br />{invoice.client.company}</>}<br />{invoice.client.email}{invoice.client.address && <><br />{invoice.client.address}</>}</p></div></div>
    <table className="oz-paper-table"><caption className="sr-only">Invoice services and amounts</caption><thead><tr><th scope="col">Description</th><th scope="col">Qty</th><th scope="col">Rate</th><th scope="col">Amount</th></tr></thead><tbody>{invoice.items.map((item, index) => <tr key={index}><td>{item.description}</td><td>{item.quantity}</td><td>{format(item.unitPrice)}</td><td>{format(item.quantity * item.unitPrice)}</td></tr>)}</tbody></table>
    <div className="oz-invoice-totals"><div><span>Subtotal</span><span>{format(totals.subtotal)}</span></div><div><span>Discount</span><span>− {format(totals.discount)}</span></div><div><span>Tax ({invoice.taxBasisPoints / 100}%)</span><span>{format(totals.tax)}</span></div><div className="oz-total"><strong>{invoice.status === "paid" ? "Total paid" : "Total"}</strong><strong>{format(totals.total)}</strong></div></div>
    <div className="oz-paper-note"><h3>Payment instructions</h3><p>{invoice.business.paymentInstructions || "Add payment instructions in workspace Settings before sending."}</p></div>
    {invoice.notes && <div className="oz-paper-note"><h3>A note from the studio</h3><p>{invoice.notes}</p></div>}
    <div className="oz-paper-note"><p>Questions? Contact {invoice.business.email}.</p></div>
  </article>
}
