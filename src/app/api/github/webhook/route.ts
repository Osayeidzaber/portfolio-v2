import { revalidateTag } from "next/cache"

import { env } from "@/lib/env"
import { RELEVANT_EVENTS, verifyGithubSignature } from "@/lib/github/webhook"

/*
 * GitHub webhook (user- or repo-level). On a verified event the GitHub cache is marked
 * stale, and a push touching content/ also refreshes the content cache — so edits made
 * directly on GitHub show up too.
 */
export async function POST(req: Request) {
  if (!env.webhookSecret) return Response.json({ ok: false, error: "Webhook not configured" }, { status: 503 })

  const raw = await req.text()
  if (raw.length > 5_000_000) return Response.json({ ok: false }, { status: 413 })
  if (!verifyGithubSignature(raw, req.headers.get("x-hub-signature-256"), env.webhookSecret)) {
    return Response.json({ ok: false, error: "Bad signature" }, { status: 401 })
  }

  const event = req.headers.get("x-github-event") ?? ""
  if (!RELEVANT_EVENTS.has(event)) return Response.json({ ok: true, ignored: event })

  const tags = ["github", "thumbnails"]
  if (event === "push") {
    try {
      const body = JSON.parse(raw) as {
        repository?: { full_name?: string }
        commits?: Array<{ added?: string[]; modified?: string[]; removed?: string[] }>
      }
      const touchedContent = (body.commits ?? []).some((c) =>
        [...(c.added ?? []), ...(c.modified ?? []), ...(c.removed ?? [])].some((f) => f.startsWith("content/")),
      )
      if (body.repository?.full_name?.toLowerCase() === env.contentRepo.toLowerCase() && touchedContent) {
        tags.push("content")
      }
    } catch {
      /* payload not JSON (form-encoded webhook); GitHub tags are still refreshed */
    }
  }
  for (const tag of tags) revalidateTag(tag, "max")
  return Response.json({ ok: true, event, revalidated: tags })
}
