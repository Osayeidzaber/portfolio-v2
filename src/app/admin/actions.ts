"use server"

import { createHash } from "node:crypto"

import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { revalidateTag, updateTag } from "next/cache"

import { verifyPassword } from "@/lib/auth/password"
import { rateLimit, resetRateLimit } from "@/lib/auth/rate-limit"
import { endSession, isAuthenticated, startSession } from "@/lib/auth/session"
import { bundledContent, CONTENT_PATH, DRAFT_PATH } from "@/lib/content/read"
import { history, readAt, readFile, removeFile, storeMode, writeFile, type StoreMode } from "@/lib/content/repo"
import { friendlyIssue, parseContent, type SiteContent } from "@/lib/content/schema"
import { ContentConflictError } from "@/lib/content/store"
import { canLogin, env } from "@/lib/env"
import { getGithubData } from "@/lib/github/data"
import type { GithubRepo } from "@/lib/github/types"
import { UPLOAD_DIR } from "@/lib/media"
import { slugify } from "@/lib/projects"

/*
 * Every mutation re-checks the session here, on the server. Results are plain objects
 * so the UI can show exactly what GitHub said; nothing reports success unless the
 * commit actually landed.
 */

export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : { data: T }))
  | { ok: false; error: string; conflict?: boolean }

async function guard(): Promise<{ ok: false; error: string } | null> {
  if (!(await isAuthenticated())) return { ok: false, error: "Your session has expired. Sign in again." }
  return null
}

function fail(err: unknown): { ok: false; error: string; conflict?: boolean } {
  if (err instanceof ContentConflictError) return { ok: false, error: err.message, conflict: true }
  console.error("[admin]", err)
  return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." }
}

/* ---------- auth ---------- */

export async function loginAction(_prev: { error: string } | null, form: FormData): Promise<{ error: string } | null> {
  if (!canLogin()) {
    return { error: "Admin is not configured yet. Set ADMIN_PASSWORD_HASH and SESSION_SECRET (see README)." }
  }
  const h = await headers()
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "local"
  const limit = rateLimit(`login:${ip}`, { limit: 5, windowMs: 15 * 60_000 })
  if (!limit.ok) {
    return { error: `Too many attempts. Try again in ${Math.ceil(limit.retryAfterMs / 60_000)} min.` }
  }
  const password = String(form.get("password") ?? "")
  if (!password || password.length > 256 || !(await verifyPassword(password, env.adminPasswordHash))) {
    return { error: "That password isn't right." }
  }
  resetRateLimit(`login:${ip}`)
  await startSession()
  redirect("/admin")
}

export async function logoutAction() {
  await endSession()
  redirect("/admin/login")
}

/* ---------- load ---------- */

export type EditorState = {
  content: SiteContent
  /** sha of content/site.json the editor started from (null when it doesn't exist yet). */
  publishedSha: string | null
  draftSha: string | null
  hasDraft: boolean
  /** true when the draft differs from what is published. */
  draftDiffers: boolean
  mode: StoreMode
  repo: string
  repos: Array<Pick<GithubRepo, "name" | "fullName" | "description" | "homepage" | "language" | "pushedAt" | "stars" | "fork">>
  githubOrigin: "live" | "snapshot"
}

async function readContent(path: string) {
  const file = await readFile(path)
  if (!file) return null
  const parsed = parseContent(JSON.parse(file.text))
  return { file, parsed }
}

export async function loadEditor(): Promise<ActionResult<EditorState>> {
  const denied = await guard()
  if (denied) return denied
  try {
    const [pub, draft, github] = await Promise.all([
      readContent(CONTENT_PATH),
      readContent(DRAFT_PATH),
      getGithubData(),
    ])
    const published = pub?.parsed.success ? pub.parsed.data : bundledContent()
    const draftContent = draft?.parsed.success ? draft.parsed.data : null
    return {
      ok: true,
      data: {
        content: draftContent ?? published,
        publishedSha: pub?.file.sha ?? null,
        draftSha: draft?.file.sha ?? null,
        hasDraft: Boolean(draftContent),
        draftDiffers: Boolean(draftContent) && JSON.stringify(draftContent) !== JSON.stringify(published),
        mode: storeMode(),
        repo: env.contentRepo,
        githubOrigin: github.origin,
        repos: github.repos.map(({ name, fullName, description, homepage, language, pushedAt, stars, fork }) => ({
          name,
          fullName,
          description,
          homepage,
          language,
          pushedAt,
          stars,
          fork,
        })),
      },
    }
  } catch (err) {
    return fail(err)
  }
}

/* ---------- save ---------- */

function validate(input: unknown) {
  const parsed = parseContent(input)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return { ok: false as const, error: `Fix "${first.path.join(" → ")}": ${friendlyIssue(first)}` }
  }
  const slugs = parsed.data.projects.map((p) => p.slug)
  const dup = slugs.find((s, i) => slugs.indexOf(s) !== i)
  if (dup) return { ok: false as const, error: `Two projects share the address "/work/${dup}". Make them unique.` }
  return { ok: true as const, data: parsed.data }
}

const serialize = (c: SiteContent) => JSON.stringify(c, null, 2) + "\n"

export async function saveDraft(
  input: unknown,
  draftSha: string | null,
): Promise<ActionResult<{ draftSha: string; commitUrl: string }>> {
  const denied = await guard()
  if (denied) return denied
  const valid = validate(input)
  if (!valid.ok) return valid
  try {
    const res = await writeFile({
      path: DRAFT_PATH,
      content: serialize(valid.data),
      message: "content: save draft (admin)",
      sha: draftSha,
    })
    return { ok: true, data: { draftSha: res.sha, commitUrl: res.commitUrl } }
  } catch (err) {
    return fail(err)
  }
}

export async function publish(
  input: unknown,
  publishedSha: string | null,
  draftSha: string | null,
  summary: string,
): Promise<ActionResult<{ publishedSha: string; commitUrl: string; commit: string }>> {
  const denied = await guard()
  if (denied) return denied
  const valid = validate(input)
  if (!valid.ok) return valid
  const message = `content: ${summary.replace(/[\r\n]+/g, " ").slice(0, 72) || "update site"} (admin)`
  try {
    const res = await writeFile({ path: CONTENT_PATH, content: serialize(valid.data), message, sha: publishedSha })
    // The draft has been published; drop it so the next session starts from live content.
    if (draftSha) await removeFile({ path: DRAFT_PATH, sha: draftSha, message: "content: clear published draft (admin)" }).catch(() => {})
    updateTag("content")
    revalidateTag("thumbnails", "max")
    return { ok: true, data: { publishedSha: res.sha, commitUrl: res.commitUrl, commit: res.commit } }
  } catch (err) {
    return fail(err)
  }
}

export async function discardDraft(draftSha: string | null): Promise<ActionResult> {
  const denied = await guard()
  if (denied) return denied
  if (!draftSha) return { ok: true }
  try {
    await removeFile({ path: DRAFT_PATH, sha: draftSha, message: "content: discard draft (admin)" })
    return { ok: true }
  } catch (err) {
    return fail(err)
  }
}

/* ---------- history ---------- */

export async function listHistory(): Promise<
  ActionResult<Array<{ sha: string; message: string; date: string; url: string }>>
> {
  const denied = await guard()
  if (denied) return denied
  try {
    return { ok: true, data: await history(CONTENT_PATH) }
  } catch (err) {
    return fail(err)
  }
}

/** Loads an old version into the editor (it is not published until you press Publish). */
export async function loadVersion(ref: string): Promise<ActionResult<SiteContent>> {
  const denied = await guard()
  if (denied) return denied
  try {
    const text = await readAt(CONTENT_PATH, ref)
    if (!text) return { ok: false, error: "That version could not be found." }
    const parsed = parseContent(JSON.parse(text))
    if (!parsed.success) return { ok: false, error: "That version doesn't match the current content format." }
    return { ok: true, data: parsed.data }
  } catch (err) {
    return fail(err)
  }
}

/* ---------- uploads ---------- */

const ALLOWED: Record<string, { ext: string; max: number; magic: (b: Buffer) => boolean }> = {
  "image/png": { ext: "png", max: 5e6, magic: (b) => b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) },
  "image/jpeg": { ext: "jpg", max: 5e6, magic: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  "image/webp": { ext: "webp", max: 5e6, magic: (b) => b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP" },
  "image/gif": { ext: "gif", max: 5e6, magic: (b) => b.subarray(0, 4).toString() === "GIF8" },
  "image/avif": { ext: "avif", max: 5e6, magic: (b) => b.subarray(4, 12).toString().startsWith("ftypavi") },
  "application/pdf": { ext: "pdf", max: 8e6, magic: (b) => b.subarray(0, 5).toString() === "%PDF-" },
}

export async function uploadFile(form: FormData): Promise<ActionResult<{ path: string }>> {
  const denied = await guard()
  if (denied) return denied
  const file = form.get("file")
  if (!(file instanceof File)) return { ok: false, error: "No file received." }
  const rule = ALLOWED[file.type]
  if (!rule) return { ok: false, error: "Use a PNG, JPG, WebP, AVIF, GIF or PDF." }
  if (file.size > rule.max) return { ok: false, error: `That file is over ${rule.max / 1e6} MB.` }
  const bytes = Buffer.from(await file.arrayBuffer())
  if (!rule.magic(bytes)) return { ok: false, error: "The file's contents don't match its type." }

  const hash = createHash("sha256").update(bytes).digest("hex").slice(0, 10)
  const base = slugify(file.name.replace(/\.[^.]+$/, "")).slice(0, 60) || "file"
  const name = `${base}.${hash}.${rule.ext}`
  try {
    const existing = await readFile(`${UPLOAD_DIR}/${name}`).catch(() => null)
    if (!existing) {
      await writeFile({ path: `${UPLOAD_DIR}/${name}`, content: bytes, message: `content: upload ${name} (admin)`, sha: null })
    }
    return { ok: true, data: { path: `/media/${name}` } }
  } catch (err) {
    return fail(err)
  }
}

/* ---------- github ---------- */

export async function refreshGithub(): Promise<ActionResult> {
  const denied = await guard()
  if (denied) return denied
  updateTag("github")
  updateTag("thumbnails")
  return { ok: true }
}
