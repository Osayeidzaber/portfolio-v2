"use client"

import Link from "next/link"
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react"

import { checkEmailStatusAction, archiveInvoicesAction, restoreArchiveAction, saveServicesAction, changeInvoiceStatus, issueInvoiceAction, loadWorkspace, saveBusinessAction, saveInvoiceAction, sendInvoiceAction, type WorkspaceResult } from "@/app/admin/oz-studio/actions"
import { logoutAction } from "@/app/admin/actions"
import { paymentDetails, displayDate, emptyStudio, invoiceTotals, money, type Business, type PaymentMethod, type Invoice, type InvoiceInput, type EmailComposition } from "@/lib/studio/schema"
import type { StudioSnapshot } from "@/lib/studio/store"
import { ConfirmProvider, useConfirm } from "@/components/admin/confirm"
import { DataTools } from "./data-tools"
import { ServicePresets } from "./service-presets"
import { clearAllInvoiceRecovery, clearInvoiceRecovery } from "@/lib/studio/recovery"
import { PaymentMethods } from "./payment-methods"
import { InvoiceEditor } from "./invoice-editor"
import { FinanceSummary } from "./finance-summary"
import { InvoiceEmailStatus } from "./email-status"
import { draftFromInvoice, invoiceCsv } from "@/lib/studio/ledger"

type Tab = "overview" | "invoices" | "settings"
const tabs: Array<{ id: Tab; label: string }> = [{ id: "overview", label: "Overview" }, { id: "invoices", label: "Invoices" }, { id: "settings", label: "Settings" }]
type Loaded = Extract<Awaited<ReturnType<typeof loadWorkspace>>, { ok: true }>

export function Workspace() { return <ConfirmProvider><WorkspaceInner /></ConfirmProvider> }

function WorkspaceInner() {
  const confirm = useConfirm()
  const [state, setState] = useState<Loaded | null>(null)
  const [tab, setTab] = useState<Tab>("overview")
  const [previewOnly, setPreviewOnly] = useState(false)
  const [busy, setBusy] = useState(true)
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null)
  const [editor, setEditor] = useState<{ id: string | null; initial?: InvoiceInput; mode?: "email"; revision?: number; emailDraft?: EmailComposition } | null>(null)
  const [unsaved, setUnsaved] = useState(false)
  const [sort, setSort] = useState("recent")
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("all")
  const [today, setToday] = useState("")
  const load = useCallback(async () => {
    setBusy(true)
    try {
      const result = await loadWorkspace()
      if (result.ok) { setState(result); setToday(new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" })) }
      else setMessage({ text: result.error, error: true })
    } catch { setMessage({ text: "The workspace could not be loaded. Check your connection and reload.", error: true }) }
    finally { setBusy(false) }
  }, [])
  useEffect(() => {
    let active = true
    loadWorkspace().then((result) => {
      if (!active) return
      if (result.ok) { setState(result); setToday(new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" })) }
      else setMessage({ text: result.error, error: true })
    }).catch(() => { if (active) setMessage({ text: "The workspace could not be loaded. Reload to try again.", error: true }) }).finally(() => { if (active) setBusy(false) })
    return () => { active = false }
  }, [])
  const go = async (next: Tab) => { if (unsaved && !(await confirm({ title: "Leave this invoice?", body: "Your latest changes have not been saved to the ledger.", confirm: "Leave without saving" }))) return; setTab(next); setEditor(null); setSearch(""); setStatus("all"); setMessage(null) }
  async function action(request: () => Promise<WorkspaceResult>, success: string, after?: (snapshot: StudioSnapshot) => void) {
    setBusy(true); setMessage(null)
    try {
      const result = await request()
      if (!result.ok) { setMessage({ text: result.error, error: true }); return }
      setState((current) => current ? { ...current, snapshot: result.snapshot } : current)
      setMessage({ text: success, error: false })
      after?.(result.snapshot)
    } catch { setMessage({ text: "The connection was interrupted. Reload to check the saved state before trying again.", error: true }) }
    finally { setBusy(false) }
  }
  const snapshot = state?.snapshot
  const data = snapshot?.data
  const saveInvoice = (input: InvoiceInput, next?: "email", emailDraft?: EmailComposition) => void action(() => saveInvoiceAction(input, snapshot!.sha), next === "email" ? "Draft saved. Review the email and PDF before sending." : "Draft saved. Review the invoice before sending.", (saved) => { try { clearInvoiceRecovery(localStorage, input.id) } catch {} setEditor((previous) => ({ id: input.id || saved.data.invoices[saved.data.invoices.length - 1].id, mode: next, revision: (previous?.revision ?? 0) + 1, emailDraft })) })
  const selectedInvoice = editor?.id ? data?.invoices.find((item) => item.id === editor.id) ?? null : null
  const filtered = data?.invoices.filter((invoice) => (status === "all" || (status === "overdue" ? invoice.status === "issued" && invoice.dueDate < today : invoice.status === status)) && `${invoice.number} ${invoice.title} ${invoice.client.name} ${invoice.client.company}`.toLowerCase().includes(search.toLowerCase())) ?? []
  const sorted = [...filtered].sort((a, b) => sort === "due" ? a.dueDate.localeCompare(b.dueDate) : sort === "client" ? (a.client.company || a.client.name).localeCompare(b.client.company || b.client.name) : b.createdAt.localeCompare(a.createdAt))
  function exportCsv() {
    const url = URL.createObjectURL(new Blob([invoiceCsv(sorted)], { type: "text/csv;charset=utf-8" }))
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "oz-studio-invoices.csv"; anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const create = () => { setTab("invoices"); setEditor({ id: null }) }
  return <div className="oz-workspace">
    <aside className="oz-sidebar"><Link href="/oz-studio" className="oz-wordmark" aria-label="OZ Studio public page">OZ<span>STUDIO</span></Link><p className="oz-label oz-sidebar-label">THE INVOICE DESK</p><nav aria-label="OZ Studio workspace">{tabs.map((item, index) => <button key={item.id} type="button" aria-current={tab === item.id ? "page" : undefined} onClick={() => go(item.id)}><span aria-hidden>0{index + 1}</span>{item.label}</button>)}</nav><div className="oz-sidebar-bottom"><Link href="/oz-studio">View studio ↗</Link><Link href="/admin">Portfolio editor ↗</Link><form action={logoutAction} onSubmit={() => { try { clearAllInvoiceRecovery(localStorage) } catch {} }}><button type="submit">Sign out</button></form></div></aside>
    <div className="oz-desk"><header className="oz-desk-top"><span className="oz-label">OZ / INVOICE DESK / {tab.toUpperCase()}</span><Link href="/oz-studio" className="oz-status-dot">View public studio ↗</Link></header><main className="oz-desk-main">
      {previewOnly && <p className="oz-notice">PDF designer mode. You can preview and download a custom invoice; this draft is not saved. Connect private storage to save records or send email.</p>}
      {message && <div className="oz-notice" role={message.error ? "alert" : "status"}><button type="button" aria-label="Dismiss message" onClick={() => setMessage(null)}>×</button>{message.text}{message.error && <div><button className="oz-small-button" disabled={busy} onClick={load}>Reload workspace</button></div>}</div>}
      {!state ? <div className="oz-panel"><h1 style={{ fontSize: 32 }}>Your work, on paper.</h1><p role="status">{busy ? "Opening invoice desk…" : "The workspace could not be loaded. Try reloading above."}</p></div> : state.mode === "unconfigured" && !previewOnly ? <><Heading label="START HERE" title="Your invoice desk awaits." description="Your public studio is ready. Connect private storage to save and send invoices securely." /><Setup emailReady={state.email.ready} onPreview={() => { setState({ ...state, snapshot: { data: emptyStudio(), sha: null } }); setPreviewOnly(true); setTab("invoices"); setEditor({ id: null }) }} /></> : data && <>
        {editor ? <InvoiceEditor key={`${editor.id || "new-invoice"}-${editor.mode || "edit"}-${editor.revision || 0}`} initialEmail={editor.emailDraft} initialMode={editor.mode} data={data} invoice={selectedInvoice} initial={editor.initial} onUnsavedChange={setUnsaved} today={today} busy={busy} persistenceEnabled={!previewOnly} emailReady={state.email.ready && !previewOnly} sender={state.email.sender} onCheckEmail={(id) => void action(() => checkEmailStatusAction(id, snapshot!.sha), "Latest email status checked with Resend.")} onSave={saveInvoice} onSend={(id, pdf, composition) => void action(() => sendInvoiceAction(id, snapshot!.sha, pdf, composition), "Invoice accepted by the email provider. Track delivery in your provider dashboard.")} onIssue={(id) => void action(() => issueInvoiceAction(id, snapshot!.sha), "Invoice issued. You can download it, send it, or record payment.")} onStatus={(id, next, payment) => void action(() => changeInvoiceStatus(id, next, snapshot!.sha, payment), next === "paid" ? "Full payment recorded." : "Invoice voided.")} onClose={() => setEditor(null)} /> : <>
          {tab === "overview" && <><Heading label="THE BIG PICTURE" title="Good work. Clear accounts." description="Create a custom invoice, check the PDF, and send it when it is ready." action={<button className="oz-button oz-button-light" onClick={create}>+ Create invoice</button>} />
            <FinanceSummary invoices={data.invoices} today={today} defaultCurrency={data.settings.currency} /><div className="oz-metrics"><Metric title="Drafts" value={String(data.invoices.filter((item) => item.status === "draft").length)} detail="Saved drafts awaiting your review." /><Metric title="Outstanding" value={String(data.invoices.filter((item) => item.status === "issued").length)} detail="Issued invoices not yet recorded as fully paid." /><Metric title="Paid" value={String(data.invoices.filter((item) => item.status === "paid").length)} detail="Invoices with full payment recorded." /></div>
            <div className="oz-desk-grid"><section className="oz-panel"><h2>Recent invoices</h2>{data.invoices.length ? [...data.invoices].reverse().slice(0, 5).map((invoice) => <InvoiceRow key={invoice.id} invoice={invoice} today={today} onDuplicate={() => { setTab("invoices"); setEditor({ id: null, initial: draftFromInvoice(invoice, today) }) }} onOpen={() => { setTab("invoices"); setEditor({ id: invoice.id }) }} />) : <Empty title="Your first invoice starts here." description="Add the billing details and services. Check your custom PDF before anything is sent." action={<button className="oz-button" onClick={create}>+ Create your first invoice</button>} />}</section><section className="oz-panel"><h2>A small, deliberate workflow.</h2><div className="oz-workflow"><p><span className="oz-label">01 / CREATE</span><br />Your client, your services, your terms.</p><p><span className="oz-label">02 / PREVIEW</span><br />Check the actual PDF in the viewer.</p><p><span className="oz-label">03 / ISSUE & SEND</span><br />Download it or send a branded email.</p></div><button className="oz-small-button" onClick={() => go("settings")}>Your business & payment details →</button></section></div>
            {(!state.email.ready || !paymentDetails(data.settings)) && <section className="oz-panel" style={{ marginTop: 24 }}><h2>Before your first send</h2><p>Add your business and payment details, then connect a verified sender. PDF preview and download work before email is connected.</p><button className="oz-small-button" onClick={() => go("settings")}>Open settings →</button></section>}
          </>}
          {tab === "invoices" && <><Heading label="ACCOUNTS" title="The work, on paper." description="Custom drafts, issued invoices and payment records. All in one ledger." action={<button className="oz-button oz-button-light" onClick={create}>+ Create invoice</button>} /><div className="oz-filter-row"><label style={{ flex: 1, minWidth: 180 }}>Search invoices<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Invoice number, client or project" /></label><label>Status<select aria-label="Status" value={status} onChange={(event) => setStatus(event.target.value)}>{["all", "draft", "issued", "overdue", "paid", "void"].map((item) => <option value={item} key={item}>{item[0].toUpperCase() + item.slice(1)}</option>)}</select></label><label>Sort by<select aria-label="Sort by" value={sort} onChange={(event) => setSort(event.target.value)}><option value="recent">Newest first</option><option value="due">Due date</option><option value="client">Client name</option></select></label><button className="oz-button" disabled={!filtered.length} onClick={exportCsv}>Export CSV</button></div><p className="oz-form-hint oz-ledger-count" role="status">{filtered.length} of {data.invoices.length} invoices</p><div className="oz-panel">{filtered.length ? sorted.map((invoice) => <InvoiceRow key={invoice.id} invoice={invoice} today={today} onDuplicate={() => { setTab("invoices"); setEditor({ id: null, initial: draftFromInvoice(invoice, today) }) }} onOpen={() => setEditor({ id: invoice.id })} />) : <Empty title={data.invoices.length ? "No matching invoices." : "A blank ledger. A fresh start."} description={data.invoices.length ? "Try a different search or status." : "Your drafts and issued invoices will appear here."} />}</div></>}
          {tab === "settings" && <><Heading label="THE FOUNDATIONS" title="Make it yours." description="Business details and payment instructions for your custom invoices. Changes apply to newly saved drafts; issued invoices keep their original details." /><BusinessForm key={JSON.stringify(data.settings)} settings={data.settings} busy={busy} onSave={(value) => {
            if (previewOnly) { setState({ ...state, snapshot: { data: { ...data, settings: value as Business }, sha: null } }); setMessage({ text: "Applied to this preview session only. These details are not saved and will be lost on reload.", error: false }); return }
            void action(() => saveBusinessAction(value, snapshot!.sha), "Business settings saved. Save any open draft again to apply them.")
          }} /><ServicePresets key={`services-${JSON.stringify(data.services)}`} services={data.services ?? []} busy={busy} onSave={(value) => {
            if (previewOnly) { setState({ ...state, snapshot: { data: { ...data, services: value }, sha: null } }); setMessage({ text: "Services applied to this preview session only.", error: false }); return }
            void action(() => saveServicesAction(value, snapshot!.sha), "Service presets saved.")
          }} /><DataTools key={`data-${snapshot!.sha}-${data.invoices.length}`} data={data} busy={busy} persistenceEnabled={!previewOnly} onArchive={(ids) => void action(() => archiveInvoicesAction(ids, snapshot!.sha), "Closed invoices archived. Keep the downloaded archive to restore them.")} onRestore={(value) => void action(() => restoreArchiveAction(value, snapshot!.sha), "Archive restored without replacing existing invoices.")} /><section className="oz-panel oz-settings" style={{ marginTop: 24 }}><h2>Connections & data</h2><div className="oz-connection"><div><strong>Private invoice storage</strong><p>{previewOnly ? "This is a temporary PDF design session. Connect private storage to save and email invoices." : state.mode === "local" ? "Local development storage in .studio-data. Configure a private GitHub repository before deploying." : "Invoices are saved to the private repository configured on the server. Public repositories are refused."}</p></div><span className="oz-badge">{previewOnly ? "Preview only" : state.mode === "local" ? "Local development" : "Private GitHub"}</span></div><div className="oz-connection"><div><strong>Invoice email</strong><p>{state.email.ready ? `Sender: ${state.email.sender}. Track actual delivery in Resend.` : "Set RESEND_API_KEY and STUDIO_EMAIL_FROM in Vercel. Verify the sending domain in Resend before your first send."}</p></div><span className="oz-badge">{state.email.ready ? "Configured" : "Not connected"}</span></div><p>Emails are always reviewed and sent manually. No scheduled or background emails are sent.</p></section></>}
        </>}
      </>}
    </main></div>
  </div>
}

function Heading({ label, title, description, action }: { label: string; title: string; description: string; action?: ReactNode }) { return <div className="oz-desk-heading"><div><p className="oz-label">{label}</p><h1>{title}</h1><p>{description}</p></div>{action}</div> }
function Metric({ title, value, detail }: { title: string; value: string; detail: string }) { return <div className="oz-metric"><span>{title}</span><strong>{value}</strong><p>{detail}</p></div> }
function Empty({ title, description, action }: { title: string; description: string; action?: ReactNode }) { return <div className="oz-empty"><strong>{title}</strong><p>{description}</p>{action}</div> }
function InvoiceRow({ invoice, today, onOpen, onDuplicate }: { invoice: Invoice; today: string; onOpen: () => void; onDuplicate: () => void }) {
  const overdue = invoice.status === "issued" && invoice.dueDate < today
  return <div className="oz-row"><div><strong>{invoice.number} · {invoice.client.company || invoice.client.name}</strong><p>{invoice.title}</p><p>{overdue ? "Overdue since" : "Due"} {displayDate(invoice.dueDate)}</p><InvoiceEmailStatus invoice={invoice} compact /></div><div className="oz-row-actions"><span className="oz-row-amount">{money(invoiceTotals(invoice).total, invoice.currency)}</span><span className={`oz-badge oz-badge-${invoice.status}`}>{overdue ? "overdue" : invoice.status}</span><button className="oz-small-button" onClick={onOpen}>Open<span className="sr-only"> {invoice.number}</span></button><button className="oz-small-button" aria-label={`Reuse ${invoice.number} as a new draft`} onClick={onDuplicate}>Reuse ↗</button></div></div>
}
function Setup({ emailReady, onPreview }: { emailReady: boolean; onPreview: () => void }) { return <section className="oz-panel oz-settings"><h2>Connect private invoice storage</h2><p>Client billing details belong in a private repository, separate from the public portfolio.</p><ol className="oz-setup-steps"><li>Create a private GitHub repository with an initial commit.</li><li>Create a fine-grained token with Contents read/write for that repository.</li><li>In Vercel set <code>STUDIO_DATA_REPO=owner/private-repository</code> and <code>STUDIO_GITHUB_TOKEN</code>.</li><li>For invoice email, set <code>RESEND_API_KEY</code> and <code>STUDIO_EMAIL_FROM</code> to a verified sender address.</li><li>Redeploy, then add your business details and first invoice.</li></ol><p>Email: {emailReady ? "Configured" : "Not connected yet"}. No email is sent automatically.</p><div className="oz-row-actions"><button className="oz-button oz-button-light" onClick={onPreview}>Open PDF designer</button><Link className="oz-button" href="/oz-studio">View your public studio ↗</Link></div></section> }
function BusinessForm({ settings, busy, onSave }: { settings: Business; busy: boolean; onSave: (value: unknown) => void }) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(settings.paymentMethods ?? [])
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); onSave({ paymentMethods, name: form.get("name"), email: form.get("email"), address: form.get("address"), currency: form.get("currency"), paymentInstructions: form.get("paymentInstructions"), invoiceNote: form.get("invoiceNote") }) }
  return <form className="oz-form oz-panel oz-settings" onSubmit={submit}><h2>Business identity</h2><div className="oz-form-grid"><label>Business name<input name="name" required maxLength={100} defaultValue={settings.name} /></label><label>Reply-to email<input type="email" name="email" required maxLength={254} defaultValue={settings.email} /></label></div><label>Business address<textarea name="address" maxLength={500} defaultValue={settings.address} /></label><label>Default invoice currency<select name="currency" defaultValue={settings.currency}>{["BDT", "USD", "CAD", "EUR", "GBP"].map((currency) => <option key={currency}>{currency}</option>)}</select></label><h2>Payment & correspondence</h2><PaymentMethods value={paymentMethods} onChange={setPaymentMethods} /><label>Payment instructions<textarea name="paymentInstructions" maxLength={1200} defaultValue={settings.paymentInstructions} placeholder="Your actual bank, mobile payment or payment-link instructions. These appear on invoices." /></label><label>Default note to clients<textarea name="invoiceNote" maxLength={1200} defaultValue={settings.invoiceNote} /></label><p className="oz-form-hint">These details appear on new invoices. Your sending address is configured separately in Vercel and must be verified with your provider.</p><div className="oz-form-actions"><button className="oz-button oz-button-light" disabled={busy}>Save business details</button></div></form>
}
