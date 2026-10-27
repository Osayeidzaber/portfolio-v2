import "server-only"

import { cacheLife, cacheTag } from "next/cache"

import bundled from "../../../content/site.json"
import { canPublish } from "@/lib/env"
import { parseContent, type SiteContent } from "./schema"
import { readRepoFile } from "./store"

export const CONTENT_PATH = "content/site.json"
export const DRAFT_PATH = "content/draft.json"

export function bundledContent(): SiteContent {
  const parsed = parseContent(bundled)
  if (!parsed.success) throw new Error(`Bundled content/site.json is invalid: ${parsed.error.message}`)
  return parsed.data
}

/**
 * Published content for the public site. Comes from the content repo when it is
 * configured (so admin saves show up without a redeploy) and falls back to the copy
 * bundled at build time if GitHub is unreachable or the remote file is invalid.
 */
export async function getContent(): Promise<SiteContent> {
  "use cache"
  cacheLife("hours")
  cacheTag("content")

  if (!canPublish()) return bundledContent()
  try {
    const file = await readRepoFile(CONTENT_PATH)
    if (!file) return bundledContent()
    const parsed = parseContent(JSON.parse(file.text))
    if (parsed.success) return parsed.data
    console.error("[content] remote site.json failed validation; using bundled copy", parsed.error.issues.slice(0, 3))
  } catch (err) {
    console.error("[content] could not read remote content; using bundled copy", err)
  }
  return bundledContent()
}

export const visible = <T extends { placeholder?: boolean }>(items: T[]) => items.filter((i) => !i.placeholder)
