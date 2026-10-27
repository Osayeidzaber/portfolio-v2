"use client"

import { useState, useSyncExternalStore, type FormEvent } from "react"

const subscribeReady = () => () => {}
const clientReady = () => true
const serverReady = () => false

export function ProjectEnquiry({ email }: { email: string }) {
  const ready = useSyncExternalStore(subscribeReady, clientReady, serverReady)
  const [draft, setDraft] = useState<{ subject: string; body: string } | null>(null)
  const [copied, setCopied] = useState("")
  function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const values = new FormData(event.currentTarget)
    const name = String(values.get("name")).trim()
    const service = String(values.get("service"))
    setDraft({ subject: `OZ Studio enquiry / ${service}`, body: `Hi Osayeed,\n\nI'm ${name}. I'd like to discuss ${service.toLowerCase()}.\n\n${String(values.get("brief")).trim()}\n\nTiming: ${values.get("timing")}\nReply to: ${String(values.get("email")).trim()}\n\nThanks,\n${name}` })
    setCopied("")
  }
  async function copy() {
    if (!draft) return
    try { await navigator.clipboard.writeText(`${draft.subject}\n\n${draft.body}`); setCopied("Brief copied. Paste it into an email whenever you’re ready.") }
    catch { setCopied("Copy is unavailable here. Select the brief text below to copy it manually.") }
  }
  return <details className="oz-enquiry"><summary>Tell me about your project <span aria-hidden>+</span></summary><div className="oz-enquiry-content">
    <div><p className="oz-label">A FEW GOOD STARTING POINTS</p><h3>From a thought<br />to a <em>conversation.</em></h3><p>A short brief is plenty. This prepares an email for you to review and send from your own email app.</p></div>
    <form className="oz-enquiry-form" onSubmit={prepare} onChange={() => { setDraft(null); setCopied("") }}>
      <div className="oz-form-grid"><label>Your name<input name="name" required maxLength={100} autoComplete="name" /></label><label>Your email<input name="email" type="email" required maxLength={254} autoComplete="email" /></label></div>
      <div className="oz-form-grid"><label>What are you making?<select name="service"><option>A website</option><option>A Shopify storefront</option><option>A dashboard or tool</option><option>Something else</option></select></label><label>When are you thinking?<select name="timing"><option>Still exploring</option><option>Within a month</option><option>Within three months</option><option>Flexible</option></select></label></div>
      <label>A little about the idea<textarea name="brief" required maxLength={1800} rows={4} placeholder="What should it do, who is it for, and what do you have in mind?" /></label>
      <button className="oz-button oz-button-light" type="submit" disabled={!ready}>Prepare enquiry <span aria-hidden>↗</span></button>
      {!ready && <p>Use the email link above to get in touch directly.</p>}
      {draft && <div className="oz-enquiry-draft"><p className="oz-label" role="status">YOUR EMAIL DRAFT IS READY</p><pre>{draft.body}</pre><div className="oz-row-actions"><a className="oz-button oz-button-light" href={`mailto:${email}?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}`}>Open email draft ↗</a><button type="button" className="oz-small-button" onClick={copy}>Copy brief</button></div></div>}
      {copied && <p role="status">{copied}</p>}
    </form>
  </div></details>
}
