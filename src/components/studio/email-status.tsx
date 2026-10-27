import type { Invoice } from "@/lib/studio/schema"

export function InvoiceEmailStatus({ invoice, compact = false }: { invoice: Invoice; compact?: boolean }) {
  const attempt = invoice.emailAttempt
  const accepted = attempt?.acceptedAt
  const timestamp = accepted ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Dhaka" }).format(new Date(accepted)) : ""
  const delivery = attempt?.delivery
  if (compact) return <p className="oz-email-status" data-email-status={accepted ? "accepted" : attempt ? "pending" : "not-sent"}>{accepted ? <>Email accepted · <time dateTime={accepted}>{timestamp}</time> (Dhaka){delivery && ` · ${delivery.event.replaceAll("_", " ")}`}</> : attempt ? "Email send unconfirmed · open to review" : "Email not sent"}</p>
  return <div className="oz-email-receipt" data-email-status={accepted ? "accepted" : attempt ? "pending" : "not-sent"}>
    <strong>{accepted ? "Email accepted by Resend" : attempt ? "Email send awaiting confirmation" : "Email has not been sent"}</strong>
    {accepted ? <><p>To {invoice.client.email} · <time dateTime={accepted}>{timestamp}</time> (Dhaka)</p><p>Invoice PDF attached · {invoice.number.replace(/[^A-Za-z0-9-]/g, "-")}.pdf</p><p className="oz-form-hint">Message ID: {attempt.providerId}. Acceptance confirms submission. Check Resend for delivery or bounce status.</p>{delivery && <p><strong>Latest provider event: {delivery.event.replaceAll("_", " ")}</strong><br />Checked {new Date(delivery.checkedAt).toLocaleString("en-GB", { timeZone: "Asia/Dhaka" })} (Dhaka).{delivery.event === "delivered" && " Delivered means accepted by the recipient’s mail server."}</p>}</> : <p className="oz-form-hint">{attempt ? "The saved request may still be pending. Reload before retrying; retries use the same request to prevent duplicates within the retry window." : "Review the saved invoice and recipient, then use Send to client. Saving or downloading does not send an email."}</p>}
  </div>
}
