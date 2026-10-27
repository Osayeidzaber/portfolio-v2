import type { GithubRepo } from "./types"

/*
 * Decides which repositories are portfolio material when nobody has curated them.
 * Pure and deterministic so it can be unit-tested. Manual choices in the admin
 * (featured, hidden, explicit projects) always win over this score.
 */

const DAY = 86_400_000

export function scoreRepo(repo: GithubRepo, login: string, now: number): number {
  if (repo.fork || repo.archived) return -1
  if (repo.name.toLowerCase() === login.toLowerCase()) return -1 // profile README repo
  if (repo.size === 0) return -1

  let score = 0
  if (repo.description.trim().length >= 12) score += 3
  if (repo.homepage) score += 3
  if (repo.topics.length) score += 1
  score += Math.min(repo.stars, 20) * 0.5
  score += Math.min(repo.forks, 10) * 0.3
  // Bigger codebases are usually real projects rather than experiments.
  score += Math.min(Math.log10(Math.max(repo.size, 1)), 5)
  const ageDays = (now - Date.parse(repo.pushedAt)) / DAY
  if (ageDays < 60) score += 2
  else if (ageDays < 240) score += 1
  return Math.round(score * 100) / 100
}

export const AUTO_THRESHOLD = 6

/** Repos worth showing automatically, best first, excluding hidden and already-curated ones. */
export function rankRepos(
  repos: GithubRepo[],
  opts: { login: string; hidden: string[]; curated: string[]; now: number },
): Array<GithubRepo & { score: number }> {
  const hidden = new Set(opts.hidden.map((h) => h.toLowerCase()))
  const curated = new Set(opts.curated.map((c) => c.toLowerCase()))
  return repos
    .map((r) => ({ ...r, score: scoreRepo(r, opts.login, opts.now) }))
    .filter((r) => r.score >= AUTO_THRESHOLD)
    .filter((r) => !hidden.has(r.name.toLowerCase()) && !curated.has(r.fullName.toLowerCase()))
    .sort((a, b) => b.score - a.score || Date.parse(b.pushedAt) - Date.parse(a.pushedAt))
}

/** Bytes per language across repos, as sorted shares that sum to 1. */
export function languageShares(repos: GithubRepo[]): Array<{ language: string; bytes: number; share: number }> {
  const totals = new Map<string, number>()
  for (const repo of repos) {
    if (repo.fork) continue
    for (const [lang, bytes] of Object.entries(repo.languages)) totals.set(lang, (totals.get(lang) ?? 0) + bytes)
  }
  const sum = [...totals.values()].reduce((a, b) => a + b, 0)
  if (!sum) return []
  return [...totals.entries()]
    .map(([language, bytes]) => ({ language, bytes, share: bytes / sum }))
    .sort((a, b) => b.bytes - a.bytes)
}
