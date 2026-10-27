import { timingSafeEqual } from "node:crypto"

import { revalidateTag } from "next/cache"

import { env } from "@/lib/env"

const ALLOWED = new Set(["github", "content", "thumbnails"])

/** Manual refresh, e.g. from a cron or a curl: POST with `Authorization: Bearer <REVALIDATE_SECRET>`. */
export async function POST(req: Request) {
  const secret = env.revalidateSecret
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "")
  const ok =
    secret.length >= 16 &&
    given.length === secret.length &&
    timingSafeEqual(Buffer.from(given), Buffer.from(secret))
  if (!ok) return Response.json({ ok: false }, { status: 401 })

  const url = new URL(req.url)
  const tags = (url.searchParams.get("tags") ?? "github,content").split(",").filter((t) => ALLOWED.has(t))
  for (const tag of tags) revalidateTag(tag, "max")
  return Response.json({ ok: true, revalidated: tags })
}
