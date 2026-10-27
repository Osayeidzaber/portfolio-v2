import type { MetadataRoute } from "next"

import { getContent } from "@/lib/content/read"
import { siteUrl } from "@/lib/env"
import { getGithubData } from "@/lib/github/data"
import { buildProjects } from "@/lib/projects"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [content, github] = await Promise.all([getContent(), getGithubData()])
  const projects = buildProjects(content, github)
  return [
    { url: siteUrl, lastModified: github.fetchedAt, changeFrequency: "weekly", priority: 1 },
    ...projects.map((p) => ({
      url: `${siteUrl}/work/${p.slug}`,
      lastModified: p.pushedAt || github.fetchedAt,
      changeFrequency: "monthly" as const,
      priority: p.featured ? 0.8 : 0.6,
    })),
  ]
}
