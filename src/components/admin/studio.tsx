"use client"

import { AnimatePresence, motion } from "motion/react"
import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"

import {
  discardDraft,
  listHistory,
  loadEditor,
  loadVersion,
  logoutAction,
  publish,
  refreshGithub,
  saveDraft,
  type EditorState,
} from "@/app/admin/actions"
import { friendlyIssue, parseContent, type SiteContent } from "@/lib/content/schema"
import { slugify } from "@/lib/projects"
import { cn } from "@/lib/utils"

import { ConfirmProvider, useConfirm } from "./confirm"
import { Card, ErrorsContext, Panel } from "./fields"
import {
  AchievementsPanel,
  blankProject,
  ExperiencePanel,
  newKey,
  ProfilePanel,
  ProjectsPanel,
  SettingsPanel,
  SkillsPanel,
  type Mutate,
} from "./panels"

type Tab = "overview" | "profile" | "projects" | "skills" | "experience" | "achievements" | "settings"
const TABS: Array<{ id: Tab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "profile", label: "Profile & about" },
  { id: "projects", label: "Projects" },
  { id: "skills", label: "Skills" },
  { id: "experience", label: "Experience" },
  { id: "achievements", label: "Achievements" },
  { id: "settings", label: "Site settings" },
]

type Toast = { kind: "ok" | "error"; text: string; link?: string } | null

/** Gives every list row a client-only key so editing doesn't re-mount inputs. */
function withKeys(c: SiteContent): SiteContent {
  const k = <T extends object>(arr: T[]) => arr.map((x) => ({ ...x, _key: newKey() }))
  return {
    ...c,
    profile: { ...c.profile, socials: k(c.profile.socials) },
    about: { ...c.about, pillars: k(c.about.pillars) },
    projects: k(c.projects),
    skills: k(c.skills).map((g) => ({ ...g, items: k(g.items) })),
    experience: k(c.experience),
    achievements: k(c.achievements),
  }
}

/** Strips the client keys (the server would too; this keeps the change detector honest). */
function clean(c: SiteContent): SiteContent {
  return JSON.parse(JSON.stringify(c, (key, value) => (key === "_key" ? undefined : value)))
}

/** "update projects, profile" — which top-level parts differ from what was loaded. */
function summarize(before: SiteContent, after: SiteContent): string {
  const changed = (Object.keys(after) as Array<keyof SiteContent>).filter(
    (k) => JSON.stringify(before[k]) !== JSON.stringify(after[k]),
  )
  return changed.length ? `update ${changed.join(", ")}` : "republish"
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })

export function Studio() {
  return (
    <ConfirmProvider>
      <StudioInner />
    </ConfirmProvider>
  )
}

function StudioInner() {
  const confirm = useConfirm()
  const [state, setState] = useState<EditorState | null>(null)
  const [loadError, setLoadError] = useState("")
  const [content, setContent] = useState<SiteContent | null>(null)
  const [baseline, setBaseline] = useState("")
  const [tab, setTab] = useState<Tab>("overview")
  const [project, setProject] = useState(0)
  const [busy, setBusy] = useState<"" | "draft" | "publish" | "load">("load")
  const [toast, setToast] = useState<Toast>(null)
  const [conflict, setConflict] = useState(false)
  const [historyItems, setHistory] = useState<Array<{ sha: string; message: string; date: string; url: string }> | null>(null)

  const apply = useCallback((res: Awaited<ReturnType<typeof loadEditor>>) => {
    setBusy("")
    if (!res.ok) {
      setLoadError(res.error)
      return
    }
    setState(res.data)
    setContent(withKeys(res.data.content))
    setBaseline(JSON.stringify(res.data.content))
    setConflict(false)
    setLoadError("")
  }, [])

  const load = useCallback(async () => {
    setBusy("load")
    apply(await loadEditor())
  }, [apply])

  useEffect(() => {
    let live = true
    loadEditor().then((res) => {
      if (!live) return
      apply(res)
      const fromHash = window.location.hash.slice(1) as Tab
      if (TABS.some((t) => t.id === fromHash)) setTab(fromHash)
    })
    return () => {
      live = false
    }
  }, [apply])

  useEffect(() => {
    if (tab === "overview" && state?.mode === "github" && !historyItems) {
      listHistory().then((r) => setHistory(r.ok ? r.data : []))
    }
  }, [tab, state?.mode, historyItems])

  const cleaned = useMemo(() => (content ? clean(content) : null), [content])
  const dirty = cleaned ? JSON.stringify(cleaned) !== baseline : false

  // Instant validation against the same schema the server enforces.
  const errors = useMemo(() => {
    if (!cleaned) return {}
    const parsed = parseContent(cleaned)
    const map: Record<string, string> = {}
    if (!parsed.success) for (const issue of parsed.error.issues) map[issue.path.join(".")] ??= friendlyIssue(issue)
    const slugs = cleaned.projects.map((p) => p.slug)
    slugs.forEach((s, i) => {
      if (slugs.indexOf(s) !== i) map[`projects.${i}.slug`] = "Another project already uses this address"
    })
    return map
  }, [cleaned])
  const errorCount = Object.keys(errors).length

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault()
    }
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => window.removeEventListener("beforeunload", onBeforeUnload)
  }, [dirty])

  useEffect(() => {
    if (!toast || toast.kind === "error") return
    const id = window.setTimeout(() => setToast(null), 5000)
    return () => window.clearTimeout(id)
  }, [toast])

  const mutate: Mutate = useCallback((fn) => {
    setContent((prev) => {
      if (!prev) return prev
      const next = structuredClone(prev)
      fn(next)
      return next
    })
  }, [])

  const go = (t: Tab) => {
    setTab(t)
    history.replaceState(null, "", `#${t}`)
    document.getElementById("studio-main")?.focus()
  }

  if (loadError) {
    return (
      <div className="gutter flex min-h-[100svh] flex-col items-start justify-center gap-4">
        <h1 className="text-[32px] font-bold">Couldn&apos;t load the studio</h1>
        <p className="max-w-[560px] text-mist">{loadError}</p>
        <button type="button" onClick={load} className="pill pill-solid">
          Try again
        </button>
      </div>
    )
  }
  if (!state || !content || !cleaned) {
    return (
      <div className="flex min-h-[100svh] items-center justify-center">
        <span className="folio">Loading your content…</span>
      </div>
    )
  }

  const readOnly = state.mode === "none"

  const doSaveDraft = async () => {
    if (errorCount) return setToast({ kind: "error", text: `Fix ${errorCount} highlighted field${errorCount > 1 ? "s" : ""} first.` })
    setBusy("draft")
    const res = await saveDraft(cleaned, state.draftSha)
    setBusy("")
    if (!res.ok) {
      if (res.conflict) setConflict(true)
      return setToast({ kind: "error", text: res.error })
    }
    setState({ ...state, draftSha: res.data.draftSha, hasDraft: true, draftDiffers: true })
    setBaseline(JSON.stringify(cleaned))
    setToast({ kind: "ok", text: "Draft saved. Preview it before publishing.", link: res.data.commitUrl || undefined })
  }

  const doPublish = async () => {
    if (errorCount) return setToast({ kind: "error", text: `Fix ${errorCount} highlighted field${errorCount > 1 ? "s" : ""} first.` })
    const ok = await confirm({
      title: "Publish to the live site?",
      body:
        state.mode === "github"
          ? `This commits content/site.json to ${state.repo}. The site refreshes within a minute, and Vercel also redeploys.`
          : "Development mode: this writes content/site.json in this folder.",
      confirm: "Publish",
    })
    if (!ok) return
    setBusy("publish")
    const res = await publish(cleaned, state.publishedSha, state.draftSha, summarize(state.content, cleaned))
    setBusy("")
    if (!res.ok) {
      if (res.conflict) setConflict(true)
      return setToast({ kind: "error", text: res.error })
    }
    setState({ ...state, publishedSha: res.data.publishedSha, draftSha: null, hasDraft: false, draftDiffers: false })
    setBaseline(JSON.stringify(cleaned))
    setHistory(null)
    setToast({ kind: "ok", text: `Published (${res.data.commit.slice(0, 7)}). Live in about a minute.`, link: res.data.commitUrl || undefined })
  }

  const doDiscard = async () => {
    const ok = await confirm({
      title: "Discard unpublished changes?",
      body: "The editor goes back to what is live. A saved draft is deleted too.",
      confirm: "Discard",
    })
    if (!ok) return
    if (state.hasDraft) {
      const res = await discardDraft(state.draftSha)
      if (!res.ok) return setToast({ kind: "error", text: res.error })
    }
    await load()
    setToast({ kind: "ok", text: "Changes discarded." })
  }

  const importRepo = (r: EditorState["repos"][number]) => {
    const title = r.name.replace(/[-_]+/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase())
    mutate((d) =>
      void d.projects.push(
        blankProject({
          title,
          slug: slugify(r.name),
          repo: r.fullName,
          description: r.description,
          liveUrl: r.homepage,
          tech: r.language ? [r.language] : [],
          category: d.categories[0] ?? "Web",
        }),
      ),
    )
    setProject(content.projects.length)
    go("projects")
    setToast({ kind: "ok", text: `${r.name} added. Review it, then publish.` })
  }

  const curated = new Set(content.projects.map((p) => p.repo.toLowerCase()))
  const fresh = state.repos.filter((r) => !r.fork && !curated.has(r.fullName.toLowerCase()) && !content.hiddenRepos.includes(r.name))

  return (
    <ErrorsContext.Provider value={errors}>
      <div className="flex min-h-[100svh] flex-col md:flex-row">
        {/* Sidebar: a column on desktop, a scrolling tab strip on phones. */}
        <nav aria-label="Studio" className="flex flex-none flex-col border-b border-rule bg-ink md:sticky md:top-0 md:h-[100svh] md:w-64 md:border-b-0 md:border-r">
          <div className="flex items-center justify-between px-5 py-5">
            <span className="text-[20px] font-extrabold tracking-[-0.02em]">
              OZ <span className="font-light text-dust">studio</span>
            </span>
            <form action={logoutAction} className="md:hidden">
              <button type="submit" className="folio h-11 hover:!text-paper">
                Sign out
              </button>
            </form>
          </div>
          <Link href="/admin/oz-studio" className="mx-3 mb-4 flex min-h-11 items-center justify-between rounded-lg border border-edge px-3 text-sm">OZ Studio invoices <span aria-hidden>↗</span></Link>
          <ul className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:overflow-visible md:pb-0">
            {TABS.map((t) => (
              <li key={t.id} className="flex-none">
                <button
                  type="button"
                  onClick={() => go(t.id)}
                  aria-current={tab === t.id ? "page" : undefined}
                  className={cn(
                    "h-11 w-full whitespace-nowrap rounded-[10px] px-3 text-left text-[15px] transition-colors",
                    tab === t.id ? "bg-paper font-semibold text-ink" : "text-mist hover:bg-lift hover:text-paper",
                  )}
                >
                  {t.label}
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-auto hidden flex-col gap-1 px-3 pb-5 md:flex">
            <a href="/" target="_blank" rel="noreferrer" className="flex h-11 items-center rounded-[10px] px-3 text-[14px] text-dust hover:bg-lift hover:text-paper">
              View live site ↗
            </a>
            <form action={logoutAction}>
              <button type="submit" className="folio h-11 w-full rounded-[10px] px-3 text-left hover:!text-paper">
                Sign out
              </button>
            </form>
          </div>
        </nav>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Toolbar */}
          <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-rule bg-ink/90 px-[clamp(16px,4vw,40px)] py-3 backdrop-blur">
            <p className="text-[14px] text-mist" aria-live="polite">
              {readOnly
                ? "Read-only: publishing isn't configured."
                : busy === "draft"
                  ? "Saving draft…"
                  : busy === "publish"
                    ? "Publishing…"
                    : dirty
                      ? errorCount
                        ? `Unsaved changes · ${errorCount} to fix`
                        : "Unsaved changes"
                      : state.draftDiffers
                        ? "Draft saved, not published"
                        : "Everything is published"}
            </p>
            <div className="flex flex-wrap gap-2">
              {(dirty || state.hasDraft) && (
                <button type="button" onClick={doDiscard} disabled={!!busy} className="pill h-11 px-4 text-[14px] text-dust hover:text-paper">
                  Discard
                </button>
              )}
              <a href="/admin/preview" target="_blank" rel="noreferrer" className="pill pill-line h-11 px-4 text-[14px]">
                Preview draft
              </a>
              <button type="button" onClick={doSaveDraft} disabled={readOnly || !dirty || !!busy} className="pill pill-line h-11 px-4 text-[14px] disabled:opacity-40">
                {busy === "draft" ? "Saving…" : "Save draft"}
              </button>
              <button
                type="button"
                onClick={doPublish}
                disabled={readOnly || (!dirty && !state.draftDiffers) || !!busy}
                className="pill pill-solid h-11 px-5 text-[14px] disabled:opacity-40"
              >
                {busy === "publish" ? "Publishing…" : "Publish"}
              </button>
            </div>
          </div>

          {conflict && (
            <div role="alert" className="mx-[clamp(16px,4vw,40px)] mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-paper p-4">
              <p className="max-w-[640px] text-[15px]">
                Someone (or another tab) changed the content on GitHub after you opened it. Nothing was overwritten. Copy anything you need, then load
                the latest version.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="pill pill-line h-11"
                  onClick={() => {
                    const blob = new Blob([JSON.stringify(cleaned, null, 2)], { type: "application/json" })
                    const a = document.createElement("a")
                    a.href = URL.createObjectURL(blob)
                    a.download = "my-edits.json"
                    a.click()
                  }}
                >
                  Download my edits
                </button>
                <button type="button" className="pill pill-solid h-11" onClick={load}>
                  Load latest
                </button>
              </div>
            </div>
          )}

          <main id="studio-main" tabIndex={-1} className="flex-1 px-[clamp(16px,4vw,40px)] py-8 outline-none">
            {tab === "overview" && (
              <Panel title={`Hello, ${content.profile.name.split(" ")[0]}`} description="Edits are saved to GitHub. Save a draft to preview, then publish.">
                {state.mode !== "github" && (
                  <Card className="border-paper">
                    <p className="text-[15px] leading-[1.55]">
                      {state.mode === "local"
                        ? "Development mode: saves write to content/*.json in this folder instead of GitHub."
                        : "Publishing isn't configured. Add GITHUB_CONTENT_REPO and GITHUB_CONTENT_TOKEN in Vercel (see README), then redeploy."}
                    </p>
                  </Card>
                )}
                <div className="grid gap-3 sm:grid-cols-3">
                  <Card className="flex flex-col gap-1.5">
                    <span className="folio">Live version</span>
                    <span className="text-[22px] font-semibold">{state.publishedSha ? state.publishedSha.slice(0, 7) : "Bundled"}</span>
                  </Card>
                  <Card className="flex flex-col gap-1.5">
                    <span className="folio">Draft</span>
                    <span className="text-[22px] font-semibold">{dirty ? "Unsaved edits" : state.draftDiffers ? "Saved, unpublished" : "None"}</span>
                  </Card>
                  <Card className="flex flex-col gap-1.5">
                    <span className="folio">GitHub</span>
                    <span className="text-[22px] font-semibold">
                      {state.repos.length} repos · {state.githubOrigin === "live" ? "live" : "offline copy"}
                    </span>
                  </Card>
                </div>

                <Card className="flex flex-col gap-0 p-0">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule px-5 py-4">
                    <h3 className="text-[18px] font-semibold">New on GitHub</h3>
                    <button
                      type="button"
                      className="pill pill-line h-10 px-4 text-[14px]"
                      onClick={async () => {
                        await refreshGithub()
                        await load()
                        setToast({ kind: "ok", text: "Fetched the latest from GitHub." })
                      }}
                    >
                      Refresh from GitHub
                    </button>
                  </div>
                  {fresh.length === 0 && <p className="px-5 py-4 text-dust">Every repository is either in the portfolio or hidden.</p>}
                  {fresh.map((r) => (
                    <div key={r.fullName} className="flex flex-wrap items-center justify-between gap-3 border-b border-rule px-5 py-4 last:border-0">
                      <div className="flex min-w-0 flex-col">
                        <span className="font-semibold">{r.name}</span>
                        <span className="font-mono text-[12px] text-dust">
                          {[r.language, `pushed ${fmtDate(r.pushedAt)}`, r.homepage ? "has live site" : "", r.description ? "" : "no description"]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => importRepo(r)} className="pill pill-solid h-10 px-4 text-[14px]">
                          Add to portfolio
                        </button>
                        <button
                          type="button"
                          onClick={() => mutate((d) => void d.hiddenRepos.push(r.name))}
                          className="pill pill-line h-10 px-4 text-[14px]"
                        >
                          Hide
                        </button>
                      </div>
                    </div>
                  ))}
                </Card>

                {state.mode === "github" && (
                  <Card className="flex flex-col gap-3">
                    <h3 className="text-[18px] font-semibold">History</h3>
                    {!historyItems && <p className="text-dust">Loading…</p>}
                    {historyItems?.length === 0 && <p className="text-dust">No published versions yet.</p>}
                    {historyItems?.map((h) => (
                      <div key={h.sha} className="flex flex-wrap items-center justify-between gap-2 text-[15px]">
                        <a href={h.url} target="_blank" rel="noreferrer" className="min-w-0 truncate text-mist hover:text-paper">
                          {h.message}
                        </a>
                        <span className="flex items-center gap-3 font-mono text-[12px] text-dust">
                          {fmtDate(h.date)}
                          <button
                            type="button"
                            className="underline hover:text-paper"
                            onClick={async () => {
                              const ok = await confirm({
                                title: "Load this version into the editor?",
                                body: "Your unsaved edits are replaced. Nothing goes live until you publish.",
                                confirm: "Load version",
                              })
                              if (!ok) return
                              const res = await loadVersion(h.sha)
                              if (!res.ok) return setToast({ kind: "error", text: res.error })
                              setContent(withKeys(res.data))
                              setToast({ kind: "ok", text: `Loaded ${h.sha.slice(0, 7)}. Publish to restore it.` })
                            }}
                          >
                            Restore
                          </button>
                        </span>
                      </div>
                    ))}
                  </Card>
                )}
              </Panel>
            )}
            {tab === "profile" && <ProfilePanel c={content} mutate={mutate} />}
            {tab === "projects" && <ProjectsPanel c={content} mutate={mutate} selected={project} onSelect={setProject} />}
            {tab === "skills" && <SkillsPanel c={content} mutate={mutate} />}
            {tab === "experience" && <ExperiencePanel c={content} mutate={mutate} />}
            {tab === "achievements" && <AchievementsPanel c={content} mutate={mutate} />}
            {tab === "settings" && <SettingsPanel c={content} mutate={mutate} repos={state.repos} />}
          </main>
        </div>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            role={toast.kind === "error" ? "alert" : "status"}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={cn(
              "fixed bottom-5 left-1/2 z-50 flex w-[min(92vw,560px)] -translate-x-1/2 items-center justify-between gap-4 rounded-[14px] px-5 py-4 shadow-2xl",
              toast.kind === "ok" ? "bg-paper text-ink" : "border border-paper bg-lift text-paper",
            )}
          >
            <span className="text-[15px]">
              {toast.kind === "error" ? "⚠ " : "✓ "}
              {toast.text}
              {toast.link && (
                <>
                  {" "}
                  <a href={toast.link} target="_blank" rel="noreferrer" className="underline">
                    View commit
                  </a>
                </>
              )}
            </span>
            <button type="button" onClick={() => setToast(null)} aria-label="Dismiss" className="flex size-9 flex-none items-center justify-center rounded-full hover:bg-black/10">
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </ErrorsContext.Provider>
  )
}
