"use client"

import { useState } from "react"
import type { Billing } from "@/lib/studio/schema"
import { useConfirm } from "@/components/admin/confirm"

export function ClientPicker({ clients, current, onChange }: { clients: Billing[]; current: Billing; onChange: (client: Billing) => void }) {
  const confirm = useConfirm()
  const [query, setQuery] = useState("")
  const filtered = clients.filter((client) => `${client.name} ${client.company} ${client.email}`.toLowerCase().includes(query.toLowerCase()))
  if (!clients.length) return null
  async function choose(email: string) {
    const selected = clients.find((client) => client.email === email)
    if (!selected) return
    // Snapshot the choice before opening a dialog or resetting the select.
    const next = { ...selected }
    const occupied = Object.values(current).some((value) => value.trim())
    if (occupied && !(await confirm({ title: "Replace billing details?", body: `Use the most recent billing details for ${next.name} (${next.email})? This replaces the current name, company, email and billing address.`, confirm: "Use this client" }))) return
    onChange(next)
  }
  return <div className="oz-client-lookup"><label>Find a previous client<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, company or email" /></label><label>Use a previous client<select aria-label="Use a previous client" defaultValue="" onChange={(event) => {
    const email = event.currentTarget.value
    event.currentTarget.value = ""
    void choose(email)
  }}><option value="">Choose a previous client…</option>{filtered.map((client) => <option key={client.email} value={client.email}>{client.company || client.name} · {client.email}</option>)}</select></label><p className="oz-form-hint">{filtered.length} matching {filtered.length === 1 ? "client" : "clients"} · most recent billing details</p></div>
}
