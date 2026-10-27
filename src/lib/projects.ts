import type { Project, SiteContent } from "@/lib/content/schema"
import { languageShares, rankRepos } from "@/lib/github/rank"
import type { GithubData, GithubRepo } from "@/lib/github/types"

/** What the public site renders for a project: content overrides merged onto GitHub data. */
export type ProjectView = {
  slug: string
  title: string
  description: string
  body: string
  category: string
  tech: string[]
  languages: Array<{ language: string; share: number }>
  repoUrl: string
  repoFullName: string
  liveUrl: string
  /** Same-origin image URL (safe for WebGL textures). */
  image: string
  hasCustomImage: boolean
  gallery: Array<{ src: string; alt: string }>
  featured: boolean
  stars: number
  forks: number
  topics: string[]
  createdAt: string
  pushedAt: string
  /** true when it was picked by ranking rather than curated in the admin. */
  auto: boolean
}

export const slugify = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "project"

const titleize = (name: string) =>
  name
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim()

function repoLanguages(repo?: GithubRepo) {
  return repo ? languageShares([repo]).map(({ language, share }) => ({ language, share })) : []
}

function fromCurated(p: Project, repo?: GithubRepo): ProjectView {
  return {
    slug: p.slug,
    title: p.title,
    description: p.description || repo?.description || "",
    body: p.body,
    category: p.category,
    tech: p.tech.length ? p.tech : repo?.language ? [repo.language] : [],
    languages: repoLanguages(repo),
    repoUrl: repo?.htmlUrl ?? (p.repo ? `https://github.com/${p.repo}` : ""),
    repoFullName: repo?.fullName ?? p.repo,
    liveUrl: p.liveUrl || repo?.homepage || "",
    // Uploads are already same-origin; everything else goes through the thumbnail route.
    image: p.thumbnail.startsWith("/media/") ? p.thumbnail : `/api/thumb/${p.slug}`,
    hasCustomImage: Boolean(p.thumbnail),
    gallery: p.gallery,
    featured: p.featured,
    stars: repo?.stars ?? 0,
    forks: repo?.forks ?? 0,
    topics: repo?.topics ?? [],
    createdAt: repo?.createdAt ?? "",
    pushedAt: repo?.pushedAt ?? "",
    auto: false,
  }
}

function fromRepo(repo: GithubRepo): ProjectView {
  const slug = slugify(repo.name)
  return {
    slug,
    title: titleize(repo.name),
    description: repo.description,
    body: "",
    category: "Experiments",
    tech: repo.language ? [repo.language] : [],
    languages: repoLanguages(repo),
    repoUrl: repo.htmlUrl,
    repoFullName: repo.fullName,
    liveUrl: repo.homepage,
    image: `/api/thumb/${slug}`,
    hasCustomImage: false,
    gallery: [],
    featured: false,
    stars: repo.stars,
    forks: repo.forks,
    topics: repo.topics,
    createdAt: repo.createdAt,
    pushedAt: repo.pushedAt,
    auto: true,
  }
}

/**
 * Curated projects in admin order, then repos the ranking thinks are worth showing.
 * A repo renamed on GitHub is matched case-insensitively; a deleted repo leaves the
 * curated entry in place without GitHub stats.
 */
export function buildProjects(content: SiteContent, github: GithubData): ProjectView[] {
  const byName = new Map(github.repos.map((r) => [r.fullName.toLowerCase(), r]))
  const curated = content.projects.filter((p) => !p.hidden)
  const views = curated.map((p) => fromCurated(p, p.repo ? byName.get(p.repo.toLowerCase()) : undefined))
  const taken = new Set(views.map((v) => v.slug))
  const auto = rankRepos(github.repos, {
    login: github.profile.login,
    hidden: content.hiddenRepos,
    curated: content.projects.map((p) => p.repo).filter(Boolean),
    // Rank relative to when the data was fetched: deterministic, and prerender-safe.
    now: Date.parse(github.fetchedAt),
  })
    .map(fromRepo)
    .filter((v) => !taken.has(v.slug))
  return [...views, ...auto]
}

/** Repos not yet in the portfolio and not hidden: the admin's "New on GitHub" list. */
export function uncuratedRepos(content: SiteContent, github: GithubData) {
  const curated = new Set(content.projects.map((p) => p.repo.toLowerCase()).filter(Boolean))
  const hidden = new Set(content.hiddenRepos.map((h) => h.toLowerCase()))
  return github.repos
    .filter((r) => !r.fork && !curated.has(r.fullName.toLowerCase()) && !hidden.has(r.name.toLowerCase()))
    .sort((a, b) => Date.parse(b.pushedAt) - Date.parse(a.pushedAt))
}
