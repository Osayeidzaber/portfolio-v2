import { invoiceArchiveSchema, invoiceSchema, type Billing, type Invoice, type StudioData } from "./schema"

export const STUDIO_STORAGE_LIMIT = 750_000
export const studioStorageBytes = (data: StudioData) => new TextEncoder().encode(JSON.stringify(data, null, 2) + "\n").length

/** Reuse the latest billing details without maintaining a second client database. */
export function previousClients(invoices: Invoice[]): Billing[] {
  const clients = new Map<string, Billing>()
  for (const invoice of [...invoices].sort((a, b) => b.createdAt.localeCompare(a.createdAt))) {
    const key = invoice.client.email.toLowerCase()
    if (!clients.has(key)) clients.set(key, { ...invoice.client })
  }
  return [...clients.values()].sort((a, b) => (a.company || a.name).localeCompare(b.company || b.name))
}

export const canArchive = (invoice: Invoice) => (invoice.status === "paid" || invoice.status === "void") && (!invoice.emailAttempt || Boolean(invoice.emailAttempt.acceptedAt))
export function archiveInvoices(data: StudioData, ids: string[]) {
  const unique = new Set(ids)
  const records = data.invoices.filter((invoice) => unique.has(invoice.id))
  if (!records.length || records.length !== unique.size || records.some((invoice) => !canArchive(invoice))) throw new Error("Only closed invoices without an unresolved email can be archived. Reload your workspace.")
  const numbers = [...new Set([...(data.archivedNumbers ?? []), ...records.map((invoice) => invoice.number)])]
  if (numbers.length > 5000) throw new Error("The archive index is full. Export your records before continuing.")
  data.archivedNumbers = numbers
  data.invoices = data.invoices.filter((invoice) => !unique.has(invoice.id))
}

/** Add closed snapshots only. Never replace existing invoices, settings or services. */
export function restoreArchive(data: StudioData, raw: unknown) {
  const archive = invoiceArchiveSchema.parse(raw)
  const additions: Invoice[] = []
  for (const invoice of archive.invoices) {
    if (!canArchive(invoice)) throw new Error("This archive contains an open invoice or an unresolved email.")
    const same = data.invoices.find((current) => current.id === invoice.id)
    if (same) {
      if (JSON.stringify(invoiceSchema.parse(same)) !== JSON.stringify(invoice)) throw new Error(`Invoice ${invoice.number} differs from the existing record. Nothing was restored.`)
      continue
    }
    if ([...data.invoices, ...additions].some((current) => current.id === invoice.id || current.number.toLowerCase() === invoice.number.toLowerCase())) throw new Error(`Duplicate invoice ${invoice.number}. Nothing was restored.`)
    additions.push(invoice)
  }
  if (data.invoices.length + additions.length > 1000) throw new Error("Restore would exceed 1,000 active records. Restore a smaller archive.")
  const restored = new Set(additions.map((invoice) => invoice.number.toLowerCase()))
  data.invoices.push(...additions)
  data.archivedNumbers = data.archivedNumbers?.filter((number) => !restored.has(number.toLowerCase()))
  data.nextInvoice = Math.max(data.nextInvoice, archive.nextInvoice)
  return additions.length
}
