import { getContent } from "@/lib/content/read"
import { readMedia } from "@/lib/media"
import { getGithubData } from "@/lib/github/data"
import { buildProjects } from "@/lib/projects"
import { fallbackCard, findOgImage, isPublicHttpsUrl } from "@/lib/thumbnails"

/*
 * Same-origin project image. Only resolves images for projects the site knows about
 * (no arbitrary URL parameter), so it cannot be used as an open proxy. Same-origin
 * matters: the WebGL carousel can only sample textures without CORS trouble.
 */

const MAX_BYTES = 6 * 1024 * 1024
const CACHE = "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800"

async function fetchImage(url: string): Promise<Response | null> {
  if (!isPublicHttpsUrl(url)) return null
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000), headers: { "User-Agent": "osayeed-portfolio" } })
    const type = res.headers.get("content-type") ?? ""
    if (!res.ok || !type.startsWith("image/")) return null
    const bytes = await res.arrayBuffer()
    if (bytes.byteLength > MAX_BYTES) return null
    return new Response(bytes, { headers: { "Content-Type": type, "Cache-Control": CACHE } })
  } catch {
    return null
  }
}

export async function GET(_req: Request, ctx: RouteContext<"/api/thumb/[slug]">) {
  const { slug } = await ctx.params
  const [content, github] = await Promise.all([getContent(), getGithubData()])
  const project = buildProjects(content, github).find((p) => p.slug === slug)
  if (!project) return new Response("Not found", { status: 404 })

  const curated = content.projects.find((p) => p.slug === slug)
  const own = curated?.thumbnail ?? ""
  if (own.startsWith("/media/")) {
    const file = await readMedia(own.slice("/media/".length))
    if (file) return new Response(file.bytes, { headers: { "Content-Type": file.type, "Cache-Control": CACHE } })
  } else if (own) {
    const res = await fetchImage(own)
    if (res) return res
  }

  if (project.liveUrl) {
    const og = await findOgImage(project.liveUrl)
    if (og) {
      const res = await fetchImage(og)
      if (res) return res
    }
  }

  return new Response(fallbackCard(project.title, project.category), {
    headers: { "Content-Type": "image/svg+xml", "Cache-Control": CACHE },
  })
}
