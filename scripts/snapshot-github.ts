/*
 * Writes content/github-snapshot.json: a real copy of the GitHub data the site shows,
 * used only when the live API is unreachable. Runs before every build; on failure it
 * keeps the previous snapshot so offline builds still work.
 *
 *   pnpm snapshot:github
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { loadEnvFile } from "node:process"

import type { GithubData } from "../src/lib/github/types"

// Standalone scripts do not get Next's .env.local loading automatically.
if (existsSync(resolve(process.cwd(), ".env.local"))) loadEnvFile(resolve(process.cwd(), ".env.local"))

const out = resolve(process.cwd(), "content/github-snapshot.json")
const login = process.env.GITHUB_USERNAME || "Osayeidzaber"

async function main() {
  const { fetchActivity, fetchEvents, fetchProfile, fetchReadme, fetchRepos, summarizeEvents } = await import("../src/lib/github/fetch")
  try {
    const [profile, repos, events] = await Promise.all([
      fetchProfile(login),
      fetchRepos(login),
      fetchEvents(login).catch(() => []),
    ])
    const data: GithubData = {
      fetchedAt: new Date().toISOString(),
      origin: "snapshot",
      profile,
      repos,
      activity: await fetchActivity(login, events),
      events: summarizeEvents(events),
      readmes: Object.fromEntries(await Promise.all(repos.filter((repo) => !repo.fork && !repo.archived).map(async (repo) => [repo.fullName.toLowerCase(), (await fetchReadme(repo.fullName)).slice(0, 30_000)]))),
    }
    writeFileSync(out, JSON.stringify(data, null, 2) + "\n")
    console.log(`[snapshot] wrote ${repos.length} repos, ${data.activity.days.length} days (${data.activity.source})`)
  } catch (err) {
    if (existsSync(out) && readFileSync(out, "utf8").trim()) {
      console.warn(`[snapshot] GitHub unavailable, keeping previous snapshot: ${(err as Error).message}`)
      return
    }
    throw err
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
