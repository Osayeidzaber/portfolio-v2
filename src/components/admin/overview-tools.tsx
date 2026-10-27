"use client"

import Link from "next/link"
import type { SiteContent } from "@/lib/content/schema"
import { studioProjects } from "@/lib/studio/portfolio"
import { Card } from "./fields"

export function OverviewTools({ content, onProjects, onProfile }: { content: SiteContent; onProjects: (index: number) => void; onProfile: () => void }) {
  const visible = content.projects.filter((project) => !project.hidden)
  const studio = studioProjects(content.projects)
  const incomplete = content.projects.flatMap((project, index) => !project.hidden && (!project.description || !project.thumbnail) ? [{ project, index }] : [])
  return <>
    <div className="admin-destinations"><Link href="/" target="_blank" rel="noreferrer"><span className="folio">01 / PERSONAL</span><strong>Your portfolio <span aria-hidden>↗</span></strong><span>{visible.length} curated projects · View public site</span></Link><Link href="/oz-studio" target="_blank" rel="noreferrer"><span className="folio">02 / THE PRACTICE</span><strong>OZ Studio <span aria-hidden>↗</span></strong><span>{studio.length} selected projects · View studio</span></Link><Link href="/admin/oz-studio"><span className="folio">03 / ACCOUNTS</span><strong>The invoice desk <span aria-hidden>↗</span></strong><span>Draft, preview and manage invoices</span></Link></div>
    <Card className="flex flex-col gap-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><h3 className="text-xl font-semibold">A little housekeeping.</h3><p className="mt-2 text-sm leading-relaxed text-mist">A clear profile and considered project previews make both portfolios easier to explore.</p></div><button className="pill pill-line min-h-11 text-sm" onClick={() => onProjects(0)}>Curate studio work ↗</button></div><div className="admin-health"><div><span className="folio">Profile & contact</span><strong>{content.profile.avatar && content.profile.email ? "Portrait and email ready" : "Check your profile details"}</strong><button className="min-h-11 text-left text-sm underline" onClick={onProfile}>Edit profile →</button></div><div><span className="folio">Project previews</span><strong>{incomplete.length ? `${incomplete.length} could use attention` : "Descriptions and thumbnails ready"}</strong><p className="text-sm leading-relaxed text-mist">{incomplete.length ? "Add your own descriptions and images for a consistent presentation." : "Every visible project has a description and preview image."}</p></div></div>{incomplete.length > 0 && <div className="admin-attention">{incomplete.map(({ project, index }) => <button key={project.slug} className="min-h-11 text-left text-sm" onClick={() => onProjects(index)}>{project.title}<span className="text-dust">{!project.thumbnail ? " Add preview image" : " Add description"} ↗</span></button>)}</div>}</Card>
  </>
}
