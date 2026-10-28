import { displayDate, type Invoice } from "@/lib/studio/schema"

const labels = { draft_saved: "Draft saved", issued: "Invoice issued", email_accepted: "Email accepted by Resend", payment_recorded: "Full payment recorded", voided: "Invoice voided" }
export function InvoiceActivity({ invoice }: { invoice: Invoice }) {
  const events = [{ label: "Invoice created", at: invoice.createdAt }, ...(invoice.activity ?? []).map((event) => ({ label: labels[event.type], at: event.at }))]
  if (invoice.emailAttempt && !invoice.emailAttempt.acceptedAt) events.push({ label: "Email submission pending confirmation", at: invoice.emailAttempt.startedAt })
  if (invoice.emailAttempt?.acceptedAt && !invoice.activity?.some((event) => event.type === "email_accepted")) events.push({ label: "Email accepted by Resend", at: invoice.emailAttempt.acceptedAt })
  if (invoice.paidAt && !invoice.activity?.some((event) => event.type === "payment_recorded")) events.push({ label: "Full payment recorded", at: invoice.paidAt })
  events.sort((a, b) => b.at.localeCompare(a.at))
  return <section className="oz-panel oz-activity"><p className="oz-label">THE RECORD / {invoice.number}</p><h2>Invoice activity</h2><p className="oz-form-hint">Recorded actions only. Older invoices may have a shorter history.</p><ol>{events.map((event, index) => <li key={`${event.at}-${index}`}><span aria-hidden className="oz-activity-dot" /><div><strong>{event.label}</strong><time dateTime={event.at}>{new Date(event.at).toLocaleString("en-GB", { timeZone: "Asia/Dhaka", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })} (Dhaka)</time></div></li>)}</ol>{invoice.payment && <div className="oz-payment-facts"><h3>Payment details</h3><dl><div><dt>Payment date</dt><dd>{displayDate(invoice.payment.date)}</dd></div><div><dt>Method</dt><dd>{invoice.payment.method}</dd></div><div><dt>Reference</dt><dd>{invoice.payment.reference || "Not recorded"}</dd></div></dl></div>}</section>
}
