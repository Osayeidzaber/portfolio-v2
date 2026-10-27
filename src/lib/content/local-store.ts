import "server-only"

import { createHash } from "node:crypto"
import { mkdir, readFile, writeFile, unlink } from "node:fs/promises"
import { dirname, join } from "node:path"

import { ContentConflictError, type StoredFile } from "./store"

/*
 * Development-only stand-in for the GitHub store: reads and writes files in this
 * checkout, with the same sha-based conflict check. Never used in production.
 */

const root = process.cwd()
const sha = (text: string | Buffer) => createHash("sha1").update(text).digest("hex")

export const localStoreEnabled = () => process.env.NODE_ENV === "development"

export async function readLocal(path: string): Promise<StoredFile | null> {
  try {
    const text = await readFile(join(/*turbopackIgnore: true*/ root, path), "utf8")
    return { text, sha: sha(text) }
  } catch {
    return null
  }
}

export async function writeLocal(opts: { path: string; content: string | Buffer; sha: string | null }) {
  const current = await readLocal(opts.path)
  if (current && opts.sha !== current.sha && typeof opts.content === "string") throw new ContentConflictError()
  const full = join(/*turbopackIgnore: true*/ root, opts.path)
  await mkdir(dirname(full), { recursive: true })
  await writeFile(full, opts.content)
  const next = sha(opts.content)
  return { sha: next, commit: `local-${next.slice(0, 7)}`, commitUrl: "" }
}

export async function deleteLocal(path: string) {
  await unlink(join(/*turbopackIgnore: true*/ root, path)).catch(() => {})
}
