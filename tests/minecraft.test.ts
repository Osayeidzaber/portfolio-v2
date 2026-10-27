import { describe, expect, it } from "vitest"
import { chunkAt, convertCoordinates, gradientLetters, gradientOutput, motdProperty, parseMinecraftText, stackCount, xpAtLevel } from "../src/lib/minecraft"

describe("Minecraft coordinate and inventory math", () => {
  it("converts both ways without scaling Y and floors negative portal blocks", () => {
    expect(convertCoordinates(128, -257, "overworld")).toEqual({ x: 16, z: -32.125, blockX: 16, blockZ: -33 })
    expect(convertCoordinates(16, -32, "nether")).toEqual({ x: 128, z: -256, blockX: 128, blockZ: -256 })
  })
  it("keeps chunks and local coordinates correct across the origin", () => {
    expect(chunkAt(-1, -16)).toEqual({ x: -1, z: -1, minX: -16, maxX: -1, minZ: -16, maxZ: -1, localX: 15, localZ: 0 })
    expect(chunkAt(16, -16.1)).toMatchObject({ x: 1, z: -2, localX: 0, localZ: 15 })
  })
  it("handles empty, partial, full and unstackable inventories", () => {
    expect(stackCount(0, 64)).toMatchObject({ stacks: 0, leftover: 0, slots: 0 })
    expect(stackCount(130, 64)).toMatchObject({ stacks: 2, leftover: 2, slots: 3 })
    expect(stackCount(1728, 64)).toMatchObject({ shulkers: 1, looseAfterShulkers: 0 })
    expect(stackCount(17, 16)).toMatchObject({ stacks: 1, leftover: 1, slots: 2 })
    expect(stackCount(17, 1)).toMatchObject({ stacks: 17, leftover: 0, slots: 17 })
  })
  it("matches XP totals at both formula boundaries and familiar targets", () => {
    for (const [level, xp] of [[0, 0], [1, 7], [16, 352], [17, 394], [30, 1395], [31, 1507], [32, 1628], [40, 2920]]) expect(xpAtLevel(level)).toBe(xp)
    expect(xpAtLevel(32) - xpAtLevel(31)).toBe(121)
    expect(() => xpAtLevel(-1)).toThrow()
    expect(() => xpAtLevel(1.5)).toThrow()
  })
})

describe("Minecraft text exports", () => {
  it("preserves gradient endpoints and supplementary Unicode characters", () => {
    expect(gradientLetters("A😀Z", "#000000", "#ffffff")).toEqual([{ text: "A", color: "#000000" }, { text: "😀", color: "#808080" }, { text: "Z", color: "#ffffff" }])
    expect(gradientLetters("A", "#123456", "#ffffff")[0].color).toBe("#123456")
    expect(JSON.parse(gradientOutput('"hello"', "#000000", "#ffffff", "json")).extra[0].text).toBe('"')
    expect(gradientOutput("<red>Hello", "#000000", "#ffffff", "mini")).toContain("\\<red>")
  })
  it("applies color resets in Java and preserves formats in Bedrock", () => {
    expect(parseMinecraftText("&lBold&aGreen", "java")).toEqual([{ text: "Bold", color: "#ffffff", bold: true }, { text: "Green", color: "#55ff55" }])
    expect(parseMinecraftText("&lBold&aGreen", "bedrock")[1]).toMatchObject({ bold: true, color: "#55ff55" })
    expect(parseMinecraftText("§mtest", "java")[0].strike).toBe(true)
    expect(parseMinecraftText("§mtest", "bedrock")[0]).toMatchObject({ color: "#971607" })
    expect(parseMinecraftText("§rreset", "java")[0]).toEqual({ text: "reset", color: "#ffffff" })
  })
  it("exports server.properties escapes without double-escaping supplied section codes", () => {
    expect(motdProperty("&aHello\n&fWorld")).toBe("motd=\\u00a7aHello\\n\\u00a7fWorld")
    expect(motdProperty("\\u00a7aHello")).toBe("motd=\\u00a7aHello")
    expect(parseMinecraftText("\\u00a7aHi\\nthere", "java")[0]).toMatchObject({ text: "Hi\nthere", color: "#55ff55" })
  })
})
