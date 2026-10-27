import { ImageResponse } from "next/og"

export const alt = "Zaber's Minecraft Crafting Room — 13 free Minecraft and LuckPerms tools"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function Image() {
  return new ImageResponse(<div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#17251d", color: "#f3f4de", padding: 60, borderBottom: "24px solid #6c9e40", fontFamily: "monospace" }}>
    <div style={{ display: "flex", justifyContent: "space-between", color: "#b8d692", fontSize: 24 }}><span>ZABER.TECH / MINECRAFT</span><span>13 FREE TOOLS</span></div>
    <div style={{ display: "flex", flexDirection: "column", fontSize: 104, fontWeight: 800, lineHeight: 1.05, letterSpacing: -4 }}><span>THE CRAFTING</span><span style={{ color: "#b9ed7a" }}>ROOM</span></div>
    <div style={{ display: "flex", fontSize: 28, color: "#d2d2bf" }}>Coordinates · RGB gradients · LuckPerms ranks</div>
  </div>, size)
}
