import "server-only"

import { createHash, randomUUID } from "node:crypto"
import { mkdir, open, readFile, rename, unlink, writeFile } from "node:fs/promises"
import { join } from "node:path"

import { emptyStudio, studioSchema, type StudioData } from "./schema"

export class StudioConflict extends Error {
  constructor() { super("The workspace changed since you loaded it. Reload before saving; your edit has not been written.") }
}
export type StudioSnapshot = { data: StudioData; sha: string | null }
const DATA_PATH = "studio/records.json"
const localDirectory = () => join(process.cwd(), ".studio-data")
const digest = (text: string) => createHash("sha256").update(text).digest("hex")

export function studioStorageMode(): "private-github" | "local" | "unconfigured" {
  if (process.env.STUDIO_DATA_REPO && process.env.STUDIO_GITHUB_TOKEN) return "private-github"
  return process.env.NODE_ENV === "development" ? "local" : "unconfigured"
}

async function privateRepository() {
  const repo = process.env.STUDIO_DATA_REPO || ""
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) throw new Error("Set STUDIO_DATA_REPO to a separate private owner/repository.")
  const headers = { Authorization: `Bearer ${process.env.STUDIO_GITHUB_TOKEN}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "oz-studio" }
  const base = `https://api.github.com/repos/${repo}`
  const response = await fetch(base, { headers, cache: "no-store" })
  if (!response.ok) throw new Error(`Cannot access the private studio repository (${response.status}). Check repository access and token permissions.`)
  const metadata = await response.json() as { private?: boolean; default_branch: string }
  if (metadata.private !== true) throw new Error("OZ Studio refuses to store business records in a public repository. Choose a private repository.")
  const branch = process.env.STUDIO_DATA_BRANCH || metadata.default_branch
  return { base, headers, branch }
}

function requireStorage() {
  const mode = studioStorageMode()
  if (mode === "unconfigured") throw new Error("Set STUDIO_DATA_REPO and STUDIO_GITHUB_TOKEN to enable private studio storage on Vercel.")
  return mode
}

export async function readStudio(): Promise<StudioSnapshot> {
  if (requireStorage() === "local") {
    try {
      const text = await readFile(join(localDirectory(), "records.json"), "utf8")
      return { data: studioSchema.parse(JSON.parse(text)), sha: digest(text) }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return { data: emptyStudio(), sha: null }
      throw error
    }
  }
  const { base, headers, branch } = await privateRepository()
  const response = await fetch(`${base}/contents/${DATA_PATH}?ref=${encodeURIComponent(branch)}`, { headers, cache: "no-store" })
  if (response.status === 404) return { data: emptyStudio(), sha: null }
  if (!response.ok) throw new Error(`Could not read studio records (${response.status}).`)
  const file = await response.json() as { encoding?: string; content?: string; sha: string }
  if (file.encoding !== "base64" || !file.content) throw new Error("Studio records exceed inline storage limits. Export and archive older records before continuing.")
  return { data: studioSchema.parse(JSON.parse(Buffer.from(file.content, "base64").toString("utf8"))), sha: file.sha }
}

export async function writeStudio(data: StudioData, sha: string | null): Promise<StudioSnapshot> {
  const validated = studioSchema.parse(data)
  const text = JSON.stringify(validated, null, 2) + "\n"
  if (Buffer.byteLength(text) > 750_000) throw new Error("Workspace storage is nearing its limit. Export and archive older records before saving.")
  if (requireStorage() === "local") {
    const directory = localDirectory()
    await mkdir(directory, { recursive: true })
    const lockPath = join(directory, "write.lock")
    let lock
    try { lock = await open(lockPath, "wx") }
    catch { throw new Error("Another local save is in progress. Please retry.") }
    try {
      const current = await readStudio()
      if (current.sha !== sha) throw new StudioConflict()
      const temporary = join(directory, `${randomUUID()}.json`)
      await writeFile(temporary, text, { mode: 0o600 })
      await rename(temporary, join(directory, "records.json"))
      return { data: validated, sha: digest(text) }
    } finally { await lock.close(); await unlink(lockPath) }
  }
  const { base, headers, branch } = await privateRepository()
  const response = await fetch(`${base}/contents/${DATA_PATH}`, {
    method: "PUT", headers: { ...headers, "Content-Type": "application/json" }, cache: "no-store",
    body: JSON.stringify({ message: "Update private studio records", content: Buffer.from(text).toString("base64"), branch, ...(sha ? { sha } : {}) }),
  })
  if (response.status === 409 || (response.status === 422 && !sha)) throw new StudioConflict()
  if (!response.ok) throw new Error(`GitHub rejected the studio save (${response.status}). Nothing has been confirmed saved.`)
  const result = await response.json() as { content: { sha: string } }
  return { data: validated, sha: result.content.sha }
}
