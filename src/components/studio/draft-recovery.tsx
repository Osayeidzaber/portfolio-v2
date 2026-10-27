"use client"

import { useEffect, useState } from "react"
import { clearInvoiceRecovery, readInvoiceRecovery, writeInvoiceRecovery, recoveryGeneration, type RecoveryFields } from "@/lib/studio/recovery"

export function DraftRecovery({ id, fields, onRestore }: { id?: string; fields: RecoveryFields; onRestore: (fields: RecoveryFields) => void }) {
  const [enabled, setEnabled] = useState(false)
  const [ready, setReady] = useState(false)
  const [candidate, setCandidate] = useState<ReturnType<typeof readInvoiceRecovery>>(null)
  const [notice, setNotice] = useState("")
  const signature = JSON.stringify(fields)
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try { setCandidate(readInvoiceRecovery(localStorage, id, Date.now())) }
      catch { setNotice("This browser cannot keep a recovery copy. You can still save drafts normally.") }
      setReady(true)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [id])
  useEffect(() => {
    if (!enabled || !ready || candidate) return
    const generation = recoveryGeneration()
    const timer = window.setTimeout(() => {
      if (generation !== recoveryGeneration()) return
      try { writeInvoiceRecovery(localStorage, id, JSON.parse(signature), new Date().toISOString()); setNotice("Recovery copy updated on this device. Your invoice has not been saved to the ledger.") }
      catch { setNotice("The recovery copy could not be updated. Save your draft to keep these changes.") }
    }, 350)
    return () => window.clearTimeout(timer)
  }, [enabled, ready, candidate, signature, id])
  return <section className="oz-recovery" aria-label="Draft recovery">
    {candidate ? <><p>A recovery copy from {new Date(candidate.savedAt).toLocaleString("en-GB", { timeZone: "Asia/Dhaka" })} (Dhaka) is available on this device. Review it before saving over a ledger draft.</p><div className="oz-row-actions"><button type="button" className="oz-button" onClick={() => { onRestore(candidate.fields); setCandidate(null); setEnabled(true) }}>Restore typing</button><button type="button" className="oz-small-button" onClick={() => { try { clearInvoiceRecovery(localStorage, id) } catch {} setCandidate(null); setEnabled(false); setNotice("Recovery copy discarded.") }}>Discard recovery copy</button></div></> : <label className="oz-check"><input type="checkbox" checked={enabled} onChange={(event) => { setEnabled(event.target.checked); if (!event.target.checked) { try { clearInvoiceRecovery(localStorage, id) } catch {} setNotice("Recovery copy removed from this device.") } }} />Keep a recovery copy on this device</label>}
    <p className="oz-form-hint">Optional. Includes client billing details, expires after seven days, and is cleared when you save successfully or sign out here.</p>
    {notice && <p className="oz-form-hint" role="status">{notice}</p>}
  </section>
}
