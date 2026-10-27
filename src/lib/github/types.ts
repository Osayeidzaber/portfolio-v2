export type GithubProfile = {
  login: string
  name: string
  avatarUrl: string
  bio: string
  location: string
  blog: string
  followers: number
  publicRepos: number
  createdAt: string
  htmlUrl: string
}

export type GithubRepo = {
  name: string
  fullName: string
  description: string
  htmlUrl: string
  homepage: string
  language: string
  languages: Record<string, number>
  stars: number
  forks: number
  topics: string[]
  createdAt: string
  updatedAt: string
  pushedAt: string
  fork: boolean
  archived: boolean
  size: number
}

export type ActivityDay = { date: string; count: number }

export type GithubActivity = {
  /** `calendar` = GitHub's contribution calendar (needs a token); `events` = public events, last ~90 days. */
  source: "calendar" | "events"
  days: ActivityDay[]
  total: number
}

export type GithubEvent = {
  id: string
  type: string
  repo: string
  date: string
  summary: string
}

export type GithubData = {
  fetchedAt: string
  /** `live` straight from the API, `snapshot` when the API failed and the bundled copy was used. */
  origin: "live" | "snapshot"
  profile: GithubProfile
  repos: GithubRepo[]
  activity: GithubActivity
  events: GithubEvent[]
  /** Public repository README fallbacks, refreshed at build time. */
  readmes?: Record<string, string>
}
