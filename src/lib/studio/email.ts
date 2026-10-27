import "server-only"

import { emailPayloadSchema, type EmailPayload } from "./schema"

export function emailConfiguration() {
  return { ready: Boolean(process.env.RESEND_API_KEY && process.env.STUDIO_EMAIL_FROM), sender: process.env.STUDIO_EMAIL_FROM || "" }
}

export async function deliverInvoiceEmail(payload: EmailPayload, key: string): Promise<string> {
  if (!emailConfiguration().ready) throw new Error("Set RESEND_API_KEY and STUDIO_EMAIL_FROM using a verified sender before sending invoices.")
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST", cache: "no-store", signal: AbortSignal.timeout(20_000),
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": `oz-invoice/${key}` },
    body: JSON.stringify(emailPayloadSchema.parse(payload)),
  })
  if (!response.ok) throw new Error(`The email provider did not accept this request (${response.status}). Check your verified sender, API key and provider dashboard, then retry the same invoice.`)
  const result = await response.json() as { id?: string }
  if (!result.id) throw new Error("The provider returned no message ID. Check its dashboard before retrying this invoice.")
  return result.id
}
