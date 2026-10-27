import { describe, expect, it } from "vitest"
import { emptyStudio, saveInvoice, invoiceArchiveSchema } from "@/lib/studio/schema"
import { archiveInvoices, previousClients, restoreArchive, studioStorageBytes } from "@/lib/studio/workflows"
import { clearAllInvoiceRecovery, clearInvoiceRecovery, readInvoiceRecovery, recoveryGeneration, writeInvoiceRecovery, type RecoveryFields } from "@/lib/studio/recovery"

const input = { title: "Preview", client: { name: "Preview Client", company: "", email: "client@example.com", address: "" }, issueDate: "2026-10-27", dueDate: "2026-10-28", currency: "BDT" as const, items: [{ description: "Service", quantity: 1, unitPrice: 10000 }], discount: 0, taxBasisPoints: 0, notes: "" }
const id = "aaaabbbb-cccc-4000-8000-111122223333"
const fields: RecoveryFields = { title: "Still typing", number: "OZ-0001", client: { ...input.client, email: "unfinished@" }, issueDate: "", dueDate: "", design: "noir", currency: "BDT", items: [{ description: "", quantity: "", price: "invalid" }], discount: "", tax: "", notes: "", emailSubject: "", emailMessage: "" }
class MemoryStorage implements Storage {
  private values = new Map<string, string>()
  get length() { return this.values.size }
  clear() { this.values.clear() }
  key(index: number) { return [...this.values.keys()][index] ?? null }
  getItem(key: string) { return this.values.get(key) ?? null }
  removeItem(key: string) { this.values.delete(key) }
  setItem(key: string, value: string) { this.values.set(key, value) }
}
function fixture() {
  const data = emptyStudio()
  const invoice = saveInvoice(data, input, id, "2026-10-27T12:00:00.000Z")
  invoice.status = "paid"
  invoice.payment = { method: "bKash", date: "2026-10-27", reference: "TEST-REFERENCE" }
  return { data, invoice }
}

describe("invoice shortcuts and archives", () => {
  it("uses the latest billing identity per email without mutating the invoice", () => {
    const { invoice } = fixture()
    const newer = { ...invoice, createdAt: "2026-10-28T12:00:00.000Z", client: { ...invoice.client, name: "Updated name", email: "CLIENT@example.com" } }
    const clients = previousClients([invoice, newer])
    expect(clients).toHaveLength(1)
    expect(clients[0].name).toBe("Updated name")
    clients[0].name = "Changed"
    expect(newer.client.name).toBe("Updated name")
  })
  it("exports, archives and restores closed snapshots while reserving invoice numbers", () => {
    const { data, invoice } = fixture()
    const archive = invoiceArchiveSchema.parse({ version: 1, kind: "oz-studio-archive", nextInvoice: data.nextInvoice, invoices: [invoice] })
    const before = structuredClone(invoice)
    archiveInvoices(data, [id])
    expect(data.invoices).toEqual([])
    expect(data.archivedNumbers).toEqual(["OZ-0001"])
    expect(() => saveInvoice(data, { ...input, number: "oz-0001" }, "bbbbbbbb-cccc-4000-8000-111122223333", invoice.createdAt)).toThrow("already in use")
    expect(restoreArchive(data, archive)).toBe(1)
    expect(data.invoices[0]).toEqual(before)
    expect(data.invoices[0].payment?.reference).toBe("TEST-REFERENCE")
    expect(data.archivedNumbers).toEqual([])
    expect(restoreArchive(data, archive)).toBe(0)
    expect(data.nextInvoice).toBe(2)
  })
  it("refuses open invoices, unresolved sends and conflicting restores without changing data", () => {
    const { data, invoice } = fixture()
    invoice.status = "issued"
    expect(() => archiveInvoices(data, [id])).toThrow("Only closed")
    invoice.status = "paid"
    invoice.emailAttempt = { key: id, startedAt: invoice.createdAt }
    expect(() => archiveInvoices(data, [id])).toThrow("Only closed")
    delete invoice.emailAttempt
    const archive = { version: 1, kind: "oz-studio-archive", nextInvoice: 50, invoices: [{ ...invoice, title: "Changed historical document" }] }
    const before = structuredClone(data)
    expect(() => restoreArchive(data, archive)).toThrow("differs")
    expect(data).toEqual(before)
  })
  it("rejects duplicate numbers and keeps numbering monotonic when importing old records", () => {
    const { data, invoice } = fixture()
    const before = structuredClone(data)
    expect(() => restoreArchive(data, { version: 1, kind: "oz-studio-archive", nextInvoice: 1, invoices: [{ ...invoice, id: "bbbbbbbb-cccc-4000-8000-111122223333" }] })).toThrow("Duplicate")
    expect(data).toEqual(before)
    expect(studioStorageBytes(data)).toBe(Buffer.byteLength(JSON.stringify(data, null, 2) + "\n"))
  })
})

describe("device-only invoice recovery", () => {
  it("round-trips incomplete typing and keeps saved drafts separate", () => {
    const storage = new MemoryStorage()
    const now = "2026-10-28T10:00:00.000Z"
    writeInvoiceRecovery(storage, undefined, fields, now)
    writeInvoiceRecovery(storage, id, { ...fields, title: "Existing draft" }, now)
    expect(readInvoiceRecovery(storage, undefined, Date.parse(now))?.fields).toEqual(fields)
    expect(readInvoiceRecovery(storage, id, Date.parse(now))?.fields.title).toBe("Existing draft")
    clearInvoiceRecovery(storage)
    expect(readInvoiceRecovery(storage, undefined, Date.parse(now))).toBeNull()
    expect(readInvoiceRecovery(storage, id, Date.parse(now))).not.toBeNull()
  })
  it("expires old recovery copies and removes malformed data", () => {
    const storage = new MemoryStorage()
    writeInvoiceRecovery(storage, undefined, fields, "2026-10-01T00:00:00.000Z")
    expect(readInvoiceRecovery(storage, undefined, Date.parse("2026-10-28T00:00:00.000Z"))).toBeNull()
    storage.setItem("oz.invoice.recovery.v1:new", "bad JSON")
    expect(readInvoiceRecovery(storage, undefined, Date.now())).toBeNull()
    expect(storage.length).toBe(0)
  })
  it("clears recovery on sign out without removing unrelated browser preferences", () => {
    const storage = new MemoryStorage()
    writeInvoiceRecovery(storage, undefined, fields, "2026-10-28T10:00:00.000Z")
    storage.setItem("effects", "reduced")
    const before = recoveryGeneration()
    clearAllInvoiceRecovery(storage)
    expect(recoveryGeneration()).toBeGreaterThan(before)
    expect(storage.getItem("oz.invoice.recovery.v1:new")).toBeNull()
    expect(storage.getItem("effects")).toBe("reduced")
  })
})
