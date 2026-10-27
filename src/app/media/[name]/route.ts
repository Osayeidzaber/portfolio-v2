import { readMedia } from "@/lib/media"

/** Serves admin uploads. Names are content-hashed, so responses are immutable. */
export async function GET(_req: Request, ctx: RouteContext<"/media/[name]">) {
  const { name } = await ctx.params
  const file = await readMedia(name)
  if (!file) return new Response("Not found", { status: 404 })
  return new Response(file.bytes, {
    headers: {
      "Content-Type": file.type,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      ...(file.type === "application/pdf" ? { "Content-Disposition": `inline; filename="${name}"` } : {}),
    },
  })
}
