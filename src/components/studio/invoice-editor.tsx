"use client"

import { useState, type FormEvent } from "react"

import { invoiceEmail } from "@/lib/studio/invoice-document"
import { invoiceInputSchema, invoiceTotals, money, toMinor, type Invoice, type InvoiceInput, type StudioData } from "@/lib/studio/schema"
import { InvoicePreview } from "./invoice-preview"
import { PdfViewer } from "./pdf-viewer"
import { DesignPicker } from "./design-picker"
import { invoiceDesigns, invoiceDesignName, type InvoiceDesign } from "@/lib/studio/designs"

export function InvoiceEditor({ data, invoice, today, busy, persistenceEnabled, emailReady, sender, onSave, onSend, onIssue, onStatus, onClose }: {
  data: StudioData; invoice: Invoice | null; today: string; busy: boolean; persistenceEnabled: boolean; emailReady: boolean; sender: string
  onSave: (value: InvoiceInput) => void; onSend: (id: string) => void; onIssue: (id: string) => void; onStatus: (id: string, status: "paid" | "void") => void; onClose: () => void
}) {
  const [mode, setMode] = useState<"edit" | "preview" | "pdf" | "email">(invoice?.status && invoice.status !== "draft" ? "pdf" : "edit")
  const [error, setError] = useState("")
  const [reviewed, setReviewed] = useState(false)
  const [design, setDesign] = useState<InvoiceDesign>(invoice?.design ?? (invoice ? "signature" : "noir"))
  const [title, setTitle] = useState(invoice?.title ?? "")
  const [client, setClient] = useState(invoice?.client ?? { name: "", company: "", email: "", address: "" })
  const [number, setNumber] = useState(invoice?.number ?? `OZ-${String(data.nextInvoice).padStart(4, "0")}`)
  const [issueDate, setIssueDate] = useState(invoice?.issueDate ?? today)
  const [dueDate, setDueDate] = useState(invoice?.dueDate ?? today)
  const [currency, setCurrency] = useState(invoice?.currency ?? data.settings.currency)
  const [items, setItems] = useState((invoice?.items ?? [{ description: "", quantity: 1, unitPrice: 0 }]).map((item) => ({ description: item.description, quantity: String(item.quantity), price: (item.unitPrice / 100).toFixed(2) })))
  const [discount, setDiscount] = useState(((invoice?.discount ?? 0) / 100).toFixed(2))
  const [tax, setTax] = useState(String((invoice?.taxBasisPoints ?? 0) / 100))
  const [notes, setNotes] = useState(invoice?.notes ?? data.settings.invoiceNote)
  const locked = invoice && invoice.status !== "draft"
  function value(): InvoiceInput {
    return invoiceInputSchema.parse({ ...(invoice ? { id: invoice.id } : {}), title, number, design, client, issueDate, dueDate, currency, items: items.map((item) => ({ description: item.description, quantity: Number(item.quantity), unitPrice: toMinor(item.price) })), discount: toMinor(discount), taxBasisPoints: toMinor(tax), notes })
  }
  function preview(): Invoice {
    if (locked) return invoice
    const input = value()
    invoiceTotals(input)
    return { ...input, id: invoice?.id || "00000000-0000-4000-8000-000000000000", number: input.number || `OZ-${String(data.nextInvoice).padStart(4, "0")}`, status: "draft", client: input.client, business: data.settings, createdAt: invoice?.createdAt || `${today}T12:00:00.000Z` }
  }
  const explain = (error: unknown) => {
    if (error && typeof error === "object" && "issues" in error) return (error as { issues: Array<{ message: string }> }).issues[0]?.message || "Check the invoice fields."
    return error instanceof Error ? error.message : "Check the invoice fields."
  }
  let document: Invoice | null = null
  try { document = preview() } catch { /* Incomplete drafts remain editable. */ }
  const dirty = !locked && (!invoice || !document || JSON.stringify(invoiceInputSchema.parse(document)) !== JSON.stringify(invoiceInputSchema.parse(invoice)) || JSON.stringify(document.business) !== JSON.stringify(invoice.business))
  const close = () => { if (!dirty || window.confirm("Leave this invoice without saving your latest changes?")) onClose() }
  const submit = (event: FormEvent) => { event.preventDefault(); try { const input = value(); invoiceTotals(input); setError(""); onSave(input) } catch (error) { setError(explain(error)) } }
  const switchMode = (next: typeof mode) => {
    if (next !== "edit") { try { preview() } catch (error) { setError(explain(error)); return } }
    setError(""); setMode(next)
  }
  return <div className="oz-invoice-editor">
    <button className="oz-small-button" onClick={close} type="button">← All invoices</button>
    <div className="oz-desk-heading"><div><p className="oz-label">ACCOUNTS / {invoice?.number ?? "NEW DRAFT"}</p><h1>{invoice ? invoice.number : "Create an invoice."}</h1><p>{locked ? "Issued records are locked. Review the saved document and manage its payment status." : "Write the scope, check the numbers, then save your draft. Sending is a separate step."}</p></div>{invoice && <span className={`oz-badge oz-badge-${invoice.status}`}>{invoice.status}</span>}</div>
    {error && <p role="alert" className="oz-notice">{error}</p>}
    <div className="oz-form-switch" role="group" aria-label="Invoice view">
      {!locked && <button type="button" aria-pressed={mode === "edit"} onClick={() => switchMode("edit")}>Details</button>}
      <button type="button" aria-pressed={mode === "preview"} onClick={() => switchMode("preview")}>Invoice preview</button>
      <button type="button" aria-pressed={mode === "pdf"} onClick={() => switchMode("pdf")}>PDF viewer</button>
      <button type="button" aria-pressed={mode === "email"} onClick={() => switchMode("email")}>Email preview</button>
    </div>
    {mode === "edit" && <form className="oz-form oz-panel" onSubmit={submit}>
      <DesignPicker value={design} onChange={setDesign} />
      <label>Project / invoice title<input required maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="For example, storefront design & development" /></label>
      <div className="oz-form-grid"><label>Invoice number<input required maxLength={40} value={number} onChange={(event) => setNumber(event.target.value)} /></label><label>Currency<select value={currency} onChange={(event) => setCurrency(event.target.value as typeof currency)}>{["BDT", "USD", "CAD", "EUR", "GBP"].map((item) => <option key={item}>{item}</option>)}</select></label><label>Issue date<input type="date" required value={issueDate} onChange={(event) => setIssueDate(event.target.value)} /></label><label>Due date<input type="date" required min={issueDate} value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label></div>
      <h2>Bill to</h2><div className="oz-form-grid"><label>Client name<input required maxLength={100} value={client.name} onChange={(event) => setClient({ ...client, name: event.target.value })} /></label><label>Company (optional)<input maxLength={100} value={client.company} onChange={(event) => setClient({ ...client, company: event.target.value })} /></label></div><label>Client email<input required type="email" maxLength={254} value={client.email} onChange={(event) => setClient({ ...client, email: event.target.value })} /></label><label>Client billing address<textarea maxLength={500} value={client.address} onChange={(event) => setClient({ ...client, address: event.target.value })} /></label>
      <h2>Services & line items</h2><p className="oz-form-hint">Rates are in {currency}. Quantities are whole units; enter a separate line for each service or milestone.</p>
      {items.map((item, index) => <div className="oz-line-item" key={index}><label>Description {index + 1}<input required maxLength={180} value={item.description} onChange={(event) => setItems(items.map((line, i) => i === index ? { ...line, description: event.target.value } : line))} /></label><label>Quantity {index + 1}<input type="number" min={1} max={10000} step={1} required value={item.quantity} onChange={(event) => setItems(items.map((line, i) => i === index ? { ...line, quantity: event.target.value } : line))} /></label><label>Rate {index + 1}<input type="text" inputMode="decimal" required value={item.price} onChange={(event) => setItems(items.map((line, i) => i === index ? { ...line, price: event.target.value } : line))} /></label><button type="button" className="oz-remove" disabled={items.length === 1} aria-label={`Remove line item ${index + 1}`} onClick={() => setItems(items.filter((_, i) => i !== index))}>×</button></div>)}
      <div><button className="oz-button" type="button" disabled={items.length >= 20} onClick={() => setItems([...items, { description: "", quantity: "1", price: "0.00" }])}>+ Add line item</button></div>
      <div className="oz-form-grid"><label>Discount ({currency})<input type="text" inputMode="decimal" value={discount} onChange={(event) => setDiscount(event.target.value)} /></label><label>Tax rate (%)<input type="text" inputMode="decimal" value={tax} onChange={(event) => setTax(event.target.value)} /></label></div>
      <p className="oz-form-hint">Tax is calculated after discount. Enter the rate applicable to this project; the studio does not determine it for you.</p>
      <label>Note to the client<textarea maxLength={1200} value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
      {document && <div className="oz-invoice-totals"><div className="oz-total"><strong>Draft total</strong><strong>{money(invoiceTotals(document).total, currency)}</strong></div></div>}
      <div className="oz-form-actions"><button className="oz-button" type="button" onClick={() => switchMode("pdf")}>Preview PDF</button><button className="oz-button oz-button-light" disabled={busy || !persistenceEnabled} type="submit">{busy ? "Saving…" : persistenceEnabled ? "Save draft" : "Storage required to save"}</button></div>
    </form>}
    {mode === "preview" && document && <InvoicePreview invoice={document} />}
    {mode === "pdf" && document && <>
      <div className="oz-design-bar">{locked ? <p className="oz-form-hint">Saved design: <strong>{invoiceDesignName(invoice.design)}</strong></p> : <label>Invoice design<select aria-label="PDF invoice design" value={design} onChange={(event) => setDesign(event.target.value as InvoiceDesign)}>{invoiceDesigns.map((item) => <option value={item.id} key={item.id}>{item.name} · {item.dark ? "Dark" : "Paper"}</option>)}</select></label>}<p className="oz-form-hint">{locked ? "The issued invoice keeps its selected design." : "Switch layouts to compare the actual PDFs. Save your draft to keep your choice."}</p></div>
      <PdfViewer key={JSON.stringify(document)} invoice={document} />
    </>}
    {mode === "email" && document && <><p className="oz-form-hint" style={{ marginBottom: 20 }}>To: {document.client.email} · Subject: {document.business.name} — Invoice {document.number}</p><iframe className="oz-mail-preview" title="Invoice email preview" sandbox="" srcDoc={invoiceEmail(document, sender || "billing@example.com", "/oz-studio/logo-email.png").html} /></>}
    {mode !== "edit" && <div className="oz-panel oz-review">
      {invoice ? <>
        <div className="oz-row-actions"><a className="oz-button" href={`/api/studio/invoices/${invoice.id}/pdf?download=1`} target="_blank" rel="noreferrer">Download PDF ↗</a>{invoice.status === "draft" && <button className="oz-button" disabled={busy || Boolean(dirty)} onClick={() => { if (window.confirm("Issue this saved invoice and lock its details? This does not send an email.")) onIssue(invoice.id) }}>Issue without email</button>}{invoice.status === "issued" && (!invoice.emailAttempt || invoice.emailAttempt.acceptedAt) && <button className="oz-button" disabled={busy} onClick={() => { if (window.confirm("Confirm that you have received the full payment for this invoice?")) onStatus(invoice.id, "paid") }}>Record full payment</button>}{(invoice.status === "draft" || invoice.status === "issued") && (!invoice.emailAttempt || invoice.emailAttempt.acceptedAt) && <button className="oz-small-button" disabled={busy} onClick={() => { if (window.confirm("Void this invoice? It will stay in your records and cannot be sent.")) onStatus(invoice.id, "void") }}>Void invoice</button>}</div>
        {invoice.emailAttempt?.acceptedAt ? <p className="oz-form-hint" style={{ marginTop: 20 }}>Email accepted by the provider. Message ID: {invoice.emailAttempt.providerId}. This confirms acceptance, not delivery or payment.</p> : invoice.status !== "void" && invoice.status !== "paid" && <>
          <h2 style={{ marginTop: 28 }}>Review, then send.</h2><p className="oz-form-hint">The saved invoice will be emailed to <strong>{invoice.client.email}</strong> with a PDF attached. Issuing locks the invoice details.</p>
          {!emailReady && <p className="oz-notice" style={{ marginTop: 20 }}>Connect a verified email sender in Settings to enable delivery. Preview and PDF download remain available.</p>}
          {invoice.emailAttempt && <p className="oz-notice" style={{ marginTop: 20 }}>This invoice has a pending send. Retrying uses the original saved request to avoid duplicates within the provider’s retry window.</p>}
          {dirty && !locked && <p className="oz-notice" style={{ marginTop: 20 }}>Save your latest changes before sending. The send action always uses the saved invoice.</p>}
          <label className="oz-check" style={{ marginTop: 20 }}><input type="checkbox" checked={reviewed} onChange={(event) => setReviewed(event.target.checked)} />I have checked the saved recipient, dates, payment instructions and amounts.</label>
          <button className="oz-button oz-button-light" disabled={!reviewed || !emailReady || busy || Boolean(dirty && !locked)} onClick={() => onSend(invoice.id)}>{busy ? "Submitting…" : invoice.emailAttempt ? "Retry pending send" : `Send ${invoice.number} to client`}</button>
        </>}
      </> : <><h2>Save before sending.</h2><p className="oz-form-hint">Preview your document, return to Details, and save the draft. You can review the saved invoice before emailing it.</p><button className="oz-button" onClick={() => switchMode("edit")}>Back to details</button></>}
    </div>}
  </div>
}
