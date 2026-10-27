import { ImageResponse } from "next/og"

export const alt = "OZ Studio — Independent design and development"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"
export default function Image() {
  return new ImageResponse(<div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#000", color: "#f2f2f2", padding: "64px", justifyContent: "space-between" }}><div style={{ display: "flex", justifyContent: "space-between", fontSize: 22, letterSpacing: 4 }}><span>OZ STUDIO</span><span>INDEPENDENT BY DESIGN</span></div><div style={{ display: "flex", flexDirection: "column", fontSize: 100, letterSpacing: -6, lineHeight: 1.03 }}><span>Good ideas.</span><span>Built properly.</span></div><div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #3a3a3a", paddingTop: 24, fontSize: 22 }}><span>Design & development by Osayeed Zaber</span><span>zaber.tech/oz-studio</span></div></div>, size)
}
