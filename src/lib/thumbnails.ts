import "server-only"

import { cacheLife, cacheTag } from "next/cache"

/*
 * Picks a genuine image for a project, in order:
 *   1. a thumbnail uploaded in the admin
 *   2. the live site's own og:image / twitter:image
 * Nothing is fabricated; when neither exists the route draws a black typographic card
 * (GitHub's own repo cards are white and fight the all-black page).
 */

const PRIVATE_HOST = /^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|0\.|\[?::1\]?$|.*\.internal$|.*\.local$)/i

export function isPublicHttpsUrl(raw: string): boolean {
  try {
    const u = new URL(raw)
    return u.protocol === "https:" && !PRIVATE_HOST.test(u.hostname)
  } catch {
    return false
  }
}

export function extractOgImage(html: string, base: string): string {
  const metas = html.match(/<meta\b[^>]*>/gi) ?? []
  for (const key of ["og:image:secure_url", "og:image", "twitter:image", "twitter:image:src"]) {
    for (const tag of metas) {
      const name = /(?:property|name)\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1]?.toLowerCase()
      if (name !== key) continue
      const content = /content\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1]
      if (!content) continue
      try {
        return new URL(content.replace(/&amp;/g, "&"), base).toString()
      } catch {
        /* ignore malformed */
      }
    }
  }
  return ""
}

/** Cached for a day per site: one HTML fetch, not one per visitor. */
export async function findOgImage(liveUrl: string): Promise<string> {
  "use cache"
  cacheLife("days")
  cacheTag("thumbnails")
  if (!isPublicHttpsUrl(liveUrl)) return ""
  try {
    const res = await fetch(liveUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; osayeed-portfolio/1.0)", Accept: "text/html" },
      redirect: "follow",
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok || !(res.headers.get("content-type") ?? "").includes("html")) return ""
    const html = (await res.text()).slice(0, 300_000)
    const found = extractOgImage(html, res.url || liveUrl)
    return found && isPublicHttpsUrl(found) ? found : ""
  } catch {
    return ""
  }
}

export function fallbackCard(title: string, category: string): string {
  const esc = (s: string) => s.replace(/[<>&"']/g, (c) => `&#${c.charCodeAt(0)};`)
  // Roughly 0.56em per glyph in a heavy grotesk: shrink long titles to fit 1080px.
  const size = Math.min(120, Math.floor(1080 / Math.max(1, title.length * 0.56)))
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="750" viewBox="0 0 1200 750">
<rect width="1200" height="750" fill="#000"/>
<circle cx="900" cy="300" r="420" fill="none" stroke="#1f1f1f"/>
<circle cx="900" cy="300" r="260" fill="none" stroke="#1f1f1f"/>
<text x="64" y="96" fill="#8a8a8a" font-family="monospace" font-size="22" letter-spacing="4">${esc(category.toUpperCase())}</text>
<text x="60" y="660" fill="#f2f2f2" font-family="Helvetica, Arial, sans-serif" font-weight="800" font-size="${size}" letter-spacing="${-size / 24}">${esc(title)}</text>
</svg>`
}
