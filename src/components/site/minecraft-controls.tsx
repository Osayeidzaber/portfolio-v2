"use client"

import { cloneElement, useId, useState, type ReactElement } from "react"
import { parseMinecraftText, type Edition } from "@/lib/minecraft"

export function Field({ label, children }: { label: string; children: ReactElement<{ id?: string }> }) {
  const id = useId()
  return <div className="mc-field"><label htmlFor={id}>{label}</label>{cloneElement(children, { id })}</div>
}

export function Result({ value, note, label = "Crafted output" }: { value: string; note: string; label?: string }) {
  const [status, setStatus] = useState("")
  return <div className="mc-result">
    <label className="mc-label">{label}<textarea aria-label={label} readOnly value={value} rows={Math.min(12, value.split("\n").length + 1)} /></label>
    <div className="mc-result-actions"><button type="button" className="mc-button" disabled={!value} onClick={async () => { try { await navigator.clipboard.writeText(value); setStatus("Copied to clipboard.") } catch { setStatus("Select the output and copy it manually.") } }}>Copy output</button><span role="status">{status}</span></div>
    <p className="mc-note">{note}</p>
  </div>
}

export function TextPreview({ text, edition }: { text: string; edition: Edition }) {
  return <span className="mc-game-text">{parseMinecraftText(text, edition).map((run, index) => <span key={index} style={{ color: run.color, fontWeight: run.bold ? 900 : undefined, fontStyle: run.italic ? "italic" : undefined, textDecoration: [run.underline ? "underline" : "", run.strike ? "line-through" : ""].join(" ").trim() || undefined }} aria-label={run.obfuscated ? run.text : undefined}>{run.obfuscated ? "▒".repeat(Array.from(run.text).length) : run.text}</span>)}</span>
}
