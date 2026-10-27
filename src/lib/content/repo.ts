import "server-only"

import { canPublish } from "@/lib/env"
import { deleteLocal, localStoreEnabled, readLocal, writeLocal } from "./local-store"
import {
  deleteRepoFile,
  fileHistory,
  readRepoFile,
  readRepoFileAt,
  writeRepoFile,
  type HistoryEntry,
  type StoredFile,
} from "./store"

/** Where admin edits go: the GitHub content repo, this checkout (dev only), or nowhere. */
export type StoreMode = "github" | "local" | "none"

export function storeMode(): StoreMode {
  if (canPublish()) return "github"
  if (localStoreEnabled()) return "local"
  return "none"
}

export async function readFile(path: string): Promise<StoredFile | null> {
  const mode = storeMode()
  if (mode === "github") return readRepoFile(path)
  if (mode === "local") return readLocal(path)
  return null
}

export async function writeFile(opts: { path: string; content: string | Buffer; message: string; sha: string | null }) {
  const mode = storeMode()
  if (mode === "github") return writeRepoFile(opts)
  if (mode === "local") return writeLocal(opts)
  throw new Error("Publishing is not configured. Set GITHUB_CONTENT_REPO and GITHUB_CONTENT_TOKEN.")
}

export async function removeFile(opts: { path: string; sha: string; message: string }) {
  const mode = storeMode()
  if (mode === "github") return deleteRepoFile(opts)
  if (mode === "local") return deleteLocal(opts.path)
}

export async function history(path: string): Promise<HistoryEntry[]> {
  return storeMode() === "github" ? fileHistory(path) : []
}

export async function readAt(path: string, ref: string): Promise<string | null> {
  return storeMode() === "github" ? readRepoFileAt(path, ref) : null
}
