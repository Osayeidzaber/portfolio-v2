import { z } from "zod"
import { invoiceDesignIds } from "./designs"

export const currencySchema = z.enum(["BDT", "USD", "CAD", "EUR", "GBP"])
const text = (max: number) => z.string().trim().max(max)
const minor = z.number().int().min(0).max(100_000_000)
export const paymentMethodSchema = z.object({
  name: text(60).min(1, "Enter a payment method name."),
  details: text(400).min(1, "Add the account or payment details for each method."),
})

export const businessSchema = z.object({
  name: text(100).min(1), email: z.email().max(254), address: text(500),
  currency: currencySchema, paymentInstructions: text(1200), invoiceNote: text(1200),
  paymentMethods: z.array(paymentMethodSchema).max(5).optional(),
})
export const billingSchema = z.object({ name: text(100).min(1), company: text(100), email: z.email().max(254), address: text(500) })
export const lineSchema = z.object({ description: text(180).min(1), quantity: z.number().int().min(1).max(10_000), unitPrice: minor })
export const invoiceInputSchema = z.object({
  id: z.uuid().optional(), client: billingSchema, title: text(120).min(1),
  design: z.enum(invoiceDesignIds).optional(),
  number: z.string().trim().regex(/^[A-Za-z0-9][A-Za-z0-9/\-]{0,39}$/, "Use up to 40 letters, numbers, slashes or hyphens for the invoice number.").optional(),
  issueDate: z.iso.date(), dueDate: z.iso.date(), currency: currencySchema,
  items: z.array(lineSchema).min(1).max(20), discount: minor,
  taxBasisPoints: z.number().int().min(0).max(10_000), notes: text(1200),
}).refine((invoice) => invoice.dueDate >= invoice.issueDate, { message: "Due date must be on or after the issue date.", path: ["dueDate"] })

export const emailPayloadSchema = z.object({
  from: z.string(), to: z.array(z.email()).length(1), reply_to: z.email(),
  subject: z.string(), html: z.string(), text: z.string(),
  attachments: z.array(z.object({ filename: z.string(), content: z.string() })).max(1),
})
export const invoiceSchema = invoiceInputSchema.safeExtend({
  id: z.uuid(), number: z.string(), createdAt: z.iso.datetime(),
  status: z.enum(["draft", "issued", "paid", "void"]),
  business: businessSchema,
  paidAt: z.iso.datetime().optional(),
  emailAttempt: z.object({
    key: z.uuid(), startedAt: z.iso.datetime(), acceptedAt: z.iso.datetime().optional(),
    providerId: z.string().optional(), payload: emailPayloadSchema.optional(),
  }).optional(),
})
export const studioSchema = z.object({
  version: z.literal(1), nextInvoice: z.number().int().min(1), settings: businessSchema,
  invoices: z.array(invoiceSchema).max(1000),
})

export type Business = z.infer<typeof businessSchema>
export type PaymentMethod = z.infer<typeof paymentMethodSchema>

/** One representation keeps payment details consistent across every invoice format. */
export function paymentDetails(business: Business): string {
  return [...(business.paymentMethods ?? []).map((method) => `${method.name}: ${method.details}`), business.paymentInstructions].filter((value) => value.trim()).join("\n")
}
export type Billing = z.infer<typeof billingSchema>
export type Invoice = z.infer<typeof invoiceSchema>
export type InvoiceInput = z.infer<typeof invoiceInputSchema>
export type StudioData = z.infer<typeof studioSchema>
export type Currency = z.infer<typeof currencySchema>
export type EmailPayload = z.infer<typeof emailPayloadSchema>

export function emptyStudio(): StudioData {
  return {
    version: 1, nextInvoice: 1, invoices: [],
    settings: { name: "OZ Studio", email: "mail@zaber.tech", address: "", currency: "BDT", paymentInstructions: "", invoiceNote: "Thank you for working with OZ Studio." },
  }
}

/** Values are stored in minor units; sums never use floating-point currency arithmetic. */
export function invoiceTotals(invoice: Pick<InvoiceInput, "items" | "discount" | "taxBasisPoints">) {
  const subtotal = invoice.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
  if (!Number.isSafeInteger(subtotal) || subtotal > 1_000_000_000_000) throw new Error("Invoice total is too large.")
  if (invoice.discount > subtotal) throw new Error("Discount cannot exceed the subtotal.")
  const taxable = subtotal - invoice.discount
  const tax = Math.round(taxable * invoice.taxBasisPoints / 10_000)
  return { subtotal, discount: invoice.discount, tax, total: taxable + tax }
}

export function money(amount: number, currency: Currency) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency, currencyDisplay: "code" }).format(amount / 100)
}

export function toMinor(value: string): number {
  if (!/^\d+(\.\d{0,2})?$/.test(value)) throw new Error("Enter an amount with up to two decimal places.")
  const [whole, decimals = ""] = value.split(".")
  const result = Number(whole) * 100 + Number(decimals.padEnd(2, "0"))
  if (!Number.isSafeInteger(result) || result > 100_000_000) throw new Error("Amount is too large.")
  return result
}

export function displayDate(value: string) {
  if (!value) return "No due date"
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(value.length === 10 ? `${value}T12:00:00Z` : value))
}

/** Issued invoices are immutable snapshots, even when client or business details change. */
export function saveInvoice(data: StudioData, raw: unknown, id: string, createdAt: string): Invoice {
  const input = invoiceInputSchema.parse(raw)
  invoiceTotals(input)
  const existing = input.id ? data.invoices.find((invoice) => invoice.id === input.id) : undefined
  if (input.id && !existing) throw new Error("Invoice not found.")
  if (existing && existing.status !== "draft") throw new Error("Issued invoices are locked. Create a new draft instead.")
  const number = input.number || existing?.number || `OZ-${String(data.nextInvoice).padStart(4, "0")}`
  if (data.invoices.some((invoice) => invoice.number.toLowerCase() === number.toLowerCase() && invoice.id !== existing?.id)) throw new Error("That invoice number is already in use.")
  const invoice: Invoice = {
    ...input, id: existing?.id ?? id,
    number,
    design: input.design ?? existing?.design ?? (existing ? "signature" : "noir"),
    createdAt: existing?.createdAt ?? createdAt,
    status: "draft", client: { ...input.client }, business: { ...data.settings, ...(data.settings.paymentMethods ? { paymentMethods: data.settings.paymentMethods.map((method) => ({ ...method })) } : {}) },
  }
  if (existing) data.invoices[data.invoices.indexOf(existing)] = invoice
  else { data.invoices.push(invoice); data.nextInvoice += 1 }
  return invoice
}
