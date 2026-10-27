import { z } from "zod"
import { invoiceDesignIds } from "./designs"
import { currencySchema } from "./schema"

const raw = (max: number) => z.string().max(max)
export const recoveryFieldsSchema = z.object({
  title: raw(120), number: raw(40), design: z.enum(invoiceDesignIds), issueDate: raw(10), dueDate: raw(10), currency: currencySchema,
  client: z.object({ name: raw(100), company: raw(100), email: raw(254), address: raw(500) }),
  items: z.array(z.object({ description: raw(180), quantity: raw(100), price: raw(100) })).min(1).max(20),
  discount: raw(100), tax: raw(100), notes: raw(1200), emailSubject: raw(180), emailMessage: raw(2000),
})
export type RecoveryFields = z.infer<typeof recoveryFieldsSchema>
const envelope = z.object({ version: z.literal(1), savedAt: z.iso.datetime(), fields: recoveryFieldsSchema })
const prefix = "oz.invoice.recovery.v1:"
const key = (id?: string) => prefix + (id || "new")
let generation = 0
export const recoveryGeneration = () => generation

export function readInvoiceRecovery(storage: Storage, id: string | undefined, now: number) {
  const value = storage.getItem(key(id))
  if (!value) return null
  try {
    const recovery = envelope.parse(JSON.parse(value))
    const age = now - Date.parse(recovery.savedAt)
    if (age < 0 || age > 7 * 24 * 60 * 60_000) { storage.removeItem(key(id)); return null }
    return recovery
  } catch { storage.removeItem(key(id)); return null }
}
export function writeInvoiceRecovery(storage: Storage, id: string | undefined, fields: RecoveryFields, now: string) {
  storage.setItem(key(id), JSON.stringify(envelope.parse({ version: 1, savedAt: now, fields })))
}
export function clearInvoiceRecovery(storage: Storage, id?: string) { generation++; storage.removeItem(key(id)) }
export function clearAllInvoiceRecovery(storage: Storage) {
  generation++
  for (let index = storage.length - 1; index >= 0; index--) {
    const item = storage.key(index)
    if (item?.startsWith(prefix)) storage.removeItem(item)
  }
}
