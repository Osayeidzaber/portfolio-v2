import "server-only"
import { z } from "zod"

import { emailPayloadSchema, type EmailPayload } from "./schema"

export function emailConfiguration() {
  return { ready: Boolean(process.env.RESEND_API_KEY && process.env.STUDIO_EMAIL_FROM), sender: process.env.STUDIO_EMAIL_FROM || "" }
}

/** One read, explicitly requested in admin. No polling or background worker. */
export async function retrieveEmailStatus(id: string): Promise<string> {
  if (!process.env.RESEND_API_KEY) throw new Error("Configure Resend before checking delivery.")
  const response = await fetch(`https://api.resend.com/emails/${encodeURIComponent(id)}`, {
    cache: "no-store", signal: AbortSignal.timeout(15_000), headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
  })
  if (!response.ok) throw new Error(`Could not check delivery (${response.status}). Check that the Resend key can read this email, or view it in the Resend dashboard.`)
  const result = z.object({ id: z.string(), last_event: z.string() }).parse(await response.json())
  if (result.id !== id) throw new Error("The provider returned a different email. No status was changed.")
  const known = ["sent", "delivered", "delivery_delayed", "bounced", "complained", "opened", "clicked", "failed", "scheduled", "canceled", "suppressed"]
  return known.includes(result.last_event) ? result.last_event : "unknown"
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
