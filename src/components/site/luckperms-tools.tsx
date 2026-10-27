"use client"

import { useState } from "react"
import { metaCommands, rankCommands, trackCommands, type CommandOptions, type MetaInput, type RankInput, type TrackInput } from "@/lib/luckperms"
import { gradientStops, type GradientConfig } from "@/lib/minecraft-gradient"
import { Field, Result, TextPreview } from "./minecraft-controls"
import { MinecraftGradientEditor } from "./minecraft-gradient-editor"

const defaults: CommandOptions = { platform: "lp", console: false, server: "", world: "" }
function Options({ value, update }: { value: CommandOptions; update: (value: Partial<CommandOptions>) => void }) {
  return <details className="mc-preset-details"><summary>Platform, console & contexts</summary><div className="mc-fields mt-5"><Field label="LuckPerms platform"><select value={value.platform} onChange={(event) => update({ platform: event.target.value as CommandOptions["platform"] })}><option value="lp">Paper / Spigot / Fabric / Sponge — lp</option><option value="lpb">BungeeCord — lpb</option><option value="lpv">Velocity — lpv</option></select></Field><Field label="Server context (optional)"><input value={value.server} maxLength={64} onChange={(event) => update({ server: event.target.value })} placeholder="survival" /></Field><Field label="World context (optional)"><input value={value.world} maxLength={64} onChange={(event) => update({ world: event.target.value })} placeholder="world" /></Field></div><div className="mc-checkboxes"><label><input type="checkbox" checked={value.console} onChange={(event) => update({ console: event.target.checked })} />Console commands (omit leading /)</label></div><p className="mc-note">Blank contexts apply globally. The context suffix applies to supported permission, parent and meta operations; group weights and track membership are global.</p></details>
}

function Commands({ run, note }: { run: () => string; note: string }) {
  let output = "", error = ""
  try { output = run() } catch (err) { error = (err as Error).message }
  return error ? <p role="alert" className="mc-error">{error}</p> : <Result label="LuckPerms commands" value={output} note={note} />
}

function RankBuilder() {
  const [value, setValue] = useState<RankInput>({ ...defaults, group: "vip", displayName: "VIP", prefix: "&b[VIP] &r", suffix: "", weight: "100", priority: "100", parent: "default", permissions: "", create: true, player: "", replacePrefix: true })
  const [gradient, setGradient] = useState<GradientConfig | null>(null)
  const patch = (next: Partial<RankInput>) => setValue({ ...value, ...next })
  const presets = [{ name: "Member", group: "member", color: "7", weight: "10" }, { name: "VIP", group: "vip", color: "b", weight: "100" }, { name: "Moderator", group: "mod", color: "a", weight: "500" }, { name: "Admin", group: "admin", color: "c", weight: "800" }, { name: "Owner", group: "owner", color: "6", weight: "1000" }]
  return <>
    <div className="mc-gradient-toolbar" role="group" aria-label="Rank starting templates">{presets.map((preset) => <button type="button" key={preset.group} className="mc-button" onClick={() => { patch({ group: preset.group, displayName: preset.name, prefix: `&${preset.color}[${preset.name}] &r`, weight: preset.weight, priority: preset.weight }); setGradient(null) }}>{preset.name}</button>)}</div>
    <p className="mc-note">Templates set appearance and weight only. Add the permissions your own plugins use below.</p>
    <div className="mc-fields mt-5">
      <Field label="Rank group name"><input value={value.group} maxLength={48} onChange={(event) => patch({ group: event.target.value })} /></Field>
      <Field label="Rank display name"><input value={value.displayName} maxLength={80} onChange={(event) => patch({ displayName: event.target.value })} /></Field>
      <Field label="Group weight"><input type="number" min={0} max={10000} value={value.weight} onChange={(event) => patch({ weight: event.target.value })} /></Field>
      <Field label="Prefix / suffix priority"><input type="number" min={0} max={10000} value={value.priority} onChange={(event) => patch({ priority: event.target.value })} /></Field>
      <Field label="Rank prefix"><input value={value.prefix} maxLength={20000} onChange={(event) => { patch({ prefix: event.target.value }); setGradient(null) }} /></Field>
      <Field label="Rank suffix (optional)"><input value={value.suffix} maxLength={250} onChange={(event) => patch({ suffix: event.target.value })} /></Field>
      <Field label="Inherit from group (optional)"><input value={value.parent} maxLength={48} onChange={(event) => patch({ parent: event.target.value })} /></Field>
      <Field label="Assign to username or UUID (optional)"><input value={value.player} maxLength={36} onChange={(event) => patch({ player: event.target.value })} /></Field>
    </div>
    <div className="mc-preview" role="group" aria-label="Rank chat preview">
      {gradient ? <span className="mc-game-text" style={{ fontWeight: gradient.bold ? 900 : undefined, fontStyle: gradient.italic ? "italic" : undefined, textDecoration: [gradient.underline ? "underline" : "", gradient.strike ? "line-through" : ""].join(" ").trim() || undefined }}>{gradientStops(gradient.text, gradient.colors).map((letter, index) => <span key={index} style={{ color: letter.color }}>{gradient.obfuscated ? "▒" : letter.text}</span>)}</span> : <TextPreview text={value.prefix} edition="java" />}
      <TextPreview text={`${value.player || "Player"}${value.suffix}&r: Hello, world!`} edition="java" />
    </div>
    <details className="mc-preset-details"><summary>Design a gradient prefix</summary><MinecraftGradientEditor key={value.group} initialText={`[${value.displayName || "VIP"}] `} onApply={(prefix, config) => { patch({ prefix }); setGradient(config) }} /></details>
    <div className="mt-5"><Field label="Permission nodes (one per line)"><textarea rows={4} maxLength={16000} value={value.permissions} onChange={(event) => patch({ permissions: event.target.value })} placeholder={"yourplugin.command.use\n-yourplugin.command.admin"} /></Field></div>
    <p className="mc-note">Plain nodes are allowed; a leading minus denies a node. Higher prefix priority normally wins; group weight is a separate inheritance-order setting.</p>
    <div className="mc-checkboxes"><label><input type="checkbox" checked={value.create} onChange={(event) => patch({ create: event.target.checked })} />Include create-group command</label><label><input type="checkbox" checked={value.replacePrefix} onChange={(event) => patch({ replacePrefix: event.target.checked })} />Replace prefixes / suffixes in this context</label></div>
    <Options value={value} update={patch} />
    <Commands run={() => rankCommands(value)} note="Run one line at a time with LuckPerms admin access. Uncheck create-group for an existing rank. Replace mode removes old prefixes/suffixes in the same context; add mode preserves them. A compatible chat/TAB formatter is needed to display prefixes and render RGB syntax. This page never connects to your server." />
  </>
}

function TrackBuilder() {
  const [value, setValue] = useState<TrackInput>({ ...defaults, track: "ranks", groups: "default\nvip\nmvp", createGroups: false, inherit: false, createTrack: true })
  const patch = (next: Partial<TrackInput>) => setValue({ ...value, ...next })
  return <><div className="mc-fields"><Field label="Track name"><input value={value.track} maxLength={48} onChange={(event) => patch({ track: event.target.value })} /></Field><Field label="Ranks in order (lowest first)"><textarea value={value.groups} maxLength={1000} rows={5} onChange={(event) => patch({ groups: event.target.value })} /></Field></div><div className="mc-rank-ladder" aria-label="Rank ladder preview">{value.groups.split(/[\n,]/).map((group) => group.trim()).filter(Boolean).slice(0, 20).map((group, index) => <span key={index}>{index + 1}. {group} {index < value.groups.split(/[\n,]/).filter((group) => group.trim()).length - 1 ? "→" : ""}</span>)}</div><div className="mc-checkboxes"><label><input type="checkbox" checked={value.createTrack} onChange={(event) => patch({ createTrack: event.target.checked })} />Include create-track command</label><label><input type="checkbox" checked={value.createGroups} onChange={(event) => patch({ createGroups: event.target.checked })} />Create all listed groups</label><label><input type="checkbox" checked={value.inherit} onChange={(event) => patch({ inherit: event.target.checked })} />Each higher rank inherits the previous rank</label></div><Options value={value} update={patch} /><Commands run={() => trackCommands(value)} note="Track order goes from lowest to highest. Existing groups are expected unless you enable group creation. Appending to an existing track keeps its previous entries. A track does not grant permissions or automatically set group weights; inheritance is only added when enabled." /></>
}

function MetaBuilder() {
  const [value, setValue] = useState<MetaInput>({ ...defaults, kind: "group", target: "vip", key: "max-homes", value: "5", operation: "set" })
  const patch = (next: Partial<MetaInput>) => setValue({ ...value, ...next })
  return <><div className="mc-fields"><Field label="Meta target type"><select value={value.kind} onChange={(event) => patch({ kind: event.target.value as MetaInput["kind"] })}><option value="group">Group</option><option value="user">User</option></select></Field><Field label="Meta target name"><input value={value.target} maxLength={48} onChange={(event) => patch({ target: event.target.value })} /></Field><Field label="Meta operation"><select value={value.operation} onChange={(event) => patch({ operation: event.target.value as MetaInput["operation"] })}><option value="set">Set value</option><option value="unset">Remove value</option></select></Field><Field label="Meta key"><input value={value.key} maxLength={80} onChange={(event) => patch({ key: event.target.value })} /></Field>{value.operation === "set" && <Field label="Meta value"><input value={value.value} maxLength={250} onChange={(event) => patch({ value: event.target.value })} /></Field>}</div><Options value={value} update={patch} /><Commands run={() => metaCommands(value)} note="Meta is key/value data read by other plugins. Keys such as max-homes only take effect when your plugin understands them. Removing a value removes only that key in the selected context, not every meta entry." /></>
}

export function LuckPermsTools({ tool }: { tool: "ranks" | "tracks" | "meta" }) {
  return <div className="mc-luckperms">{tool === "ranks" ? <RankBuilder /> : tool === "tracks" ? <TrackBuilder /> : <MetaBuilder />}<p className="mc-note">Command reference: <a href="https://luckperms.net/wiki/Prefixes,-Suffixes-&-Meta" target="_blank" rel="noreferrer" className="underline underline-offset-4">LuckPerms prefixes, suffixes & meta ↗</a> · <a href="https://luckperms.net/wiki/Command-Usage" target="_blank" rel="noreferrer" className="underline underline-offset-4">Command usage ↗</a></p></div>
}
