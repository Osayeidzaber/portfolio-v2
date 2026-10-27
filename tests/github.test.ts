import { createHmac } from "node:crypto"

import { describe, expect, it } from "vitest"

import { activityFromEvents } from "@/lib/github/fetch"
import { AUTO_THRESHOLD, languageShares, rankRepos, scoreRepo } from "@/lib/github/rank"
import { readmeExcerpt } from "@/lib/github/readme"
import type { GithubRepo } from "@/lib/github/types"
import { verifyGithubSignature } from "@/lib/github/webhook"
import { extractOgImage, isPublicHttpsUrl } from "@/lib/thumbnails"

const NOW = Date.parse("2026-10-27T00:00:00Z")
const repo = (over: Partial<GithubRepo>): GithubRepo => ({
  name: "x",
  fullName: "me/x",
  description: "",
  htmlUrl: "",
  homepage: "",
  language: "TypeScript",
  languages: {},
  stars: 0,
  forks: 0,
  topics: [],
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-10-01T00:00:00Z",
  pushedAt: "2026-10-01T00:00:00Z",
  fork: false,
  archived: false,
  size: 1000,
  ...over,
})

describe("ranking", () => {
  it("excludes forks, archived, empty and the profile repo", () => {
    expect(scoreRepo(repo({ fork: true }), "me", NOW)).toBe(-1)
    expect(scoreRepo(repo({ archived: true }), "me", NOW)).toBe(-1)
    expect(scoreRepo(repo({ size: 0 }), "me", NOW)).toBe(-1)
    expect(scoreRepo(repo({ name: "Me" }), "me", NOW)).toBe(-1)
  })

  it("prefers described, deployed, recent repos", () => {
    const good = scoreRepo(repo({ description: "A real product site", homepage: "https://x.dev" }), "me", NOW)
    const bare = scoreRepo(repo({ pushedAt: "2024-01-01T00:00:00Z" }), "me", NOW)
    expect(good).toBeGreaterThan(bare)
    expect(good).toBeGreaterThanOrEqual(AUTO_THRESHOLD)
  })

  it("filters hidden and curated repos", () => {
    const repos = [
      repo({ name: "a", fullName: "me/a", description: "A real product site", homepage: "https://a.dev" }),
      repo({ name: "b", fullName: "me/b", description: "A real product site", homepage: "https://b.dev" }),
      repo({ name: "c", fullName: "me/c", description: "A real product site", homepage: "https://c.dev" }),
    ]
    const ranked = rankRepos(repos, { login: "me", hidden: ["A"], curated: ["ME/B"], now: NOW })
    expect(ranked.map((r) => r.name)).toEqual(["c"])
  })

  it("computes language shares that sum to 1", () => {
    const shares = languageShares([repo({ languages: { TypeScript: 300, CSS: 100 } }), repo({ languages: { Liquid: 600 } })])
    expect(shares[0].language).toBe("Liquid")
    expect(shares.reduce((a, s) => a + s.share, 0)).toBeCloseTo(1)
  })
})

describe("activity from events", () => {
  it("buckets events per day over 90 days, weighting pushes by commit count", () => {
    const a = activityFromEvents(
      [
        { id: "1", type: "PushEvent", repo: { name: "me/x" }, created_at: "2026-10-26T10:00:00Z", payload: { size: 3 } },
        { id: "2", type: "CreateEvent", repo: { name: "me/x" }, created_at: "2026-10-26T12:00:00Z", payload: {} },
      ],
      new Date("2026-10-27T00:00:00Z"),
    )
    expect(a.source).toBe("events")
    expect(a.days).toHaveLength(90)
    expect(a.days.find((d) => d.date === "2026-10-26")?.count).toBe(4)
    expect(a.total).toBe(4)
  })
})

describe("webhook signature", () => {
  const secret = "s3cret"
  const body = JSON.stringify({ zen: "Keep it logically awesome." })
  const sig = "sha256=" + createHmac("sha256", secret).update(body).digest("hex")

  it("accepts a valid signature", () => expect(verifyGithubSignature(body, sig, secret)).toBe(true))
  it("rejects a tampered body", () => expect(verifyGithubSignature(body + " ", sig, secret)).toBe(false))
  it("rejects a missing secret or header", () => {
    expect(verifyGithubSignature(body, sig, "")).toBe(false)
    expect(verifyGithubSignature(body, null, secret)).toBe(false)
  })
})

describe("readme excerpt", () => {
  it("keeps prose and drops badges, html, code and boilerplate", () => {
    const md = [
      '<p align="center"><img src="logo.png"></p>',
      "# Title",
      "[![badge](https://img.shields.io/x)](https://x)",
      "TajWater is a full-stack e-commerce platform for a water delivery company in Vancouver.",
      "```bash\nnpm run dev\n```",
      "First, run the development server: npm run dev and open localhost:3000 in the browser.",
    ].join("\n\n")
    const out = readmeExcerpt(md)
    expect(out).toContain("TajWater is a full-stack")
    expect(out).not.toMatch(/<|badge|npm run dev/)
  })
})

describe("thumbnails", () => {
  it("finds og:image in either attribute order and resolves relative URLs", () => {
    expect(extractOgImage('<meta content="/og.png" property="og:image">', "https://site.dev/a")).toBe("https://site.dev/og.png")
    expect(extractOgImage('<meta name="twitter:image" content="https://cdn.dev/t.jpg">', "https://site.dev")).toBe("https://cdn.dev/t.jpg")
    expect(extractOgImage("<title>none</title>", "https://site.dev")).toBe("")
  })

  it("refuses private and non-https hosts", () => {
    expect(isPublicHttpsUrl("https://igac.info")).toBe(true)
    expect(isPublicHttpsUrl("http://igac.info")).toBe(false)
    expect(isPublicHttpsUrl("https://localhost:3000")).toBe(false)
    expect(isPublicHttpsUrl("https://192.168.1.1/x")).toBe(false)
    expect(isPublicHttpsUrl("https://169.254.169.254/latest")).toBe(false)
  })
})
