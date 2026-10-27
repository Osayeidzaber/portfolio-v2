import { describe, expect, it } from "vitest"
import { metaCommands, rankCommands, trackCommands, type RankInput } from "../src/lib/luckperms"
import { gradientStops, parseGradientPreset, styledGradient, type GradientConfig } from "../src/lib/minecraft-gradient"

const rank: RankInput = { platform: "lp", console: false, server: "", world: "", group: "vip", displayName: "VIP", prefix: "&b[VIP] &r", suffix: "", weight: "100", priority: "100", parent: "default", permissions: "essentials.home\n-essentials.fly", create: true, player: "", replacePrefix: true }

describe("LuckPerms command generation", () => {
  it("preserves prefix spaces and generates allow/deny and inheritance commands", () => {
    const commands = rankCommands(rank)
    expect(commands).toContain('/lp group vip meta setprefix 100 "&b[VIP] &r"')
    expect(commands).toContain("/lp group vip parent add default")
    expect(commands).toContain("/lp group vip permission set essentials.home true")
    expect(commands).toContain("/lp group vip permission set essentials.fly false")
    expect(commands).not.toContain("/lp user")
  })
  it("switches platform/console syntax and applies contexts only to supported operations", () => {
    const commands = rankCommands({ ...rank, platform: "lpv", console: true, server: "survival", world: "world_nether", player: "Zaber", replacePrefix: false })
    expect(commands).toContain('lpv group vip meta addprefix 100 "&b[VIP] &r" server=survival world=world_nether')
    expect(commands).toContain("lpv group vip setweight 100\n")
    expect(commands).toContain("lpv user Zaber parent add vip server=survival world=world_nether")
    expect(commands).not.toContain("/lpv")
  })
  it("rejects command separators, ambiguous permissions and self inheritance", () => {
    expect(() => rankCommands({ ...rank, group: "vip\nstop" })).toThrow()
    expect(() => rankCommands({ ...rank, prefix: '"\nstop' })).toThrow()
    expect(() => rankCommands({ ...rank, parent: "vip" })).toThrow(/itself/)
    expect(() => rankCommands({ ...rank, permissions: "essentials.home\n-essentials.home" })).toThrow(/more than once/)
    expect(() => rankCommands({ ...rank, priority: "1.5" })).toThrow()
    expect(() => rankCommands({ ...rank, server: "survival world=other" })).toThrow()
  })
  it("creates ascending tracks without quietly changing group inheritance", () => {
    const options = { platform: "lp" as const, console: false, server: "", world: "", track: "ranks", groups: "default\nvip\nmvp", createGroups: false, inherit: false, createTrack: true }
    expect(trackCommands(options)).toBe("/lp createtrack ranks\n/lp track ranks append default\n/lp track ranks append vip\n/lp track ranks append mvp\n/lp track ranks info")
    expect(trackCommands({ ...options, inherit: true })).toContain("/lp group mvp parent add vip")
    expect(() => trackCommands({ ...options, groups: "vip\nvip" })).toThrow()
  })
  it("sets and unsets only the requested meta key", () => {
    const options = { platform: "lpb" as const, console: false, server: "", world: "", kind: "group" as const, target: "vip", key: "max-homes", value: "5", operation: "set" as const }
    expect(metaCommands(options)).toContain('/lpb group vip meta set max-homes "5"')
    expect(metaCommands({ ...options, operation: "unset" })).toContain("/lpb group vip meta unset max-homes\n")
    expect(metaCommands({ ...options, operation: "unset" })).not.toContain(" clear")
  })
})

describe("multi-stop Minecraft RGB designer", () => {
  const gradient: GradientConfig = { text: "ABC", colors: ["#ff0000", "#00ff00", "#0000ff"], format: "amphex", bold: true, italic: false, underline: false, strike: false, obfuscated: false, trimSpaces: true }
  it("hits all three color stops and reapplies style after each color", () => {
    expect(gradientStops(gradient.text, gradient.colors).map((letter) => letter.color)).toEqual(gradient.colors)
    expect(styledGradient(gradient)).toBe("&#ff0000&lA&#00ff00&lB&#0000ff&lC&r")
    expect(styledGradient({ ...gradient, format: "section" })).toContain("§x§f§f§0§0§0§0§lA")
  })
  it("exports structured JSON and balanced MiniMessage styling", () => {
    expect(JSON.parse(styledGradient({ ...gradient, format: "json" })).extra[1]).toMatchObject({ color: "#00ff00", bold: true, text: "B" })
    expect(styledGradient({ ...gradient, format: "mini", italic: true })).toBe("<bold><italic><gradient:#ff0000:#00ff00:#0000ff>ABC</gradient></italic></bold>")
  })
  it("keeps whitespace and validates imported presets before applying them", () => {
    expect(styledGradient({ ...gradient, text: "A B" })).toContain("A &#0000ff")
    expect(parseGradientPreset(JSON.stringify(gradient))).toEqual(gradient)
    expect(() => parseGradientPreset('{"text":"X","format":"amphex","colors":["red","blue"]}')).toThrow()
    expect(() => parseGradientPreset("not JSON")).toThrow()
    expect(() => gradientStops("X", ["#000000"])).toThrow()
  })
})
