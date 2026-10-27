"use client"

import { useId, useState, useSyncExternalStore } from "react"
import { BEDROCK_COLORS, LEGACY_COLORS, chunkAt, convertCoordinates, motdProperty, paletteFor, stackCount, xpAtLevel, type Edition } from "@/lib/minecraft"

import { Field, Result, TextPreview } from "./minecraft-controls"
import { LuckPermsTools } from "./luckperms-tools"
import { MinecraftGradientEditor } from "./minecraft-gradient-editor"

const TOOLS = [
  { id: "nether", name: "Nether Coordinate Calculator", short: "Coordinates", hint: "A shortcut through dimensions. Convert X and Z; Y stays the same.", icon: "portal" },
  { id: "gradient", name: "Minecraft Gradient Generator", short: "Gradients", hint: "Craft a color ramp for a rank, a name or a server message.", icon: "dye" },
  { id: "stacks", name: "Stack Calculator", short: "Stacks", hint: "Know how much inventory space your next build needs.", icon: "block" },
  { id: "time", name: "Minecraft Time Converter", short: "Game time", hint: "Convert game ticks into real time, at the standard 20 TPS.", icon: "clock" },
  { id: "colors", name: "Minecraft Color Code Picker", short: "Color codes", hint: "Pick a color and formatting, then copy the code you need.", icon: "dye" },
  { id: "motd", name: "Minecraft Server MOTD Preview", short: "Server MOTD", hint: "Try your two-line message in a multiplayer-list preview.", icon: "sign" },
  { id: "chunks", name: "Chunk Coordinate Calculator", short: "Chunks", hint: "Find the chunk, local position and boundaries of any block.", icon: "chunk" },
  { id: "portals", name: "Portal Link Calculator", short: "Portal links", hint: "Find the matching block position for your portal in the other dimension.", icon: "portal" },
  { id: "xp", name: "XP Level Calculator", short: "XP levels", hint: "Count the experience points between two level boundaries.", icon: "bottle" },
  { id: "items", name: "Minecraft Item Name Formatter", short: "Item names", hint: "Make an item name with a live inventory-tooltip preview.", icon: "sword" },
  { id: "ranks", name: "LuckPerms Rank Builder", short: "Rank builder", hint: "Design a rank, preview its prefix and copy the LuckPerms commands.", icon: "sword" },
  { id: "tracks", name: "LuckPerms Rank Ladder", short: "Rank ladder", hint: "Put your ranks in order and generate an optional inheritance chain.", icon: "sign" },
  { id: "meta", name: "LuckPerms Meta Editor", short: "Meta editor", hint: "Create context-aware meta commands for a group or player.", icon: "bottle" },
] as const
type ToolId = typeof TOOLS[number]["id"]
type Icon = typeof TOOLS[number]["icon"]

const subscribeHash = (listener: () => void) => {
  window.addEventListener("hashchange", listener)
  window.addEventListener("popstate", listener)
  return () => { window.removeEventListener("hashchange", listener); window.removeEventListener("popstate", listener) }
}
const readTool = (): ToolId => {
  const hash = window.location.hash.slice(1)
  return TOOLS.some((item) => item.id === hash) ? hash as ToolId : "nether"
}

/** Original pixel icons: tiny rectilinear illustrations, no game asset downloads. */
function PixelIcon({ icon }: { icon: Icon }) {
  return <svg aria-hidden viewBox="0 0 16 16" className="mc-icon" shapeRendering="crispEdges">
    {icon === "portal" && <><path fill="#1e172a" d="M3 1h10v14H3z" /><path fill="#746078" d="M3 1h3v2H3zm7 0h3v2h-3zM3 7h2v3H3zm8 4h2v3h-2zM5 13h5v2H5z" /><path fill="#973bd5" d="M5 3h6v10H5z" /><path fill="#ca7bff" d="M6 4h2v6H6zm3 4h1v4H9z" /></>}
    {icon === "dye" && <><path fill="#55ffff" d="M1 2h6v6H1z" /><path fill="#a855f7" d="M9 2h6v6H9z" /><path fill="#55ff55" d="M1 10h6v5H1z" /><path fill="#ffaa00" d="M9 10h6v5H9z" /><path fill="#fff" opacity=".5" d="M2 3h4v1H2zm8 0h4v1h-4zM2 11h4v1H2zm8 0h4v1h-4z" /></>}
    {icon === "block" && <><path fill="#754d32" d="M1 3h14v12H1z" /><path fill="#64a640" d="M1 1h14v5H1z" /><path fill="#a5cc69" d="M1 1h14v2H1z" /><path fill="#a17a53" d="M3 8h3v2H3zm7-1h3v2h-3zm-3 5h4v2H7z" /></>}
    {icon === "clock" && <><path fill="#d7a734" d="M4 1h8v2h2v2h1v6h-1v2h-2v2H4v-2H2v-2H1V5h1V3h2z" /><path fill="#263a6a" d="M4 4h8v8H4z" /><path fill="#f4e3a1" d="M7 4h2v5H7zm2 4h3v2H9z" /></>}
    {icon === "sign" && <><path fill="#6c4528" d="M1 2h14v9H1zm6 9h2v5H7z" /><path fill="#bc915a" d="M2 3h12v7H2z" /><path fill="#50361f" d="M3 5h10v1H3zm0 3h7v1H3z" /></>}
    {icon === "chunk" && <><path fill="#203b24" d="M1 1h14v14H1z" /><path fill="#83c34b" d="M1 1h14v1H1zm0 13h14v1H1zM1 1h1v14H1zm13 0h1v14h-1zM5 2h1v12H5zm5 0h1v12h-1zM2 5h12v1H2zm0 5h12v1H2z" /><path fill="#ffec91" d="M7 7h2v2H7z" /></>}
    {icon === "bottle" && <><path fill="#9487b5" d="M5 1h6v3H5z" /><path fill="#b1d6df" d="M6 4h4v3h2v2h2v5h-2v1H4v-1H2V9h2V7h2z" /><path fill="#7ddc3b" d="M4 9h8v4H4z" /><path fill="#d3ff94" d="M5 10h2v2H5z" /></>}
    {icon === "sword" && <><path fill="#28777d" d="M11 1h4v4h-2v2h-2v2H9v2H7V9H5V7h4V5h2z" /><path fill="#64efe1" d="M12 2h2v2h-2v2h-2v2H8v1H7V8h3V6h2z" /><path fill="#8a6339" d="M3 10h2v2H3zm-2 2h2v3H1z" /><path fill="#a8ebdf" d="M3 7h2v2h2v2h2v2H7v-2H5V9H3z" /></>}
  </svg>
}

function NumberTools({ tool }: { tool: ToolId }) {
  const [values, setValues] = useState<Record<string, string>>({ x: "128", z: "-256", y: "64", amount: "130", size: "64", time: "24000", start: "0", end: "30" })
  const [from, setFrom] = useState<"overworld" | "nether">("overworld")
  const [unit, setUnit] = useState("ticks")
  const field = (key: string, label: string, min?: number, max = 30_000_000) => <Field label={label}><input type="number" inputMode="decimal" value={values[key]} min={min} max={max} step="any" onChange={(event) => setValues({ ...values, [key]: event.target.value })} /></Field>
  const read = (key: string, min = -30_000_000, max = 30_000_000, integer = false) => {
    const raw = values[key], value = Number(raw)
    if (!raw.trim() || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) throw new Error(`Enter ${integer ? "a whole number" : "a number"} from ${min.toLocaleString("en-US")} to ${max.toLocaleString("en-US")}.`)
    return value
  }
  let output = "", note = "", error = ""
  let cards: Array<[string, string]> = []
  try {
    if (tool === "nether" || tool === "portals") {
      const converted = convertCoordinates(read("x"), read("z"), from)
      const target = from === "overworld" ? "Nether" : "Overworld"
      if (Math.abs(converted.x) >= 30_000_000 || Math.abs(converted.z) >= 30_000_000) throw new Error("The converted location is outside the standard world border.")
      cards = [[`${target} X`, String(converted.x)], [`${target} Z`, String(converted.z)]]
      output = tool === "portals" ? `${target} portal blocks: X ${converted.blockX}, Y ${read("y", from === "overworld" ? 1 : -63, from === "overworld" ? 124 : 316, true)}, Z ${converted.blockZ}` : `${target}: X ${converted.x}, Z ${converted.z}\nBlock position: ${converted.blockX}, ${converted.blockZ}`
      note = tool === "portals" ? "Build at the suggested X/Z and a safe Y. Y is not scaled. Existing portals, elevation, terrain and edition-specific search rules affect the link; this is a target location, not a guaranteed pairing." : "X and Z scale 8:1. Y does not change. Block coordinates round down, including negative coordinates."
    } else if (tool === "chunks") {
      const chunk = chunkAt(read("x"), read("z"))
      cards = [["Chunk X", String(chunk.x)], ["Chunk Z", String(chunk.z)], ["Local X / Z", `${chunk.localX} / ${chunk.localZ}`]]
      output = `Chunk: ${chunk.x}, ${chunk.z}\nX boundaries: ${chunk.minX} to ${chunk.maxX}\nZ boundaries: ${chunk.minZ} to ${chunk.maxZ}\nLocal block: ${chunk.localX}, ${chunk.localZ}`
      note = "Chunks are 16 × 16 blocks. Boundaries are inclusive; negative coordinates use floor division."
    } else if (tool === "stacks") {
      const count = stackCount(read("amount", 0, 1_000_000_000, true), read("size", 1, 64, true))
      cards = [["Full stacks", String(count.stacks)], ["Leftover", String(count.leftover)], ["Inventory slots", String(count.slots)]]
      output = `${count.stacks} full stacks + ${count.leftover} items\n${count.slots} occupied slots\n${count.shulkers} full shulker boxes + ${count.looseAfterShulkers} items`
      note = "Choose the item's actual stack size. A shulker box has 27 slots. This counts items in slots, not nested containers."
    } else if (tool === "time") {
      const value = read("time", 0, 1_000_000_000, unit === "ticks")
      const ticks = unit === "ticks" ? value : value * (unit === "seconds" ? 20 : 1200)
      cards = [["Game ticks", ticks.toLocaleString("en-US", { maximumFractionDigits: 3 })], ["Seconds", (ticks / 20).toLocaleString("en-US", { maximumFractionDigits: 3 })], ["Minutes", (ticks / 1200).toLocaleString("en-US", { maximumFractionDigits: 3 })]]
      output = `${ticks} game ticks\n${ticks / 20} seconds\n${ticks / 1200} minutes\n${ticks / 24000} Minecraft days`
      note = "Uses 20 game ticks per second and 24,000 ticks per Minecraft day. Server lag and changed tick rates alter real elapsed time. Fractional ticks are mathematical equivalents."
    } else {
      const start = read("start", 0, 10_000, true), end = read("end", 0, 10_000, true)
      if (end < start) throw new Error("The target level must be at least the starting level.")
      const difference = xpAtLevel(end) - xpAtLevel(start)
      cards = [["XP needed", difference.toLocaleString("en-US")], ["Target total XP", xpAtLevel(end).toLocaleString("en-US")]]
      output = `Level ${start} → ${end}: ${difference} XP\nTotal at level ${end}: ${xpAtLevel(end)} XP`
      note = "For modern Java and Bedrock leveling. Assumes an empty progress bar at both level boundaries. Enchanting and anvil level costs are not XP-point costs."
    }
  } catch (err) { error = (err as Error).message }

  return <>
    <div className="mc-fields">
      {(tool === "nether" || tool === "portals") && <Field label="Starting dimension"><select value={from} onChange={(event) => setFrom(event.target.value as typeof from)}><option value="overworld">Overworld → Nether</option><option value="nether">Nether → Overworld</option></select></Field>}
      {["nether", "portals", "chunks"].includes(tool) && <>{field("x", "X coordinate")}{field("z", "Z coordinate")}{tool === "portals" && field("y", "Target portal Y", from === "overworld" ? 1 : -63, from === "overworld" ? 124 : 316)}</>}
      {tool === "stacks" && <>{field("amount", "Item quantity", 0, 1_000_000_000)}<Field label="Items per stack"><select value={values.size} onChange={(event) => setValues({ ...values, size: event.target.value })}><option value="64">64 — blocks & most items</option><option value="16">16 — pearls, eggs & snowballs</option><option value="1">1 — tools & unstackable items</option></select></Field></>}
      {tool === "time" && <><Field label="Convert from"><select value={unit} onChange={(event) => setUnit(event.target.value)}><option value="ticks">Game ticks</option><option value="seconds">Real seconds</option><option value="minutes">Real minutes</option></select></Field>{field("time", "Time amount", 0, 1_000_000_000)}</>}
      {tool === "xp" && <>{field("start", "Starting level", 0, 10_000)}{field("end", "Target level", 0, 10_000)}</>}
    </div>
    {error ? <p role="alert" className="mc-error">{error}</p> : <><dl className="mc-stats">{cards.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><Result value={output} note={note} /></>}
  </>
}

function TextTools({ tool }: { tool: ToolId }) {
  const [edition, setEdition] = useState<Edition>("java")
  const [text, setText] = useState(tool === "motd" ? "&a&lZABER'S SURVIVAL\n&7A new adventure starts here." : tool === "items" ? "Diamond Dream" : "Craft something cool")
  const [color, setColor] = useState("b")
  const [bold, setBold] = useState(false), [italic, setItalic] = useState(false)
  const [underline, setUnderline] = useState(false), [strike, setStrike] = useState(false)
  const [serverName, setServerName] = useState("A little block of the internet")
  const [serverAddress, setServerAddress] = useState("play.example.net")
  const colors = paletteFor(edition)
  const selected = colors.find(([code]) => code === color) ?? LEGACY_COLORS[11]
  const decorations = `${bold ? "§l" : ""}${italic ? "§o" : ""}${underline && edition === "java" ? "§n" : ""}${strike && edition === "java" ? "§m" : ""}`
  const named = `§${selected[0]}${decorations}${text}§r`
  const json = JSON.stringify({ text, color: selected[2], bold, italic, underlined: edition === "java" && underline, strikethrough: edition === "java" && strike })
  const result = tool === "motd" ? edition === "java" ? motdProperty(text) : `server-name=${text.replace(/&([0-9a-u])/gi, "§$1").replace(/[\r\n]+/g, " ")}` : tool === "items" && edition === "java" ? json : named
  const description = tool === "motd" ? edition === "java" ? "Copy this line to Java server.properties. & is preview shorthand; output uses escaped section signs and newlines. Sample player count and ping are decorative." : "Bedrock server.properties server-name is one line. This export flattens line breaks. Sample player count and ping are decorative." : tool === "items" ? edition === "java" ? "Java text-component JSON. Use as a custom-name component in commands or supported plugins; command syntax depends on your game version. Ordinary anvils do not parse JSON." : "Bedrock legacy colored name. Use in an item editor or tool that supports § codes; availability depends on how the item is created." : "§ codes are native legacy codes. & is plugin shorthand. Preview supports formatting codes for the selected edition; Minecraft does not parse these in every input field."

  return <>
    <div className="mc-fields">
      <Field label="Edition"><select value={edition} onChange={(event) => { const next = event.target.value as Edition; setEdition(next); if (BEDROCK_COLORS.some(([code]) => code === color)) setColor("b") }}><option value="java">Java Edition</option><option value="bedrock">Bedrock Edition</option></select></Field>
      <Field label={tool === "motd" ? "Message of the day" : tool === "items" ? "Item name" : "Preview text"}><textarea rows={tool === "motd" ? 2 : 1} maxLength={tool === "motd" ? 300 : 120} value={text} onChange={(event) => setText(event.target.value)} /></Field>
      {tool === "motd" && <><Field label="Server list name"><input value={serverName} maxLength={60} onChange={(event) => setServerName(event.target.value)} /></Field><Field label="Server address"><input value={serverAddress} maxLength={100} onChange={(event) => setServerAddress(event.target.value)} /></Field></>}
    </div>
    {(tool === "colors" || tool === "items") && <>
      <div className="mc-palette" role="group" aria-label="Minecraft colors">{colors.map(([code, name, hex]) => <button key={code} type="button" aria-pressed={selected[0] === code} aria-label={`${name} §${code}`} title={`${name} · §${code}`} onClick={() => setColor(code)} style={{ backgroundColor: hex }}><span style={{ color: ["0", "1", "4", "5", "8", "9", "j", "m", "t"].includes(code) ? "#fff" : "#000" }}>{code}</span></button>)}</div>
      <div className="mc-checkboxes">{[{ label: "Bold", value: bold, set: setBold }, { label: "Italic", value: italic, set: setItalic }, ...(edition === "java" ? [{ label: "Underline", value: underline, set: setUnderline }, { label: "Strikethrough", value: strike, set: setStrike }] : [])].map((setting) => <label key={setting.label}><input type="checkbox" checked={setting.value} onChange={(event) => setting.set(event.target.checked)} />{setting.label}</label>)}</div>
    </>}
    <div className={`mc-preview ${tool === "items" ? "mc-item-preview" : ""}`} role="group" aria-label="Live Minecraft preview">
      {tool === "motd" ? <div className="mc-server"><div className="mc-server-icon"><PixelIcon icon="block" /></div><div className="mc-server-copy"><div className="mc-server-title"><strong>{serverName}</strong><span>0 / 20 ▂▄▆█</span></div><TextPreview text={text} edition={edition} /><p>{serverAddress}</p></div></div> : <div className="mc-item-row">{tool === "items" && <PixelIcon icon="sword" />}<div><TextPreview text={named} edition={edition} />{tool === "items" && <p className="mc-note">Custom name preview · No command is run</p>}</div></div>}
    </div>
    <Result value={result} note={description} />
    {tool === "colors" && <dl className="mc-code-reference"><div><dt>Section sign</dt><dd>§{selected[0]}</dd></div><div><dt>Plugin shorthand</dt><dd>&amp;{selected[0]}</dd></div><div><dt>MOTD escape</dt><dd>{`\u00a7${selected[0]}`}</dd></div><div><dt>RGB</dt><dd>{selected[2]}</dd></div></dl>}
  </>
}

export function MinecraftWorkbench() {
  const active = useSyncExternalStore(subscribeHash, readTool, () => "nether" as ToolId)
  const [shareStatus, setShareStatus] = useState("")
  const setActive = (tool: ToolId) => {
    window.history.replaceState(window.history.state, "", `#${tool}`)
    window.dispatchEvent(new HashChangeEvent("hashchange"))
    setShareStatus("")
  }
  const ready = useSyncExternalStore(() => () => {}, () => true, () => false)
  const id = useId()
  const tool = TOOLS.find((item) => item.id === active)!
  const numeric = ["nether", "stacks", "time", "chunks", "portals", "xp"].includes(active)
  return <div className="mc-workbench">
    <div className="mc-world-bar"><span>WORLD / CREATIVE</span><span>{TOOLS.length} utilities · All local</span><span aria-hidden className="mc-hearts">♥ ♥ ♥ ♥ ♥</span></div>
    <div className="mc-inventory">
      <div className="mc-inventory-heading"><h3>Choose your tool</h3><span>Inventory</span></div>
      <div className="mc-mobile-tool-select"><Field label="Quick tool selector"><select value={active} onChange={(event) => setActive(event.target.value as ToolId)}>{TOOLS.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field></div>
      <div className="mc-slots" role="group" aria-label="Minecraft tool inventory">{TOOLS.map((item, index) => <button key={item.id} disabled={!ready} aria-pressed={item.id === active} aria-controls={id} type="button" onClick={() => setActive(item.id)} className="mc-slot" aria-label={item.name}><span className="mc-slot-number" aria-hidden>{String(index + 1).padStart(2, "0")}</span><PixelIcon icon={item.icon} /><span aria-hidden>{item.short}</span></button>)}</div>
      <div id={id} className="mc-station" aria-labelledby={`${id}-title`}>
        <header className="mc-station-heading"><PixelIcon icon={tool.icon} /><div><p className="mc-label">Crafting station / {String(TOOLS.indexOf(tool) + 1).padStart(2, "0")}</p><h3 id={`${id}-title`}>{tool.name}</h3><p>{tool.hint}</p></div></header>
        <fieldset disabled={!ready} className="mc-tool-fields" key={active}><legend className="sr-only">{tool.name}</legend>{active === "ranks" || active === "tracks" || active === "meta" ? <LuckPermsTools tool={active} /> : active === "gradient" ? <MinecraftGradientEditor /> : numeric ? <NumberTools tool={active} /> : <TextTools tool={active} />}</fieldset>
      </div>
      <div className="mc-bottom-bar"><span>Save your inventory space. Bookmark this tool.</span><button type="button" className="mc-button" onClick={async () => { try { await navigator.clipboard.writeText(window.location.href); setShareStatus("Tool link copied.") } catch { setShareStatus("Copy the address from your browser.") } }}>Share this tool ↗</button><span role="status">{shareStatus}</span><span>No account. No uploads.</span></div>
    </div>
    <p className="mc-credits">Fan-made utilities. Not affiliated with Mojang or Microsoft. Formatting references: <a href="https://learn.microsoft.com/en-us/minecraft/creator/reference/content/rawmessagejson" target="_blank" rel="noreferrer">Minecraft Creator docs ↗</a> · <a href="https://docs.papermc.io/adventure/minimessage/format/" target="_blank" rel="noreferrer">MiniMessage ↗</a></p>
  </div>
}
