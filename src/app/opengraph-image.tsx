import { ImageResponse } from "next/og"

import { getContent } from "@/lib/content/read"

export const alt = "Osayeed Zaber — Full-stack developer"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default async function OpengraphImage() {
  const { profile } = await getContent()
  const [first, ...rest] = profile.name.split(" ")
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#000",
          color: "#f2f2f2",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22, letterSpacing: 4, color: "#8a8a8a" }}>
          <span>OZ — VOL. 26</span>
          <span>{profile.location.toUpperCase()}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 0.86 }}>
          <span style={{ fontSize: 168, fontWeight: 800, letterSpacing: -8 }}>{first}</span>
          <span style={{ fontSize: 168, fontWeight: 300, letterSpacing: -8 }}>{rest.join(" ")}</span>
        </div>
        <div style={{ display: "flex", fontSize: 34, color: "#bdbdbd" }}>{profile.title} — {profile.roles.slice(0, 3).join(", ")}</div>
      </div>
    ),
    size,
  )
}
