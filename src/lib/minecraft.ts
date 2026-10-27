/** Game math uses block coordinates (floor, including negative values), not truncation. */
export function convertCoordinates(x: number, z: number, from: "overworld" | "nether") {
  const scale = from === "overworld" ? 1 / 8 : 8
  return { x: x * scale, z: z * scale, blockX: Math.floor(x * scale), blockZ: Math.floor(z * scale) }
}

export function chunkAt(x: number, z: number) {
  const blockX = Math.floor(x), blockZ = Math.floor(z)
  const chunkX = Math.floor(blockX / 16), chunkZ = Math.floor(blockZ / 16)
  return { x: chunkX, z: chunkZ, minX: chunkX * 16, maxX: chunkX * 16 + 15, minZ: chunkZ * 16, maxZ: chunkZ * 16 + 15, localX: blockX - chunkX * 16, localZ: blockZ - chunkZ * 16 }
}

export function stackCount(quantity: number, size: number) {
  return { stacks: Math.floor(quantity / size), leftover: quantity % size, slots: Math.ceil(quantity / size), shulkers: Math.floor(quantity / (size * 27)), looseAfterShulkers: quantity % (size * 27) }
}

/** Total XP at the beginning of a level, before progress toward the next level. */
export function xpAtLevel(level: number) {
  if (!Number.isInteger(level) || level < 0 || level > 10_000) throw new Error("Use whole levels from 0 to 10,000.")
  if (level <= 16) return level * level + 6 * level
  if (level <= 31) return (5 * level * level - 81 * level + 720) / 2
  return (9 * level * level - 325 * level + 4440) / 2
}

export type Edition = "java" | "bedrock"
export const LEGACY_COLORS = [
  ["0", "Black", "#000000"], ["1", "Dark blue", "#0000aa"], ["2", "Dark green", "#00aa00"], ["3", "Dark aqua", "#00aaaa"],
  ["4", "Dark red", "#aa0000"], ["5", "Dark purple", "#aa00aa"], ["6", "Gold", "#ffaa00"], ["7", "Gray", "#aaaaaa"],
  ["8", "Dark gray", "#555555"], ["9", "Blue", "#5555ff"], ["a", "Green", "#55ff55"], ["b", "Aqua", "#55ffff"],
  ["c", "Red", "#ff5555"], ["d", "Light purple", "#ff55ff"], ["e", "Yellow", "#ffff55"], ["f", "White", "#ffffff"],
] as const
export const BEDROCK_COLORS = [
  ["g", "Minecoin gold", "#ddd605"], ["h", "Quartz", "#e3d4d1"], ["i", "Iron", "#cecaca"], ["j", "Netherite", "#443a3b"],
  ["m", "Redstone", "#971607"], ["n", "Copper", "#b4684d"], ["p", "Gold material", "#deb12d"], ["q", "Emerald", "#47a036"],
  ["s", "Diamond", "#2cbaa8"], ["t", "Lapis", "#21497b"], ["u", "Amethyst", "#9a5cc6"],
] as const

export const paletteFor = (edition: Edition) => edition === "java" ? [...LEGACY_COLORS] : [...LEGACY_COLORS, ...BEDROCK_COLORS]
const rgb = (hex: string) => [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16))
export function gradientLetters(text: string, start: string, end: string) {
  const a = rgb(start), b = rgb(end), letters = Array.from(text)
  return letters.map((text, index) => ({ text, color: `#${a.map((channel, i) => Math.round(channel + (b[i] - channel) * index / Math.max(1, letters.length - 1)).toString(16).padStart(2, "0")).join("")}` }))
}
export function closestLegacy(hex: string) {
  const value = rgb(hex)
  return [...LEGACY_COLORS].sort((a, b) => rgb(a[2]).reduce((sum, channel, i) => sum + (channel - value[i]) ** 2, 0) - rgb(b[2]).reduce((sum, channel, i) => sum + (channel - value[i]) ** 2, 0))[0]
}
export function gradientOutput(text: string, start: string, end: string, format: "json" | "mini" | "legacy") {
  if (format === "mini") return `<gradient:${start}:${end}>${text.replace(/\\/g, "\\\\").replace(/</g, "\\<")}</gradient>`
  const letters = gradientLetters(text, start, end)
  if (format === "legacy") return letters.map((letter) => `§${closestLegacy(letter.color)[0]}${letter.text}`).join("") + "§r"
  return JSON.stringify({ text: "", extra: letters })
}

export type TextRun = { text: string; color: string; bold?: boolean; italic?: boolean; underline?: boolean; strike?: boolean; obfuscated?: boolean }
/** Plain data only; the preview never evaluates HTML or user-supplied styles. */
export function parseMinecraftText(text: string, edition: Edition): TextRun[] {
  const runs: TextRun[] = []
  const colors = paletteFor(edition)
  let style: Omit<TextRun, "text"> = { color: "#ffffff" }
  const normalized = text.replace(/\\u00a7/gi, "§").replace(/\\n/g, "\n")
  let buffer = ""
  const flush = () => { if (buffer) runs.push({ text: buffer, ...style }); buffer = "" }
  for (let i = 0; i < normalized.length; i++) {
    const code = normalized[i + 1]?.toLowerCase()
    const color = colors.find(([key]) => key === code)
    const format = edition === "java" ? "klmnor" : "klor"
    if ((normalized[i] === "§" || normalized[i] === "&") && code && (color || format.includes(code))) {
      flush()
      if (color) style = edition === "java" ? { color: color[2] } : { ...style, color: color[2] }
      else if (code === "r") style = { color: "#ffffff" }
      else if (code === "l") style.bold = true
      else if (code === "o") style.italic = true
      else if (code === "n") style.underline = true
      else if (code === "m") style.strike = true
      else if (code === "k") style.obfuscated = true
      i++
    } else buffer += normalized[i]
  }
  flush()
  return runs
}

export function motdProperty(text: string) {
  const section = text.replace(/\\u00a7/gi, "§").replace(/&([0-9a-fk-or])/gi, "§$1").replace(/\\n/g, "\n")
  return `motd=${section.replace(/\\/g, "\\\\").replace(/§/g, "\\u00a7").replace(/\r?\n/g, "\\n")}`
}
