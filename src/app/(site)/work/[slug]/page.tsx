import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"

import { CaseStudy } from "@/components/site/case-study"
import { ProjectStory } from "@/components/site/project-story"
import { getContent } from "@/lib/content/read"
import { siteUrl } from "@/lib/env"
import { getGithubData, getProjectReadme } from "@/lib/github/data"
import { buildProjects } from "@/lib/projects"

async function load(slug: string) {
  const [content, github] = await Promise.all([getContent(), getGithubData()])
  const projects = buildProjects(content, github)
  const index = projects.findIndex((p) => p.slug === slug)
  return { projects, index, project: projects[index] }
}

export async function generateStaticParams() {
  const [content, github] = await Promise.all([getContent(), getGithubData()])
  return buildProjects(content, github).map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: PageProps<"/work/[slug]">): Promise<Metadata> {
  const { slug } = await params
  const { project } = await load(slug)
  if (!project) return { title: "Project not found" }
  return {
    title: project.title,
    description: project.description || `${project.title} — a project by Osayeed Zaber.`,
    alternates: { canonical: `/work/${project.slug}` },
    openGraph: {
      type: "article",
      url: `${siteUrl}/work/${project.slug}`,
      title: project.title,
      description: project.description,
      images: [{ url: project.image }],
    },
  }
}

async function WorkContent({ params }: Pick<PageProps<"/work/[slug]">, "params">) {
  const { slug } = await params
  const { projects, index, project } = await load(slug)
  if (!project) notFound()
  const readme = project.repoFullName ? await getProjectReadme(project.repoFullName) : ""
  const next = projects.length > 1 ? projects[(index + 1) % projects.length] : null

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: project.title,
    description: project.description,
    url: `${siteUrl}/work/${project.slug}`,
    ...(project.repoUrl ? { codeRepository: project.repoUrl } : {}),
    ...(project.createdAt ? { dateCreated: project.createdAt } : {}),
    ...(project.pushedAt ? { dateModified: project.pushedAt } : {}),
    author: { "@type": "Person", name: "Osayeed Zaber", url: siteUrl },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <CaseStudy project={project} story={readme ? <ProjectStory markdown={readme} repoUrl={project.repoUrl} /> : null} next={next} index={index} total={projects.length} />
    </>
  )
}

export default function WorkPage({ params }: PageProps<"/work/[slug]">) {
  return (
    <Suspense fallback={<div className="gutter min-h-[70svh] pt-36" role="status"><p className="folio">Opening the case study…</p><div aria-hidden className="mt-10 h-32 w-3/4 rounded-xl bg-lift" /></div>}>
      <WorkContent params={params} />
    </Suspense>
  )
}
