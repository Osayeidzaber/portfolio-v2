"use client"

import { useEffect, useRef, useState } from "react"
import type { Invoice } from "@/lib/studio/schema"

export function QuickActions({ invoices, onCreate, onNavigate, onOpen }: { invoices: Invoice[]; onCreate: () => void; onNavigate: (tab: "overview" | "invoices" | "settings" | "reports") => void; onOpen: (id: string) => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const search = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState("")
  function open() { setQuery(""); dialog.current?.showModal(); search.current?.focus() }
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (document.querySelector("dialog[open]") && !dialog.current?.open) return
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setQuery(""); if (!dialog.current?.open) dialog.current?.showModal(); search.current?.focus() }
    }
    window.addEventListener("keydown", key)
    return () => window.removeEventListener("keydown", key)
  }, [])
  const commands = [{ label: "Create invoice", detail: "Start a new draft", run: onCreate }, { label: "View invoices", detail: "Search the ledger", run: () => onNavigate("invoices") }, { label: "Payment reports", detail: "Monthly payments and receipts", run: () => onNavigate("reports") }, { label: "Settings", detail: "Business, services and archives", run: () => onNavigate("settings") }]
  const visibleCommands = commands.filter((command) => command.label.toLowerCase().includes(query.toLowerCase()))
  const matches = invoices.filter((invoice) => `${invoice.number} ${invoice.title} ${invoice.client.name} ${invoice.client.company} ${invoice.client.email}`.toLowerCase().includes(query.toLowerCase())).slice(-8).reverse()
  function choose(run: () => void) { dialog.current?.close(); run() }
  return <><button type="button" className="oz-quick-trigger" aria-label="Quick actions" onClick={open}><span>Quick actions</span><kbd>Ctrl K</kbd></button><dialog ref={dialog} className="oz-command-dialog" aria-labelledby="oz-command-title"><div className="oz-command-top"><h2 id="oz-command-title">Find your next move.</h2><button type="button" className="oz-small-button" onClick={() => dialog.current?.close()}>Close <kbd>Esc</kbd></button></div><label className="sr-only" htmlFor="oz-command-search">Search commands and invoices</label><input ref={search} id="oz-command-search" type="search" onKeyDown={(event) => { if (event.key === "ArrowDown") { event.preventDefault(); dialog.current?.querySelector<HTMLButtonElement>(".oz-command-results button")?.focus() } if (event.key === "Enter" && query.trim()) { event.preventDefault(); if (visibleCommands[0]) choose(visibleCommands[0].run); else if (matches[0]) choose(() => onOpen(matches[0].id)) } }} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search a client, invoice or action…" /><div className="oz-command-results"><p className="oz-label">ACTIONS</p>{visibleCommands.map((command) => <button key={command.label} type="button" onClick={() => choose(command.run)}><span>{command.label}<small>{command.detail}</small></span><span aria-hidden>↗</span></button>)}<p className="oz-label">INVOICES · {matches.length} SHOWN</p>{matches.map((invoice) => <button type="button" key={invoice.id} onClick={() => choose(() => onOpen(invoice.id))}><span>{invoice.number} · {invoice.client.company || invoice.client.name}<small>{invoice.title}</small></span><span className="oz-badge">{invoice.status}</span></button>)}{!matches.length && <p className="oz-form-hint">No matching invoices.</p>}</div></dialog></>
}
