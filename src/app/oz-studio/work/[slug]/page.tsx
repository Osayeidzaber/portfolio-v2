import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"

import { ProjectStory } from "@/components/site/project-story"
import { StudioHeader } from "@/components/studio/header"
import { studioProjects } from "@/lib/studio/portfolio"
import { getContent } from "@/lib/content/read"
import { getProjectReadme } from "@/lib/github/data"
import "../../theme.css"

async function projectBySlug(slug: string) {
  const content = await getContent()
  return { content, project: content.projects.find((project) => project.slug === slug && !project.hidden) }
}
export async function generateStaticParams() {
  const content = await getContent()
  return content.projects.filter((project) => !project.hidden).map((project) => ({ slug: project.slug }))
}
export async function generateMetadata({ params }: PageProps<"/oz-studio/work/[slug]">): Promise<Metadata> {
  const { project } = await projectBySlug((await params).slug)
  if (!project) return { title: "Project not found", robots: { index: false } }
  return { title: { absolute: `${project.title} — Selected work / OZ Studio` }, description: project.description, alternates: { canonical: `/oz-studio/work/${project.slug}` }, openGraph: { title: `${project.title} / OZ Studio`, description: project.description, url: `/oz-studio/work/${project.slug}`, images: project.thumbnail ? [project.thumbnail] : ["/oz-studio/opengraph-image"] } }
}
async function Project({ params }: Pick<PageProps<"/oz-studio/work/[slug]">, "params">) {
  const { content, project } = await projectBySlug((await params).slug)
  if (!project) notFound()
  const repoUrl = project.repo ? `https://github.com/${project.repo}` : ""
  const markdown = project.repo ? await getProjectReadme(project.repo) : ""
  const selected = studioProjects(content.projects)
  const next = selected[(selected.findIndex((item) => item.slug === project.slug) + 1) % selected.length]
  return <div className="oz-site">
    <a href="#oz-project-main" className="skip-link">Skip to project</a>
    <StudioHeader project />
    <main id="oz-project-main"><section className="oz-case-hero"><Link href="/oz-studio#oz-work" className="oz-text-link">← Back to selected work</Link><p className="oz-label">{project.category.toUpperCase()} / SELECTED WORK BY OSAYEED ZABER</p><h1>{project.title}</h1><p className="oz-case-description">{project.description}</p><div className="oz-case-meta"><div className="oz-case-tags">{project.tech.map((tag) => <span className="oz-badge" key={tag}>{tag}</span>)}</div><div className="oz-row-actions">{project.liveUrl && <a href={project.liveUrl} target="_blank" rel="noreferrer" className="oz-button oz-button-light">Visit website ↗</a>}{repoUrl && <a href={repoUrl} target="_blank" rel="noreferrer" className="oz-button">Repository ↗</a>}</div></div></section>
      {project.thumbnail && <div className="oz-case-image"><Image src={project.thumbnail} alt={`${project.title} website screenshot`} width={1600} height={1000} unoptimized /></div>}
      <section className="oz-case-story" aria-label="About the project"><div><p className="oz-label">THE PROJECT / NOTES & DETAILS</p></div><div>{project.body && <p className="oz-case-body">{project.body}</p>}{markdown ? <ProjectStory markdown={markdown} repoUrl={repoUrl} /> : <p className="oz-case-body">{project.description}</p>}</div></section>
      {next && next.slug !== project.slug && <Link className="oz-next-project" href={`/oz-studio/work/${next.slug}`}><span className="oz-label">KEEP EXPLORING / NEXT PROJECT</span><span>{next.title}<span aria-hidden>↗</span></span><span className="oz-label">{next.category}</span></Link>}
      <section className="oz-contact"><p className="oz-label">HAVE SOMETHING IN MIND?</p><h2>Let’s make<br /><em>your next thing.</em></h2><a href={`mailto:${content.profile.email}?subject=OZ%20Studio%20project%20enquiry`} className="oz-contact-email">{content.profile.email} ↗</a></section>
    </main><footer className="oz-footer"><Link href="/oz-studio" className="oz-wordmark">OZ<span>STUDIO</span></Link><p>An independent practice by Osayeed Zaber.</p><Link href="/oz-studio#oz-work" className="oz-text-link">More selected work ↗</Link></footer>
  </div>
}
export default function StudioProjectPage({ params }: PageProps<"/oz-studio/work/[slug]">) {
  return <Suspense fallback={<div className="oz-loading" role="status">Opening the project…</div>}><Project params={params} /></Suspense>
}
