"use server"

import { randomUUID } from "node:crypto"
import { z } from "zod"

import { isAuthenticated } from "@/lib/auth/session"
import { emailConfiguration, deliverInvoiceEmail } from "@/lib/studio/email"
import { invoiceEmail } from "@/lib/studio/invoice-document"
import { paymentDetails, businessSchema, saveInvoice, type Invoice } from "@/lib/studio/schema"
import { readStudio, writeStudio, studioStorageMode, StudioConflict, type StudioSnapshot } from "@/lib/studio/store"
import { siteUrl } from "@/lib/env"

export type WorkspaceResult = { ok: true; snapshot: StudioSnapshot } | { ok: false; error: string; conflict?: boolean }
async function guard() { if (!(await isAuthenticated())) throw new Error("Your session has expired. Sign in again.") }
const fail = (error: unknown): { ok: false; error: string; conflict?: boolean } => ({
  ok: false, error: error instanceof z.ZodError ? error.issues[0]?.message || "Check the highlighted fields." : error instanceof Error ? error.message : "The request could not be completed.", conflict: error instanceof StudioConflict,
})
async function current(sha: string | null) {
  await guard()
  const snapshot = await readStudio()
  if (snapshot.sha !== sha) throw new StudioConflict()
  return snapshot
}

export async function loadWorkspace() {
  try {
    await guard()
    const mode = studioStorageMode()
    return { ok: true as const, snapshot: mode === "unconfigured" ? null : await readStudio(), mode, email: emailConfiguration() }
  } catch (error) { return fail(error) }
}

export async function saveInvoiceAction(raw: unknown, sha: string | null): Promise<WorkspaceResult> {
  try {
    const { data } = await current(sha)
    saveInvoice(data, raw, randomUUID(), new Date().toISOString())
    return { ok: true, snapshot: await writeStudio(data, sha) }
  } catch (error) { return fail(error) }
}

export async function saveBusinessAction(raw: unknown, sha: string | null): Promise<WorkspaceResult> {
  try {
    const { data } = await current(sha)
    data.settings = businessSchema.parse(raw)
    return { ok: true, snapshot: await writeStudio(data, sha) }
  } catch (error) { return fail(error) }
}

export async function changeInvoiceStatus(id: string, status: "paid" | "void", sha: string | null): Promise<WorkspaceResult> {
  try {
    const { data } = await current(sha)
    const next = z.enum(["paid", "void"]).parse(status)
    const invoice = data.invoices.find((item) => item.id === id)
    if (!invoice) throw new Error("Invoice not found.")
    if (invoice.status === "paid" || invoice.status === "void") throw new Error("This invoice is already closed.")
    if (next === "paid" && invoice.status !== "issued") throw new Error("Issue this invoice before recording payment.")
    if (invoice.emailAttempt && !invoice.emailAttempt.acceptedAt) throw new Error("Reconcile the pending email with the provider before closing this invoice.")
    invoice.status = next
    if (next === "paid") invoice.paidAt = new Date().toISOString()
    return { ok: true, snapshot: await writeStudio(data, sha) }
  } catch (error) { return fail(error) }
}

/** Only this explicit review-and-send action contacts a recipient. No background mailing. */
export async function sendInvoiceAction(id: string, sha: string | null, attachment?: string): Promise<WorkspaceResult> {
  let claimed: StudioSnapshot | undefined
  try {
    const snapshot = await current(sha)
    const invoice = snapshot.data.invoices.find((item) => item.id === id)
    if (!invoice || invoice.status === "paid" || invoice.status === "void") throw new Error("This invoice cannot be sent.")
    if (invoice.emailAttempt?.acceptedAt) return { ok: true, snapshot }
    const email = emailConfiguration()
    if (!email.ready || !z.email().safeParse(email.sender).success) throw new Error("Configure RESEND_API_KEY and STUDIO_EMAIL_FROM as a verified email address before sending.")
    if (!paymentDetails(invoice.business).trim()) throw new Error("Add payment instructions in Settings, then save this draft again before sending.")
    if (invoice.emailAttempt && Date.now() - new Date(invoice.emailAttempt.startedAt).getTime() > 23 * 60 * 60_000) throw new Error("This pending send is older than the safe retry window. Check the provider dashboard before taking further action; no duplicate email has been sent.")
    if (!invoice.emailAttempt) {
      const content = z.string().max(600_000, "The PDF attachment is too large. Shorten the invoice and try again.").regex(/^[A-Za-z0-9+/]+={0,2}$/, "Generate and review the PDF attachment before sending.").parse(attachment)
      const bytes = Buffer.from(content, "base64")
      if (bytes.toString("base64") !== content || bytes.subarray(0, 5).toString() !== "%PDF-" || !bytes.subarray(-1024).toString().includes("%%EOF")) throw new Error("The attachment is not a complete PDF. Reopen the PDF viewer and retry.")
      invoice.emailAttempt = {
        key: randomUUID(), startedAt: new Date().toISOString(),
        payload: { ...invoiceEmail(invoice, email.sender, `${siteUrl}/oz-studio/logo-email.png`), attachments: [{ filename: `${invoice.number.replace(/[^A-Za-z0-9-]/g, "-")}.pdf`, content }] },
      }
      invoice.status = "issued"
      claimed = await writeStudio(snapshot.data, snapshot.sha)
    } else claimed = snapshot
    const savedInvoice = claimed.data.invoices.find((item) => item.id === id) as Invoice
    const attempt = savedInvoice.emailAttempt!
    if (!attempt.payload) throw new Error("The pending email has no saved request. Reconcile it with the provider before continuing.")
    const messageId = await deliverInvoiceEmail(attempt.payload, attempt.key)
    const latest = await readStudio()
    const target = latest.data.invoices.find((item) => item.id === id)
    if (!target?.emailAttempt || target.emailAttempt.key !== attempt.key) throw new Error("The provider accepted the email, but the record changed. Reload and reconcile the pending send.")
    target.emailAttempt.acceptedAt = new Date().toISOString()
    target.emailAttempt.providerId = messageId
    delete target.emailAttempt.payload // Keep the exact request only while a safe retry may be needed.
    return { ok: true, snapshot: await writeStudio(latest.data, latest.sha) }
  } catch (error) {
    const result = fail(error)
    if (claimed) result.error += " Reload the workspace before retrying. The saved pending send will reuse the original request."
    return result
  }
}

export async function issueInvoiceAction(id: string, sha: string | null): Promise<WorkspaceResult> {
  try {
    const { data } = await current(sha)
    const invoice = data.invoices.find((item) => item.id === id)
    if (!invoice || invoice.status !== "draft") throw new Error("Choose a saved draft to issue.")
    if (!paymentDetails(invoice.business).trim()) throw new Error("Add payment instructions in Settings and save the draft again before issuing.")
    invoice.status = "issued"
    return { ok: true, snapshot: await writeStudio(data, sha) }
  } catch (error) { return fail(error) }
}
