"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"

import { invoiceEmail } from "@/lib/studio/invoice-document"
import { invoiceInputSchema, invoiceTotals, money, toMinor, type Invoice, type InvoiceInput, type StudioData, type PaymentRecord, type EmailComposition, type InvoiceStyling } from "@/lib/studio/schema"
import { InvoicePreview } from "./invoice-preview"
import { PdfViewer } from "./pdf-viewer"
import { DesignPicker } from "./design-picker"
import { invoiceDesigns, invoiceDesignName, type InvoiceDesign } from "@/lib/studio/designs"
import { liveInvoicePreview } from "@/lib/studio/live-preview"
import { LivePreview } from "./live-preview"
import { browserInvoicePdf, pdfBase64 } from "@/lib/studio/browser-pdf"
import { useConfirm } from "@/components/admin/confirm"
import { ClientPicker } from "./client-picker"
import { DraftRecovery } from "./draft-recovery"
import { PaymentRecordForm } from "./payment-record"
import { previousClients } from "@/lib/studio/workflows"
import type { RecoveryFields } from "@/lib/studio/recovery"
import { InvoiceActivity } from "./activity"
import { InvoiceEmailStatus } from "./email-status"

export function InvoiceEditor({ data, invoice, initial, today, busy, persistenceEnabled, emailReady, sender, onSave, onSend, onIssue, onStatus, onClose, onUnsavedChange, onCheckEmail, initialMode, initialEmail }: {
  data: StudioData; invoice: Invoice | null; initial?: InvoiceInput; today: string; busy: boolean; persistenceEnabled: boolean; emailReady: boolean; sender: string
  onSave: (value: InvoiceInput, next?: "email", emailDraft?: EmailComposition) => void; onSend: (id: string, pdf?: string, composition?: EmailComposition) => Promise<{ ok: true } | { ok: false; error: string }>; onIssue: (id: string) => void; onStatus: (id: string, status: "paid" | "void", payment?: PaymentRecord) => void; onClose: () => void
  initialMode?: "email"
  initialEmail?: EmailComposition
  onCheckEmail?: (id: string) => void
  onUnsavedChange?: (value: boolean) => void
}) {
  const confirm = useConfirm()
  const source = invoice ?? initial
  const [mode, setMode] = useState<"edit" | "preview" | "pdf" | "email" | "history" | "receipt">(initialMode ?? (invoice?.status && invoice.status !== "draft" ? "pdf" : "edit"))
  const [error, setError] = useState("")
  const [sendStage, setSendStage] = useState<"idle" | "confirming" | "preparing" | "sending" | "accepted" | "failed">("idle")
  const [sendError, setSendError] = useState("")
  const sendInFlight = useRef(false)
  const [emailSubject, setEmailSubject] = useState(invoice?.emailAttempt?.subject ?? initialEmail?.subject ?? "")
  const [emailMessage, setEmailMessage] = useState(invoice?.emailAttempt?.message ?? initialEmail?.message ?? "")
  const [design, setDesign] = useState<InvoiceDesign>(source?.design ?? (invoice ? "signature" : data.settings.defaultDesign ?? "noir"))
  const [styling, setStyling] = useState<InvoiceStyling | undefined>(source ? source.styling : { showRates: data.settings.defaultShowRates !== false, footer: "" })
  const [emailTheme, setEmailTheme] = useState<"paper" | "dark">(invoice?.emailAttempt?.theme ?? initialEmail?.theme ?? invoice?.business.defaultEmailTheme ?? data.settings.defaultEmailTheme ?? "paper")
  const [serviceQuery, setServiceQuery] = useState("")
  const [title, setTitle] = useState(source?.title ?? "")
  const [client, setClient] = useState(source?.client ?? { name: "", company: "", email: "", address: "" })
  const [number, setNumber] = useState(invoice?.number ?? `OZ-${String(data.nextInvoice).padStart(4, "0")}`)
  const [issueDate, setIssueDate] = useState(source?.issueDate ?? today)
  const [dueDate, setDueDate] = useState(source?.dueDate ?? today)
  const [currency, setCurrency] = useState(source?.currency ?? data.settings.currency)
  const [items, setItems] = useState((source?.items ?? [{ description: "", quantity: 1, unitPrice: 0 }]).map((item) => ({ description: item.description, quantity: String(item.quantity), price: (item.unitPrice / 100).toFixed(2) })))
  const [discount, setDiscount] = useState(((source?.discount ?? 0) / 100).toFixed(2))
  const [tax, setTax] = useState(String((source?.taxBasisPoints ?? 0) / 100))
  const [notes, setNotes] = useState(source?.notes ?? data.settings.invoiceNote)
  const locked = invoice && invoice.status !== "draft"
  const clients = previousClients(data.invoices)
  const presets = (data.services ?? []).filter((service) => service.currency === currency && `${service.name} ${service.description}`.toLowerCase().includes(serviceQuery.toLowerCase()))
  function restore(fields: RecoveryFields) {
    setStyling(fields.styling); setEmailTheme(fields.emailTheme ?? "paper")
    setTitle(fields.title); setNumber(fields.number); setDesign(fields.design); setClient(fields.client)
    setIssueDate(fields.issueDate); setDueDate(fields.dueDate); setCurrency(fields.currency)
    setItems(fields.items); setDiscount(fields.discount); setTax(fields.tax); setNotes(fields.notes)
    setEmailSubject(fields.emailSubject); setEmailMessage(fields.emailMessage)
  }
  const composition = { subject: emailSubject.trim() || `${invoice?.business.name || data.settings.name} — Invoice ${number}`, message: emailMessage, theme: emailTheme }

  async function send() {
    if (!invoice || sendInFlight.current || busy) return
    setSendError("")
    if (!emailReady) { setSendError("Connect a verified email sender in Settings before sending this invoice."); setSendStage("failed"); return }
    if (dirty && !locked) { setSendError("Save your latest changes before sending. Return to Details and use Save & continue."); setSendStage("failed"); return }
    sendInFlight.current = true
    setSendStage("confirming")
    try {
      const retry = Boolean(invoice.emailAttempt)
      const approved = await confirm({
        title: retry ? `Retry email for ${invoice.number}?` : `Send invoice ${invoice.number}?`,
        body: retry ? `Retry the original saved email to ${invoice.client.email}, including its PDF attachment? The saved request is reused to prevent duplicate submissions.` : `Send ${invoice.number} to ${invoice.client.email}? Total: ${money(invoiceTotals(invoice).total, invoice.currency)}. The email includes ${invoice.number.replace(/[^A-Za-z0-9-]/g, "-")}.pdf and your payment instructions. Sending locks the invoice details.`,
        confirm: retry ? "Retry saved email" : "Send invoice",
      })
      if (!approved) { setSendStage("idle"); return }
      setSendStage(retry ? "sending" : "preparing")
      const attachment = retry ? undefined : pdfBase64(await browserInvoicePdf({ ...invoice, status: "issued" }))
      setSendStage("sending")
      const result = await onSend(invoice.id, attachment, { subject: emailSubject.trim() || `${invoice.business.name} — Invoice ${invoice.number}`, message: emailMessage, theme: emailTheme })
      if (!result.ok) { setSendError(result.error); setSendStage("failed"); return }
      setSendStage("accepted")
    } catch (error) {
      setSendError(error instanceof Error ? error.message : "The email could not be submitted. Reload to check the saved send status before retrying.")
      setSendStage("failed")
    } finally { sendInFlight.current = false }
  }
  function value(): InvoiceInput {
    return invoiceInputSchema.parse({ ...(invoice ? { id: invoice.id } : {}), title, number, design, ...(styling ? { styling } : {}), client, issueDate, dueDate, currency, items: items.map((item) => ({ description: item.description, quantity: Number(item.quantity), unitPrice: toMinor(item.price) })), discount: toMinor(discount), taxBasisPoints: toMinor(tax), notes })
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
  const live = liveInvoicePreview({ title, number, design, issueDate, dueDate, currency, client, items, discount, tax, notes, styling }, data.settings, today)
  const dirty = !locked && (!invoice || !document || JSON.stringify(invoiceInputSchema.parse(document)) !== JSON.stringify(invoiceInputSchema.parse(invoice)) || JSON.stringify(document.business) !== JSON.stringify(invoice.business))
  const editSignature = JSON.stringify({ title, client, number, design, styling, issueDate, dueDate, currency, items, discount, tax, notes })
  const [startingSignature] = useState(editSignature)
  const unsaved = Boolean(!locked && (invoice ? dirty : initial || editSignature !== startingSignature))
  useEffect(() => {
    onUnsavedChange?.(unsaved)
    const warn = (event: BeforeUnloadEvent) => { if (unsaved) event.preventDefault() }
    window.addEventListener("beforeunload", warn)
    return () => { window.removeEventListener("beforeunload", warn); onUnsavedChange?.(false) }
  }, [unsaved, onUnsavedChange])
  const close = async () => { if (!unsaved || await confirm({ title: "Leave this invoice?", body: "Your latest changes have not been saved to the ledger.", confirm: "Leave without saving" })) onClose() }
  const submit = (event: FormEvent) => { event.preventDefault(); try { const input = value(); invoiceTotals(input); setError(""); onSave(input, (event.nativeEvent as SubmitEvent).submitter?.getAttribute("data-next") === "email" ? "email" : undefined, { subject: emailSubject, message: emailMessage, theme: emailTheme }) } catch (error) { setError(explain(error)) } }
  const switchMode = (next: typeof mode) => {
    if (next !== "edit") { try { preview() } catch (error) { setError(explain(error)); return } }
    setError(""); setMode(next)
  }
  return <div className={`oz-invoice-editor${mode === "edit" ? " oz-editor-live" : mode === "email" ? " oz-editor-email" : ""}`}>
    <button className="oz-small-button" onClick={close} type="button">← All invoices</button>
    <div className="oz-desk-heading"><div><p className="oz-label">ACCOUNTS / {invoice?.number ?? "NEW DRAFT"}</p><h1>{invoice ? invoice.number : "Create an invoice."}</h1><p>{locked ? "Issued records are locked. Review the saved document and manage its payment status." : "Write the scope, check the numbers, then save your draft. Sending is a separate step."}</p></div>{invoice && <span className={`oz-badge oz-badge-${invoice.status}`}>{invoice.status}</span>}</div>
    {error && <p role="alert" className="oz-notice">{error}</p>}
    {initial && !invoice && <p className="oz-notice">Details reused in a new, unsaved draft. Check the invoice number, dates and services before saving. No payment or email history was copied.</p>}
    <div className="oz-form-switch" role="group" aria-label="Invoice view">
      {!locked && <button type="button" aria-pressed={mode === "edit"} onClick={() => switchMode("edit")}>Details</button>}
      <button type="button" aria-pressed={mode === "preview"} onClick={() => switchMode("preview")}>Invoice preview</button>
      <button type="button" aria-pressed={mode === "pdf"} onClick={() => switchMode("pdf")}>PDF viewer</button>
      <button type="button" aria-pressed={mode === "email"} onClick={() => switchMode("email")}>Email preview</button>{invoice && <button type="button" aria-pressed={mode === "history"} onClick={() => switchMode("history")}>Activity</button>}{invoice?.status === "paid" && <button type="button" aria-pressed={mode === "receipt"} onClick={() => switchMode("receipt")}>Payment receipt</button>}
    </div>
    {!locked && <DraftRecovery key={invoice ? JSON.stringify(invoice) : "new"} id={invoice?.id} fields={{ title, number, design, styling, emailTheme, issueDate, dueDate, currency, client, items, discount, tax, notes, emailSubject, emailMessage }} onRestore={restore} />}
    {invoice?.payment && <div className="oz-notice"><strong>Full payment recorded</strong><p>{invoice.payment.date} · {invoice.payment.method}{invoice.payment.reference ? ` · Reference: ${invoice.payment.reference}` : ""}</p></div>}
    <div className="oz-editor-context"><span className="oz-badge">{locked ? "Locked record" : unsaved ? "Unsaved changes" : invoice ? "Saved draft" : "New draft"}</span><p>{mode === "email" ? "Review your message and attachment, then confirm the send." : locked ? "Issued details stay preserved in this record." : "Details → Review → Send"}</p></div>
    {mode === "history" && invoice && <InvoiceActivity invoice={invoice} />}
    {mode === "receipt" && invoice?.status === "paid" && <PdfViewer key={`receipt-${JSON.stringify(invoice)}`} invoice={invoice} kind="receipt" />}
    {mode === "edit" && <div className="oz-edit-layout"><form className="oz-form oz-panel" onSubmit={submit}>
      <DesignPicker value={design} onChange={setDesign} />
      <details className="oz-style-controls"><summary>Refine this design</summary><label className="oz-check"><input type="checkbox" checked={styling?.showRates !== false} onChange={(event) => setStyling({ showRates: event.target.checked, footer: styling?.footer || "" })} />Show quantity and unit rates</label><label>Invoice footer (optional)<input maxLength={140} value={styling?.footer || ""} onChange={(event) => setStyling({ showRates: styling?.showRates !== false, footer: event.target.value })} placeholder="A short footer for this invoice" /></label><p className="oz-form-hint">Updates the preview, PDF and invoice summary email. Issued invoice styling is locked.</p></details>
      <label>Project / invoice title<input required maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="For example, storefront design & development" /></label>
      <div className="oz-form-grid"><label>Invoice number<input required maxLength={40} value={number} onChange={(event) => setNumber(event.target.value)} /></label><label>Currency<select value={currency} onChange={(event) => setCurrency(event.target.value as typeof currency)}>{["BDT", "USD", "CAD", "EUR", "GBP"].map((item) => <option key={item}>{item}</option>)}</select></label><label>Issue date<input type="date" required value={issueDate} onChange={(event) => setIssueDate(event.target.value)} /></label><label>Due date<input type="date" required min={issueDate} value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label></div>
      <h2>Bill to</h2><ClientPicker clients={clients} current={client} onChange={(next) => { setClient(next) }} /><div className="oz-form-grid"><label>Client name<input required maxLength={100} value={client.name} onChange={(event) => setClient({ ...client, name: event.target.value })} /></label><label>Company (optional)<input maxLength={100} value={client.company} onChange={(event) => setClient({ ...client, company: event.target.value })} /></label></div><label>Client email<input required type="email" maxLength={254} value={client.email} onChange={(event) => setClient({ ...client, email: event.target.value })} /></label><label>Client billing address<textarea maxLength={500} value={client.address} onChange={(event) => setClient({ ...client, address: event.target.value })} /></label>
      <h2>Services & line items</h2><p className="oz-form-hint">Rates are in {currency}. Quantities are whole units; enter a separate line for each service or deliverable.</p>
      {(data.services ?? []).some((service) => service.currency === currency) && <label>Find a saved service<input type="search" value={serviceQuery} onChange={(event) => setServiceQuery(event.target.value)} placeholder="Search service presets" /></label>}
      {serviceQuery && !presets.length && <p className="oz-form-hint">No saved services match your search in {currency}.</p>}
      {presets.length > 0 && <label>Add a saved service ({currency})<select defaultValue="" disabled={items.length >= 20} onChange={(event) => { const service = presets[Number(event.target.value)]; if (event.target.value !== "" && service) { const row = { description: service.description, quantity: String(service.quantity), price: (service.unitPrice / 100).toFixed(2) }; setItems(items.length === 1 && !items[0].description && Number(items[0].price) === 0 ? [row] : [...items, row]) } event.target.value = "" }}><option value="">Choose a saved service…</option>{presets.map((service, index) => <option key={index} value={index}>{service.name} · {money(service.unitPrice, service.currency)}</option>)}</select></label>}
      {items.map((item, index) => <div className="oz-line-item" key={index}><label>Description {index + 1}<input required maxLength={180} value={item.description} onChange={(event) => setItems(items.map((line, i) => i === index ? { ...line, description: event.target.value } : line))} /></label><label>Quantity {index + 1}<input type="number" min={1} max={10000} step={1} required value={item.quantity} onChange={(event) => setItems(items.map((line, i) => i === index ? { ...line, quantity: event.target.value } : line))} /></label><label>Rate {index + 1}<input type="text" inputMode="decimal" required value={item.price} onChange={(event) => setItems(items.map((line, i) => i === index ? { ...line, price: event.target.value } : line))} /></label><button type="button" className="oz-remove" disabled={items.length === 1} aria-label={`Remove line item ${index + 1}`} onClick={() => setItems(items.filter((_, i) => i !== index))}>×</button></div>)}
      <div><button className="oz-button" type="button" disabled={items.length >= 20} onClick={() => setItems([...items, { description: "", quantity: "1", price: "0.00" }])}>+ Add line item</button></div>
      <div className="oz-form-grid"><label>Discount ({currency})<input type="text" inputMode="decimal" value={discount} onChange={(event) => setDiscount(event.target.value)} /></label><label>Tax rate (%)<input type="text" inputMode="decimal" value={tax} onChange={(event) => setTax(event.target.value)} /></label></div>
      <p className="oz-form-hint">Tax is calculated after discount. Enter the rate applicable to this project; the studio does not determine it for you.</p>
      <label>Note to the client<textarea maxLength={1200} value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
      {document && <div className="oz-invoice-totals"><div className="oz-total"><strong>Draft total</strong><strong>{money(invoiceTotals(document).total, currency)}</strong></div></div>}
      <div className="oz-form-actions"><button className="oz-button" type="button" onClick={() => switchMode("pdf")}>Preview PDF</button><button className="oz-button" disabled={busy || !persistenceEnabled} type="submit">Save draft</button>{persistenceEnabled ? <button className="oz-button oz-button-light" disabled={busy} type="submit" data-next="email">{busy ? "Saving…" : "Save & continue →"}</button> : <button className="oz-button oz-button-light" type="button" onClick={() => switchMode("email")}>Continue to email preview →</button>}</div>
    </form><LivePreview invoice={live.invoice} calculationsReady={live.calculationsReady} pdfReady={Boolean(document)} onOpenPdf={() => switchMode("pdf")} /></div>}
    {mode === "preview" && document && <InvoicePreview invoice={document} />}
    {mode === "pdf" && document && <>
      <div className="oz-design-bar">{locked ? <p className="oz-form-hint">Saved design: <strong>{invoiceDesignName(invoice.design)}</strong></p> : <label>Invoice design<select aria-label="PDF invoice design" value={design} onChange={(event) => setDesign(event.target.value as InvoiceDesign)}>{invoiceDesigns.map((item) => <option value={item.id} key={item.id}>{item.name} · {item.dark ? "Dark" : "Paper"}</option>)}</select></label>}<p className="oz-form-hint">{locked ? "The issued invoice keeps its selected design." : "Switch layouts to compare the actual PDFs. Save your draft to keep your choice."}</p></div>
      <PdfViewer key={JSON.stringify(document)} invoice={document} />
    </>}
    {mode === "email" && document && <div className="oz-email-content">{!invoice?.emailAttempt && <div className="oz-form oz-panel oz-email-compose"><div><p className="oz-label">THE EMAIL</p><h2>A personal touch.</h2></div><label>Email appearance<select value={emailTheme} onChange={(event) => setEmailTheme(event.target.value as "paper" | "dark")}><option value="paper">Paper · white email</option><option value="dark">Noir · dark email</option></select></label><label>Email subject<input required maxLength={180} value={composition.subject} onChange={(event) => { setEmailSubject(event.target.value) }} /></label><label>Personal message (optional)<textarea maxLength={2000} value={emailMessage} onChange={(event) => { setEmailMessage(event.target.value) }} placeholder="A short personal note for this client. Invoice totals and payment details are included automatically." /></label></div>}<p className="oz-form-hint" style={{ marginBottom: 12 }}>To: {document.client.email} · Subject: {invoice?.emailAttempt?.subject || composition.subject}</p><div className="oz-email-attachment"><span className="oz-label">PDF ATTACHMENT</span><strong>{document.number.replace(/[^A-Za-z0-9-]/g, "-")}.pdf</strong><span>{invoiceDesignName(document.design)} design · Generated in your browser and attached when you send.</span></div><details className="oz-email-pdf"><summary>Review PDF attachment</summary><PdfViewer key={JSON.stringify(document)} invoice={{ ...document, status: document.status === "draft" ? "issued" : document.status }} /></details><details className="oz-email-message-preview"><summary>Preview email message</summary><iframe className="oz-mail-preview" title="Invoice email preview" sandbox="" srcDoc={invoiceEmail(document, sender || "billing@example.com", "/oz-studio/logo-email.png", invoice?.emailAttempt ? { subject: invoice.emailAttempt.subject || `${document.business.name} — Invoice ${document.number}`, message: invoice.emailAttempt.message || "", theme: invoice.emailAttempt.theme } : composition).html} /></details></div>}
    {mode !== "edit" && <div id="oz-send-review" className="oz-panel oz-review">
      {invoice ? <>
        {invoice.emailAttempt ? <InvoiceEmailStatus invoice={invoice} /> : <p className="oz-label">READY FOR REVIEW / {invoice.number}</p>}<dl className="oz-send-summary"><div><dt>To</dt><dd>{invoice.client.name}<small>{invoice.client.email}</small></dd></div><div><dt>Total</dt><dd>{money(invoiceTotals(invoice).total, invoice.currency)}</dd></div><div><dt>Due</dt><dd>{invoice.dueDate}</dd></div><div><dt>Attachment</dt><dd>{invoice.number.replace(/[^A-Za-z0-9-]/g, "-")}.pdf</dd></div></dl>{invoice.emailAttempt?.acceptedAt && onCheckEmail && <button type="button" className="oz-button" disabled={busy || !emailReady} onClick={() => onCheckEmail(invoice.id)}>Check email delivery</button>}
        <div className="oz-row-actions"><button className="oz-button" onClick={() => switchMode("pdf")}>Open PDF / download ↗</button>{invoice.status === "draft" && <button className="oz-button" disabled={busy || Boolean(dirty)} onClick={async () => { if (await confirm({ title: "Issue this invoice?", body: "This locks the saved invoice details. It does not send an email.", confirm: "Issue invoice" })) onIssue(invoice.id) }}>Issue without email</button>}{invoice.status === "issued" && (!invoice.emailAttempt || invoice.emailAttempt.acceptedAt) && <PaymentRecordForm invoice={invoice} today={today} busy={busy} onSave={(payment) => onStatus(invoice.id, "paid", payment)} />}{(invoice.status === "draft" || invoice.status === "issued") && (!invoice.emailAttempt || invoice.emailAttempt.acceptedAt) && <button className="oz-small-button" disabled={busy} onClick={async () => { if (await confirm({ title: "Void this invoice?", body: "It will stay in your records and cannot be sent.", confirm: "Void invoice" })) onStatus(invoice.id, "void") }}>Void invoice</button>}</div>
        {!invoice.emailAttempt?.acceptedAt && invoice.status !== "void" && invoice.status !== "paid" && <>
          <h2 style={{ marginTop: 28 }}>Review, then send.</h2><p className="oz-form-hint">The saved invoice will be emailed to <strong>{invoice.client.email}</strong> with a PDF attached. Issuing locks the invoice details.</p>
          {!emailReady && <p className="oz-notice" style={{ marginTop: 20 }}>Connect a verified email sender in Settings to enable delivery. Preview and PDF download remain available.</p>}
          {invoice.emailAttempt && <p className="oz-notice" style={{ marginTop: 20 }}>This invoice has a pending send. Retrying uses the original saved request to avoid duplicates within the provider’s retry window.</p>}
          {dirty && !locked && <p className="oz-notice" style={{ marginTop: 20 }}>Save your latest changes before sending. The send action always uses the saved invoice.</p>}
          <p className="oz-form-hint" style={{ margin: "20px 0 12px" }}>Click Send to review the recipient, total and PDF attachment in the confirmation dialog.</p>
          <button type="button" className="oz-button oz-button-light" disabled={busy || sendStage === "confirming" || sendStage === "preparing" || sendStage === "sending"} onClick={() => void send()}>{sendStage === "preparing" ? "Preparing PDF attachment…" : sendStage === "sending" ? "Sending invoice…" : busy ? "Please wait…" : sendStage === "confirming" ? "Review confirmation…" : invoice.emailAttempt ? "Retry pending send" : `Send ${invoice.number} to client`}</button>
        </>}
        {sendStage === "preparing" && <p className="oz-notice" role="status">Preparing the invoice PDF in your browser…</p>}
        {sendStage === "sending" && <p className="oz-notice" role="status">Submitting the email and PDF attachment. Please wait for confirmation.</p>}
        {sendStage === "accepted" && <p className="oz-notice" role="status">Resend accepted the invoice email with its PDF attachment. The saved email receipt shows the message ID.</p>}
        {sendError && <p className="oz-notice" role="alert">{sendError}</p>}
      </> : <><h2>Save before sending.</h2><p className="oz-form-hint">Preview your document, return to Details, and save the draft. You can review the saved invoice before emailing it.</p><button className="oz-button" onClick={() => switchMode("edit")}>Back to details</button></>}
    </div>}
  </div>
}
