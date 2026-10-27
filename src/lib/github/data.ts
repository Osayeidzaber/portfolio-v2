import "server-only"

import { cacheLife, cacheTag } from "next/cache"

import snapshot from "../../../content/github-snapshot.json"
import { env } from "@/lib/env"
import { fetchActivity, fetchEvents, fetchProfile, fetchReadme, fetchRepos, summarizeEvents } from "./fetch"
import { readmeExcerpt } from "./readme"
import type { GithubData } from "./types"

/** Live GitHub fetch, no caching. Used by the cached reader and the snapshot script. */
export async function loadGithubLive(): Promise<GithubData> {
  const login = env.githubUser
  const [profile, repos, events] = await Promise.all([
    fetchProfile(login),
    fetchRepos(login),
    fetchEvents(login).catch(() => []),
  ])
  const activity = await fetchActivity(login, events)
  return {
    fetchedAt: new Date().toISOString(),
    origin: "live",
    profile,
    repos,
    activity,
    events: summarizeEvents(events),
  }
}

/**
 * Everything the site shows from GitHub. Refreshes hourly in the background, and
 * immediately when the webhook calls revalidateTag('github'). If GitHub is down or
 * rate-limited, the bundled snapshot keeps the page populated with real (older) data.
 */
export async function getGithubData(): Promise<GithubData> {
  "use cache"
  cacheLife({ stale: 300, revalidate: 3600, expire: 86_400 })
  cacheTag("github")
  try {
    return await loadGithubLive()
  } catch (err) {
    console.warn("[github] live fetch failed; serving snapshot:", (err as Error).message)
    return { ...(snapshot as unknown as GithubData), origin: "snapshot" }
  }
}

export async function getReadmeExcerpt(fullName: string): Promise<string> {
  "use cache"
  cacheLife("hours")
  cacheTag("github", `readme:${fullName.toLowerCase()}`)
  return readmeExcerpt(await fetchReadme(fullName))
}

/** Full Markdown for case studies; keep the saved public README when GitHub is unavailable. */
export async function getProjectReadme(fullName: string): Promise<string> {
  "use cache"
  cacheLife("hours")
  cacheTag("github", `readme:${fullName.toLowerCase()}`)
  const live = await fetchReadme(fullName)
  const saved = (snapshot as unknown as GithubData).readmes?.[fullName.toLowerCase()] ?? ""
  return (live || saved).slice(0, 30_000)
}
