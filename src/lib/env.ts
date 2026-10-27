import "server-only"

/** Server-side configuration. Nothing here may be imported by a client component. */
export const env = {
  githubUser: process.env.GITHUB_USERNAME || "Osayeidzaber",
  githubToken: process.env.GITHUB_TOKEN || "",
  contentRepo: process.env.GITHUB_CONTENT_REPO || "",
  contentBranch: process.env.GITHUB_CONTENT_BRANCH || "main",
  contentToken: process.env.GITHUB_CONTENT_TOKEN || "",
  webhookSecret: process.env.GITHUB_WEBHOOK_SECRET || "",
  adminPasswordHash: process.env.ADMIN_PASSWORD_HASH || "",
  sessionSecret: process.env.SESSION_SECRET || "",
  revalidateSecret: process.env.REVALIDATE_SECRET || "",
}

/** Accept bare deployment domains so metadata, sitemaps, and robots use absolute URLs. */
function normalizeSiteUrl(configured: string | undefined): string {
  const value = configured?.trim() || "https://zaber.tech"
  const absolute = /^[a-z][a-z\d+.-]*:\/\//i.test(value)
    ? value
    : `https://${value.replace(/^\/\//, "")}`

  try {
    const url = new URL(absolute)
    if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Unsupported protocol")
    return url.href.replace(/\/+$/, "")
  } catch {
    throw new Error("NEXT_PUBLIC_SITE_URL must be a valid HTTP(S) URL or domain, for example https://zaber.tech.")
  }
}

export const siteUrl = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL)

/** True when the admin can actually publish (repo + write token present). */
export const canPublish = () => Boolean(env.contentRepo && env.contentToken)

/** True when login is possible (hash + session secret present). */
export const canLogin = () => Boolean(env.adminPasswordHash && env.sessionSecret.length >= 32)
