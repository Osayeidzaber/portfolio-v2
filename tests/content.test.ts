import { describe, expect, it } from "vitest"

import site from "../content/site.json"
import snapshot from "../content/github-snapshot.json"
import { parseContent } from "@/lib/content/schema"
import { buildProjects, slugify, uncuratedRepos } from "@/lib/projects"
import type { GithubData } from "@/lib/github/types"

describe("content/site.json", () => {
  it("matches the schema", () => {
    const parsed = parseContent(site)
    if (!parsed.success) console.error(parsed.error.issues)
    expect(parsed.success).toBe(true)
  })

  it("has unique project slugs", () => {
    const slugs = site.projects.map((p) => p.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it("rejects invalid input with a path", () => {
    const bad = structuredClone(site) as typeof site
    bad.projects[0].slug = "Not A Slug"
    const parsed = parseContent(bad)
    expect(parsed.success).toBe(false)
    if (!parsed.success) expect(parsed.error.issues[0].path.join(".")).toBe("projects.0.slug")
  })

  it("rejects script URLs in links", () => {
    const bad = structuredClone(site) as typeof site
    bad.profile.socials[0].url = "javascript:alert(1)"
    expect(parseContent(bad).success).toBe(false)
  })
})

describe("buildProjects", () => {
  const content = parseContent(site)
  const github = snapshot as unknown as GithubData
  if (!content.success) throw new Error("fixture invalid")

  it("keeps curated order first and skips hidden projects", () => {
    const views = buildProjects(content.data, github)
    const curated = content.data.projects.filter((p) => !p.hidden).map((p) => p.slug)
    expect(views.slice(0, curated.length).map((v) => v.slug)).toEqual(curated)
  })

  it("never auto-includes hidden repos or the profile README repo", () => {
    const views = buildProjects(content.data, github)
    const names = views.map((v) => v.repoFullName.split("/")[1]?.toLowerCase())
    for (const hidden of content.data.hiddenRepos) expect(names).not.toContain(hidden.toLowerCase())
  })

  it("lists uncurated repos for the admin", () => {
    const fresh = uncuratedRepos(content.data, github).map((r) => r.fullName.toLowerCase())
    for (const p of content.data.projects) if (p.repo) expect(fresh).not.toContain(p.repo.toLowerCase())
  })

  it("slugifies repo names", () => {
    expect(slugify("Admin-Portal-for-IGAC_MUN's  thing")).toBe("admin-portal-for-igac-mun-s-thing")
  })
})
