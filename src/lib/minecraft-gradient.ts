export type GradientFormat = "amphex" | "ampx" | "section" | "mini" | "json" | "legacy"
export type GradientConfig = { text: string; colors: string[]; format: GradientFormat; bold: boolean; italic: boolean; underline: boolean; strike: boolean; obfuscated: boolean; trimSpaces: boolean }
import { closestLegacy } from "./minecraft"

export function gradientStops(text: string, colors: string[]) {
  if (colors.length < 2 || colors.length > 8 || colors.some((color) => !/^#[0-9a-f]{6}$/i.test(color))) throw new Error("Choose 2–8 colors in #RRGGBB format.")
  if (Array.from(text).length > 120) throw new Error("Keep gradient text to 120 characters.")
  const letters = Array.from(text)
  return letters.map((letter, index) => {
    const position = index / Math.max(1, letters.length - 1) * (colors.length - 1)
    const segment = Math.min(Math.floor(position), colors.length - 2), t = position - segment
    const color = `#${[1, 3, 5].map((offset) => {
      const a = parseInt(colors[segment].slice(offset, offset + 2), 16), b = parseInt(colors[segment + 1].slice(offset, offset + 2), 16)
      return Math.round(a + (b - a) * t).toString(16).padStart(2, "0")
    }).join("")}`
    return { text: letter, color }
  })
}

export function styledGradient(config: GradientConfig) {
  const letters = gradientStops(config.text, config.colors)
  const enabled = [["bold", "l", config.bold], ["italic", "o", config.italic], ["underlined", "n", config.underline], ["strikethrough", "m", config.strike], ["obfuscated", "k", config.obfuscated]] as const
  if (config.format === "json") return JSON.stringify({ text: "", extra: letters.map((letter) => ({ ...letter, ...Object.fromEntries(enabled.map(([name, , on]) => [name, on])) })) })
  if (config.format === "mini") {
    const tags = [["bold", config.bold], ["italic", config.italic], ["underlined", config.underline], ["strikethrough", config.strike], ["obfuscated", config.obfuscated]] as const
    const active = tags.filter(([, enabled]) => enabled).map(([tag]) => tag)
    const text = config.text.replace(/\\/g, "\\\\").replace(/</g, "\\<")
    return `${active.map((tag) => `<${tag}>`).join("")}<gradient:${config.colors.join(":")}>${text}</gradient>${[...active].reverse().map((tag) => `</${tag}>`).join("")}`
  }
  const prefix = config.format === "section" ? "§" : "&"
  const styles = enabled.filter(([, , on]) => on).map(([, code]) => `${prefix}${code}`).join("")
  const result = letters.map((letter) => {
    if (config.trimSpaces && /^\s$/.test(letter.text)) return letter.text
    const hex = letter.color.slice(1)
    const color = config.format === "legacy" ? `${prefix}${closestLegacy(letter.color)[0]}` : config.format === "amphex" ? `&#${hex}` : `${prefix}x${Array.from(hex).map((digit) => prefix + digit).join("")}`
    return `${color}${styles}${letter.text}`
  }).join("")
  return result ? `${result}${prefix}r` : ""
}

export function parseGradientPreset(raw: string): GradientConfig {
  if (raw.length > 20_000) throw new Error("That preset is too large.")
  let value: unknown
  try { value = JSON.parse(raw) } catch { throw new Error("Paste a valid JSON gradient preset.") }
  if (!value || typeof value !== "object") throw new Error("Preset must be an object.")
  const preset = value as Partial<GradientConfig>
  if (typeof preset.text !== "string" || !Array.isArray(preset.colors) || !["amphex", "ampx", "section", "mini", "json", "legacy"].includes(preset.format ?? "")) throw new Error("Preset needs text, colors and a supported format.")
  gradientStops(preset.text, preset.colors)
  return { text: preset.text, colors: preset.colors, format: preset.format!, bold: preset.bold === true, italic: preset.italic === true, underline: preset.underline === true, strike: preset.strike === true, obfuscated: preset.obfuscated === true, trimSpaces: preset.trimSpaces !== false }
}
