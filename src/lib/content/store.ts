import "server-only"

import { env } from "@/lib/env"

/*
 * Thin wrapper over the GitHub Contents API for the content repository.
 * All calls use the server-only write token and never run in the browser.
 */

const API = "https://api.github.com"

export class ContentConflictError extends Error {
  constructor() {
    super("The file changed on GitHub since you opened it. Reload to get the latest version, then reapply your edit.")
    this.name = "ContentConflictError"
  }
}

export class ContentStoreError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message)
    this.name = "ContentStoreError"
  }
}

function headers(extra?: Record<string, string>) {
  return {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    Authorization: `Bearer ${env.contentToken}`,
    "User-Agent": "osayeed-portfolio",
    ...extra,
  }
}

const encodePath = (p: string) => p.split("/").map(encodeURIComponent).join("/")

export type StoredFile = { text: string; sha: string }

/** Reads a text file from the content repo. Returns null when it does not exist. */
export async function readRepoFile(filePath: string): Promise<StoredFile | null> {
  const res = await fetch(
    `${API}/repos/${env.contentRepo}/contents/${encodePath(filePath)}?ref=${encodeURIComponent(env.contentBranch)}`,
    { headers: headers(), cache: "no-store" },
  )
  if (res.status === 404) return null
  if (!res.ok) throw new ContentStoreError(`GitHub returned ${res.status} reading ${filePath}`, res.status)
  const json = (await res.json()) as { content?: string; encoding?: string; sha: string; download_url?: string }
  if (json.encoding === "base64" && json.content) {
    return { text: Buffer.from(json.content, "base64").toString("utf8"), sha: json.sha }
  }
  // Files over 1 MB come back without inline content.
  if (json.download_url) {
    const raw = await fetch(json.download_url, { headers: headers(), cache: "no-store" })
    if (!raw.ok) throw new ContentStoreError(`GitHub returned ${raw.status} downloading ${filePath}`, raw.status)
    return { text: await raw.text(), sha: json.sha }
  }
  throw new ContentStoreError(`Unexpected response reading ${filePath}`)
}

/** Reads a binary file (uploads). */
export async function readRepoBinary(filePath: string): Promise<{ bytes: ArrayBuffer; type: string } | null> {
  const res = await fetch(
    `${API}/repos/${env.contentRepo}/contents/${encodePath(filePath)}?ref=${encodeURIComponent(env.contentBranch)}`,
    { headers: headers({ Accept: "application/vnd.github.raw" }), cache: "no-store" },
  )
  if (res.status === 404) return null
  if (!res.ok) throw new ContentStoreError(`GitHub returned ${res.status} reading ${filePath}`, res.status)
  return { bytes: await res.arrayBuffer(), type: res.headers.get("content-type") || "application/octet-stream" }
}

/**
 * Creates or updates a file. `sha` must be the blob sha the editor started from
 * (null for a new file). GitHub rejects a stale sha with 409, which we surface as a
 * conflict instead of overwriting someone else's change.
 */
export async function writeRepoFile(opts: {
  path: string
  content: string | Buffer
  message: string
  sha: string | null
}): Promise<{ sha: string; commit: string; commitUrl: string }> {
  const body: Record<string, unknown> = {
    message: opts.message,
    content: Buffer.isBuffer(opts.content)
      ? opts.content.toString("base64")
      : Buffer.from(opts.content, "utf8").toString("base64"),
    branch: env.contentBranch,
  }
  if (opts.sha) body.sha = opts.sha
  const res = await fetch(`${API}/repos/${env.contentRepo}/contents/${encodePath(opts.path)}`, {
    method: "PUT",
    headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
    cache: "no-store",
  })
  if (res.status === 409 || (res.status === 422 && !opts.sha)) throw new ContentConflictError()
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}) as { message?: string })
    throw new ContentStoreError(
      `GitHub rejected the save (${res.status}${(detail as { message?: string }).message ? `: ${(detail as { message?: string }).message}` : ""}).`,
      res.status,
    )
  }
  const json = (await res.json()) as { content: { sha: string }; commit: { sha: string; html_url: string } }
  return { sha: json.content.sha, commit: json.commit.sha, commitUrl: json.commit.html_url }
}

export async function deleteRepoFile(opts: { path: string; sha: string; message: string }): Promise<void> {
  const res = await fetch(`${API}/repos/${env.contentRepo}/contents/${encodePath(opts.path)}`, {
    method: "DELETE",
    headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify({ message: opts.message, sha: opts.sha, branch: env.contentBranch }),
    cache: "no-store",
  })
  if (res.status === 409) throw new ContentConflictError()
  if (!res.ok && res.status !== 404) throw new ContentStoreError(`GitHub returned ${res.status} deleting ${opts.path}`, res.status)
}

export type HistoryEntry = { sha: string; message: string; date: string; url: string }

export async function fileHistory(filePath: string, limit = 15): Promise<HistoryEntry[]> {
  const res = await fetch(
    `${API}/repos/${env.contentRepo}/commits?path=${encodeURIComponent(filePath)}&sha=${encodeURIComponent(env.contentBranch)}&per_page=${limit}`,
    { headers: headers(), cache: "no-store" },
  )
  if (!res.ok) throw new ContentStoreError(`GitHub returned ${res.status} listing history`, res.status)
  const json = (await res.json()) as Array<{
    sha: string
    html_url: string
    commit: { message: string; committer: { date: string } }
  }>
  return json.map((c) => ({
    sha: c.sha,
    message: c.commit.message.split("\n")[0],
    date: c.commit.committer.date,
    url: c.html_url,
  }))
}

/** The file's content at a given commit, for restoring. */
export async function readRepoFileAt(filePath: string, ref: string): Promise<string | null> {
  if (!/^[0-9a-f]{7,40}$/.test(ref)) throw new ContentStoreError("Invalid commit reference")
  const res = await fetch(`${API}/repos/${env.contentRepo}/contents/${encodePath(filePath)}?ref=${ref}`, {
    headers: headers({ Accept: "application/vnd.github.raw" }),
    cache: "no-store",
  })
  if (res.status === 404) return null
  if (!res.ok) throw new ContentStoreError(`GitHub returned ${res.status} reading history`, res.status)
  return res.text()
}
