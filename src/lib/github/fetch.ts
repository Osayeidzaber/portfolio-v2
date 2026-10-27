import "server-only"

import { env } from "@/lib/env"
import type { ActivityDay, GithubActivity, GithubEvent, GithubProfile, GithubRepo } from "./types"

/* Raw GitHub reads. Callers wrap these in 'use cache'; nothing here caches on its own. */

const API = "https://api.github.com"

export class GithubError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = "GithubError"
  }
}

async function gh<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "osayeed-portfolio",
      ...(env.githubToken ? { Authorization: `Bearer ${env.githubToken}` } : {}),
      ...init?.headers,
    },
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) {
    const remaining = res.headers.get("x-ratelimit-remaining")
    throw new GithubError(
      remaining === "0" ? `GitHub rate limit reached on ${path}` : `GitHub ${res.status} on ${path}`,
      res.status,
    )
  }
  return res.json() as Promise<T>
}

type ApiUser = {
  login: string
  name: string | null
  avatar_url: string
  bio: string | null
  location: string | null
  blog: string | null
  followers: number
  public_repos: number
  created_at: string
  html_url: string
}

type ApiRepo = {
  name: string
  full_name: string
  description: string | null
  html_url: string
  homepage: string | null
  language: string | null
  stargazers_count: number
  forks_count: number
  topics?: string[]
  created_at: string
  updated_at: string
  pushed_at: string
  fork: boolean
  archived: boolean
  size: number
}

export async function fetchProfile(login: string): Promise<GithubProfile> {
  const u = await gh<ApiUser>(`/users/${encodeURIComponent(login)}`)
  return {
    login: u.login,
    name: u.name ?? u.login,
    avatarUrl: u.avatar_url,
    bio: u.bio ?? "",
    location: u.location ?? "",
    blog: u.blog ?? "",
    followers: u.followers,
    publicRepos: u.public_repos,
    createdAt: u.created_at,
    htmlUrl: u.html_url,
  }
}

export async function fetchRepos(login: string): Promise<GithubRepo[]> {
  const repos: ApiRepo[] = []
  for (let page = 1; page <= 3; page++) {
    const batch = await gh<ApiRepo[]>(
      `/users/${encodeURIComponent(login)}/repos?per_page=100&sort=pushed&type=owner&page=${page}`,
    )
    repos.push(...batch)
    if (batch.length < 100) break
  }
  const languages = await Promise.all(
    repos.map((r) =>
      r.fork
        ? Promise.resolve({})
        : gh<Record<string, number>>(`/repos/${r.full_name}/languages`).catch(() => ({}) as Record<string, number>),
    ),
  )
  return repos.map((r, i) => ({
    name: r.name,
    fullName: r.full_name,
    description: r.description ?? "",
    htmlUrl: r.html_url,
    homepage: r.homepage ?? "",
    language: r.language ?? "",
    languages: languages[i],
    stars: r.stargazers_count,
    forks: r.forks_count,
    topics: r.topics ?? [],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    pushedAt: r.pushed_at,
    fork: r.fork,
    archived: r.archived,
    size: r.size,
  }))
}

/** GitHub's contribution calendar. Requires a token (GraphQL rejects anonymous calls). */
async function fetchCalendar(login: string): Promise<GithubActivity> {
  const query = `query($login:String!){user(login:$login){contributionsCollection{contributionCalendar{totalContributions weeks{contributionDays{date contributionCount}}}}}}`
  const res = await fetch(`${API}/graphql`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.githubToken}`,
      "Content-Type": "application/json",
      "User-Agent": "osayeed-portfolio",
    },
    body: JSON.stringify({ query, variables: { login } }),
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) throw new GithubError(`GitHub GraphQL ${res.status}`, res.status)
  const json = (await res.json()) as {
    data?: {
      user?: {
        contributionsCollection: {
          contributionCalendar: {
            totalContributions: number
            weeks: Array<{ contributionDays: Array<{ date: string; contributionCount: number }> }>
          }
        }
      }
    }
    errors?: unknown[]
  }
  const cal = json.data?.user?.contributionsCollection.contributionCalendar
  if (!cal) throw new GithubError("GitHub GraphQL returned no calendar", 502)
  const days = cal.weeks.flatMap((w) => w.contributionDays.map((d) => ({ date: d.date, count: d.contributionCount })))
  return { source: "calendar", days, total: cal.totalContributions }
}

type ApiEvent = {
  id: string
  type: string
  repo: { name: string }
  created_at: string
  payload: { size?: number; ref_type?: string; action?: string; commits?: unknown[] }
}

export async function fetchEvents(login: string): Promise<ApiEvent[]> {
  const events: ApiEvent[] = []
  for (let page = 1; page <= 3; page++) {
    const batch = await gh<ApiEvent[]>(`/users/${encodeURIComponent(login)}/events/public?per_page=100&page=${page}`)
    events.push(...batch)
    if (batch.length < 100) break
  }
  return events
}

function eventWeight(e: ApiEvent) {
  if (e.type === "PushEvent") return Math.max(1, e.payload.size ?? e.payload.commits?.length ?? 1)
  return 1
}

/** Activity from public events when no token is configured: only about the last 90 days. */
export function activityFromEvents(events: ApiEvent[], now = new Date()): GithubActivity {
  const counts = new Map<string, number>()
  for (const e of events) {
    const day = e.created_at.slice(0, 10)
    counts.set(day, (counts.get(day) ?? 0) + eventWeight(e))
  }
  const days: ActivityDay[] = []
  const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  for (let t = end - 89 * 86_400_000; t <= end; t += 86_400_000) {
    const date = new Date(t).toISOString().slice(0, 10)
    days.push({ date, count: counts.get(date) ?? 0 })
  }
  return { source: "events", days, total: days.reduce((a, d) => a + d.count, 0) }
}

export function summarizeEvents(events: ApiEvent[]): GithubEvent[] {
  const describe = (e: ApiEvent) => {
    switch (e.type) {
      case "PushEvent": {
        const n = e.payload.size ?? e.payload.commits?.length
        return n ? `Pushed ${n} commit${n === 1 ? "" : "s"}` : "Pushed commits"
      }
      case "CreateEvent":
        return e.payload.ref_type === "repository" ? "Created repository" : `Created ${e.payload.ref_type ?? "ref"}`
      case "PullRequestEvent":
        return `${e.payload.action === "closed" ? "Closed" : "Opened"} a pull request`
      case "IssuesEvent":
        return `${e.payload.action === "closed" ? "Closed" : "Opened"} an issue`
      case "ReleaseEvent":
        return "Published a release"
      case "WatchEvent":
        return "Starred"
      case "PublicEvent":
        return "Made public"
      default:
        return e.type.replace(/Event$/, "")
    }
  }
  return events.slice(0, 12).map((e) => ({
    id: e.id,
    type: e.type,
    repo: e.repo.name,
    date: e.created_at,
    summary: describe(e),
  }))
}

export async function fetchActivity(login: string, events: ApiEvent[]): Promise<GithubActivity> {
  if (env.githubToken) {
    try {
      return await fetchCalendar(login)
    } catch (err) {
      console.warn("[github] contribution calendar failed, using public events:", (err as Error).message)
    }
  }
  return activityFromEvents(events)
}

export async function fetchReadme(fullName: string): Promise<string> {
  try {
    const res = await fetch(`${API}/repos/${fullName}/readme`, {
      headers: {
        Accept: "application/vnd.github.raw",
        "User-Agent": "osayeed-portfolio",
        ...(env.githubToken ? { Authorization: `Bearer ${env.githubToken}` } : {}),
      },
      signal: AbortSignal.timeout(10_000),
    })
    return res.ok ? await res.text() : ""
  } catch {
    return ""
  }
}
