"use client"

import { useState } from "react"
import { invoiceArchiveSchema, type StudioData } from "@/lib/studio/schema"
import { canArchive, STUDIO_STORAGE_LIMIT, studioStorageBytes } from "@/lib/studio/workflows"

function download(name: string, value: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2) + "\n"], { type: "application/json" }))
  const link = document.createElement("a"); link.href = url; link.download = name; link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function DataTools({ data, busy, persistenceEnabled, onArchive, onRestore }: { data: StudioData; busy: boolean; persistenceEnabled: boolean; onArchive: (ids: string[]) => void; onRestore: (value: unknown) => void }) {
  const [downloaded, setDownloaded] = useState(false)
  const [restore, setRestore] = useState<ReturnType<typeof invoiceArchiveSchema.parse> | null>(null)
  const [error, setError] = useState("")
  const bytes = studioStorageBytes(data)
  const percent = Math.min(100, Math.round(bytes / STUDIO_STORAGE_LIMIT * 100))
  const closed = data.invoices.filter(canArchive)
  return <section className="oz-panel oz-settings oz-data-tools"><h2>Storage & archives</h2><div className="oz-storage-summary"><strong>{(bytes / 1000).toFixed(1)} / 750 KB</strong><span>{percent}% used</span></div><progress aria-label="Private invoice storage used" value={bytes} max={STUDIO_STORAGE_LIMIT} /><p className="oz-form-hint">{bytes >= 600_000 ? "Storage is getting full. Download an archive and move closed invoices out of the active ledger." : "Your private ledger contains billing records. Archive exports include those details; keep the downloaded files somewhere private."}</p>
    <button type="button" className="oz-button" onClick={() => download("oz-studio-backup.json", data)}>Download complete backup</button>
    <details><summary>Archive closed invoices ({closed.length})</summary><p>Only fully paid and void invoices are eligible. Drafts, unpaid invoices and unresolved emails stay in the active ledger. Archived invoice numbers remain reserved.</p><ul className="oz-archive-list">{closed.map((invoice) => <li key={invoice.id}>{invoice.number} · {invoice.client.company || invoice.client.name} · {invoice.status}</li>)}</ul><div className="oz-row-actions"><button type="button" className="oz-button" disabled={!closed.length || busy} onClick={() => { download("oz-studio-closed-invoices.json", { version: 1, kind: "oz-studio-archive", nextInvoice: data.nextInvoice, invoices: closed }); setDownloaded(true) }}>1. Download closed-invoice archive</button><button type="button" className="oz-button" disabled={!closed.length || !downloaded || busy || !persistenceEnabled} onClick={() => { if (window.confirm(`Have you saved the archive file? Move these ${closed.length} closed invoices out of the active ledger? You will need the downloaded file to restore them.`)) onArchive(closed.map((invoice) => invoice.id)) }}>2. Archive downloaded records</button></div></details>
    <details><summary>Restore an invoice archive</summary><p>Import a closed-invoice archive exported above. Existing invoices, business settings and service presets are preserved.</p><label className="oz-archive-upload">Choose archive file<input type="file" accept=".json,application/json" disabled={busy || !persistenceEnabled} onChange={async (event) => {
      const file = event.target.files?.[0]; setRestore(null); setError("")
      if (!file) return
      try { if (file.size > STUDIO_STORAGE_LIMIT) throw new Error("Choose an archive smaller than 750 KB."); const parsed = invoiceArchiveSchema.parse(JSON.parse(await file.text())); if (parsed.invoices.some((invoice) => !canArchive(invoice))) throw new Error("Choose a closed-invoice archive, without open invoices or unresolved sends."); setRestore(parsed) }
      catch (error) { setError(error instanceof Error && !("issues" in error) ? error.message : "This file is not a valid OZ Studio closed-invoice archive.") }
    }} /></label>{restore && <div><p>{restore.invoices.length} records ready to review.</p><ul className="oz-archive-list">{restore.invoices.map((invoice, index) => <li key={`${invoice.id}-${index}`}>{invoice.number} · {invoice.client.company || invoice.client.name} · {invoice.status}</li>)}</ul><button type="button" className="oz-button" disabled={busy} onClick={() => { if (window.confirm(`Restore these ${restore.invoices.length} closed invoice records? Existing records will never be replaced.`)) onRestore(restore) }}>Restore reviewed archive</button></div>}{error && <p role="alert">{error}</p>}</details>
  </section>
}
