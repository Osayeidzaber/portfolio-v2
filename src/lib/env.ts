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

export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "")

/** True when the admin can actually publish (repo + write token present). */
export const canPublish = () => Boolean(env.contentRepo && env.contentToken)

/** True when login is possible (hash + session secret present). */
export const canLogin = () => Boolean(env.adminPasswordHash && env.sessionSecret.length >= 32)
