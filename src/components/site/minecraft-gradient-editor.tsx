"use client"

import { useState } from "react"
import { closestLegacy } from "@/lib/minecraft"
import { gradientStops, parseGradientPreset, styledGradient, type GradientConfig, type GradientFormat } from "@/lib/minecraft-gradient"
import { Field, Result } from "./minecraft-controls"

const PRESETS = [
  { name: "Ender", colors: ["#55ffff", "#aa55ff"] },
  { name: "Sunset", colors: ["#ffcf56", "#ff687b", "#b56cff"] },
  { name: "Emerald", colors: ["#b9ff72", "#31c9a1"] },
  { name: "Diamond", colors: ["#c0ffff", "#38bce5", "#728aff"] },
  { name: "Inferno", colors: ["#ffd36b", "#ff923e", "#e74c64"] },
]

export function MinecraftGradientEditor({ initialText = "Craft something cool", onApply }: { initialText?: string; onApply?: (value: string, config: GradientConfig) => void }) {
  const [config, setConfig] = useState<GradientConfig>({ text: initialText, colors: PRESETS[0].colors, format: "amphex", bold: false, italic: false, underline: false, strike: false, obfuscated: false, trimSpaces: true })
  const [preview, setPreview] = useState("chat"), [font, setFont] = useState("pixel")
  const [preset, setPreset] = useState(""), [status, setStatus] = useState("")
  let output = "", error = "", letters: ReturnType<typeof gradientStops> = []
  try { letters = gradientStops(config.text, config.colors); output = styledGradient(config) } catch (err) { error = (err as Error).message }
  const setColor = (index: number, color: string) => setConfig({ ...config, colors: config.colors.map((old, i) => i === index ? color : old) })
  const styles = [{ key: "bold", name: "Bold", mark: "B" }, { key: "italic", name: "Italic", mark: "I" }, { key: "underline", name: "Underline", mark: "U" }, { key: "strike", name: "Strikethrough", mark: "S" }, { key: "obfuscated", name: "Obfuscated", mark: "?" }] as const
  return <div className="mc-gradient-editor">
    <Field label="Gradient text"><textarea maxLength={120} rows={2} value={config.text} onChange={(event) => setConfig({ ...config, text: event.target.value })} /></Field>
    <div className="mc-gradient-toolbar" role="group" aria-label="Gradient formatting">{styles.map(({ key, name, mark }) => <button type="button" key={key} aria-label={name} aria-pressed={config[key]} className="mc-button" onClick={() => setConfig({ ...config, [key]: !config[key] })}>{mark}</button>)}<button type="button" className="mc-button" onClick={() => setConfig({ ...config, bold: false, italic: false, underline: false, strike: false, obfuscated: false })}>Clear style</button></div>
    <div className={`mc-preview mc-gradient-preview ${preview === "item" ? "mc-item-preview" : ""}`} role="group" aria-label="Gradient live preview">
      {preview === "chat" && <p className="mc-note !mt-0 !mb-3">Player: </p>}
      {preview === "motd" && <p className="mc-note !mt-0 !mb-3">Your Minecraft server · 0 / 20</p>}
      <p className={font === "pixel" ? "mc-game-text" : "font-mono text-xl"} style={{ fontWeight: config.bold ? 900 : undefined, fontStyle: config.italic ? "italic" : undefined, textDecoration: [config.underline ? "underline" : "", config.strike ? "line-through" : ""].join(" ").trim() || undefined }}>{letters.map((letter, i) => <span key={i} style={{ color: config.format === "legacy" ? closestLegacy(letter.color)[2] : letter.color }} aria-label={config.obfuscated ? letter.text : undefined}>{config.obfuscated && letter.text.trim() ? "▒" : letter.text}</span>)}</p>
    </div>
    <div className="mc-fields mt-5"><Field label="Preview scene"><select value={preview} onChange={(event) => setPreview(event.target.value)}><option value="chat">Minecraft chat</option><option value="item">Item tooltip</option><option value="motd">Server MOTD</option></select></Field><Field label="Preview font"><select value={font} onChange={(event) => setFont(event.target.value)}><option value="pixel">Pixel font</option><option value="mono">Monospace</option></select></Field></div>
    <div className="mc-gradient-columns">
      <div><h4 className="mc-label">Color stops / {config.colors.length}</h4><div className="mc-color-stops">{config.colors.map((color, index) => <div key={index} className="mc-color-stop"><label><span className="sr-only">Pick color {index + 1}</span><input aria-label={`Pick color ${index + 1}`} type="color" value={/^#[0-9a-f]{6}$/i.test(color) ? color : "#000000"} onChange={(event) => setColor(index, event.target.value)} /></label><Field label={`Hex color ${index + 1}`}><input maxLength={7} value={color} onChange={(event) => setColor(index, event.target.value)} /></Field><button type="button" className="mc-button" aria-label={`Remove color ${index + 1}`} disabled={config.colors.length <= 2} onClick={() => setConfig({ ...config, colors: config.colors.filter((_, i) => i !== index) })}>×</button></div>)}</div><div className="mc-gradient-toolbar"><button type="button" className="mc-button" disabled={config.colors.length >= 8} onClick={() => setConfig({ ...config, colors: [...config.colors, "#ffffff"] })}>Add stop +</button><button type="button" className="mc-button" onClick={() => setConfig({ ...config, colors: [...config.colors].reverse() })}>Reverse ↔</button></div></div>
      <div><Field label="Gradient output format"><select value={config.format} onChange={(event) => setConfig({ ...config, format: event.target.value as GradientFormat })}><option value="amphex">&amp;#RRGGBB — plugin hex</option><option value="ampx">&amp;x&amp;R&amp;R&amp;G&amp;G&amp;B&amp;B</option><option value="section">§x§R§R§G§G§B§B</option><option value="mini">MiniMessage gradient</option>{!onApply && <option value="json">Java RGB JSON</option>}<option value="legacy">Legacy 16-color approximation</option></select></Field><div className="mc-checkboxes"><label><input type="checkbox" checked={config.trimSpaces} onChange={(event) => setConfig({ ...config, trimSpaces: event.target.checked })} />Skip color codes on spaces</label></div><p className="mc-note">Pick the format supported by your chat, TAB or nickname plugin. LuckPerms stores the value; your formatting plugin renders it.</p></div>
    </div>
    <div className="mc-gradient-toolbar" role="group" aria-label="Gradient presets">{PRESETS.map((preset) => <button key={preset.name} type="button" className="mc-button" onClick={() => setConfig({ ...config, colors: preset.colors })}>{preset.name}</button>)}</div>
    {error ? <p role="alert" className="mc-error">{error}</p> : <Result value={output} note="Hex gradients require a compatible RGB-capable formatter (usually Java 1.16+). MiniMessage needs an Adventure-aware plugin. The legacy option approximates the gradient using the base 16 colors." />}
    {onApply && <button type="button" disabled={Boolean(error) || !output} className="mc-button mt-5" onClick={() => { onApply(output, config); setStatus("Gradient applied to the rank prefix.") }}>Use as rank prefix ↗</button>}
    <details className="mc-preset-details"><summary>Import / export gradient preset</summary><p className="mc-note">Save these settings as JSON to reuse or share them. Presets stay in your browser until you copy them.</p><Field label="Gradient preset JSON"><textarea rows={3} maxLength={20000} value={preset} onChange={(event) => setPreset(event.target.value)} /></Field><div className="mc-gradient-toolbar"><button type="button" className="mc-button" onClick={() => { setPreset(JSON.stringify(config, null, 2)); setStatus("Preset exported below.") }}>Export preset</button><button type="button" className="mc-button" onClick={() => { try { const next = parseGradientPreset(preset); if (onApply && next.format === "json") next.format = "amphex"; setConfig(next); setStatus("Preset loaded.") } catch (err) { setStatus((err as Error).message) } }}>Import preset</button></div></details>
    <p role="status" className="mc-note">{status}</p>
  </div>
}
