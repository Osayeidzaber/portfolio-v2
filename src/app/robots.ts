import type { MetadataRoute } from "next"

import { siteUrl } from "@/lib/env"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/oz-studio/admin"] }],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  }
}
