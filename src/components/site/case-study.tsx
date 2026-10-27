"use client"

import Link from "next/link"
import type { ReactNode } from "react"

import AnimatedContent from "@/components/AnimatedContent"
import { ContainerScroll } from "@/components/ui/container-scroll-animation"
import type { ProjectView } from "@/lib/projects"
import { useReducedMotion } from "@/lib/motion/hooks"

const fmt = (iso: string) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : ""

export function CaseStudy({
  project,
  story,
  next,
  index,
  total,
}: {
  project: ProjectView
  story: ReactNode
  next: ProjectView | null
  index: number
  total: number
}) {
  const reduced = useReducedMotion()
  const prose = project.body || project.description
  const screen = (
    // eslint-disable-next-line @next/next/no-img-element -- same-origin route output
    <img
      src={project.image}
      alt={`${project.title} — preview of the live project`}
      className="h-full w-full rounded-xl object-cover object-left-top"
    />
  )

  return (
    <article className="flex flex-col pt-28">
      <div className="gutter flex flex-col gap-10">
        <div className="folio flex flex-wrap justify-between gap-3">
          <Link href="/#work" className="pill pill-line h-11 !text-paper">
            ← All work
          </Link>
          <span className="self-center">
            Case {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </span>
        </div>

        <header className="flex flex-col gap-7">
          <div className="folio flex flex-wrap gap-2">
            {project.featured && <span className="rounded-full bg-paper px-3.5 py-2 !text-ink">★ Featured</span>}
            <span className="rounded-full border border-edge px-3.5 py-2 !text-mist">{project.category}</span>
            {project.pushedAt && <span className="rounded-full border border-edge px-3.5 py-2 !text-mist">Updated {fmt(project.pushedAt)}</span>}
          </div>
          <h1 className="display text-[clamp(64px,14vw,220px)] !leading-[0.82] tracking-[-0.055em]">{project.title}</h1>
          <div className="flex flex-wrap items-end justify-between gap-8">
            <p className="max-w-[720px] text-[clamp(22px,2.2vw,30px)] leading-[1.25]">
              {project.description || "A project from my GitHub."}
            </p>
            <div className="flex flex-wrap gap-3">
              {project.liveUrl && (
                <a href={project.liveUrl} target="_blank" rel="noreferrer" className="pill pill-solid h-14">
                  Visit live site ↗
                </a>
              )}
              {project.repoUrl && (
                <a href={project.repoUrl} target="_blank" rel="noreferrer" className="pill pill-line h-14">
                  Source ↗
                </a>
              )}
            </div>
          </div>
        </header>
      </div>

      {reduced ? (
        <div className="gutter py-16">
          <div className="mx-auto aspect-[16/10] max-w-5xl overflow-hidden rounded-[16px] border border-rule">{screen}</div>
        </div>
      ) : (
        // The component reserves a tall scroll track; pull the next block up into its tail.
        <div className="-mb-32 md:-mb-56">
          <ContainerScroll titleComponent={<p className="folio mb-10">Scroll — the screen settles flat</p>}>
            {screen}
          </ContainerScroll>
        </div>
      )}

      <div className="gutter flex flex-col gap-16 pb-24">
        <dl className="grid border-y border-rule sm:grid-cols-2 lg:grid-cols-4">
          {[
            { k: "Stack", v: project.tech.join(", ") || "—" },
            {
              k: "Languages (GitHub)",
              v: project.languages.length
                ? project.languages
                    .slice(0, 3)
                    .map((l) => `${l.language} ${Math.round(l.share * 100)}%`)
                    .join(" · ")
                : "—",
            },
            { k: "Repository", v: project.repoFullName || "Not on GitHub" },
            {
              k: "Timeline",
              v: project.createdAt ? `Started ${fmt(project.createdAt)}` : "—",
            },
          ].map(({ k, v }) => (
            <div key={k} className="flex flex-col gap-2 py-6 pr-6">
              <dt className="folio">{k}</dt>
              <dd className="text-[18px] leading-[1.5]">{v}</dd>
            </div>
          ))}
        </dl>

        <div className="grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-20">
          <aside className="flex flex-col gap-5 lg:sticky lg:top-28 lg:self-start">
            <p className="folio">Inside the project</p>
            <a href="#overview" className="flex min-h-11 items-center border-b border-rule text-mist hover:text-paper">01 / Overview ↗</a>
            {story && <a href="#repository-notes" className="flex min-h-11 items-center border-b border-rule text-mist hover:text-paper">02 / Build notes ↗</a>}
            <p className="text-sm leading-relaxed text-dust">Project details and documentation, directly from the source.</p>
          </aside>
          <div className="min-w-0">
        {(prose || project.gallery.length > 0) && (
          <div className="flex flex-wrap gap-16">
            {prose && (
              <AnimatedContent className="min-w-0 flex-[1_1_360px]" distance={30} duration={0.9} ease="expo.out">
                <h2 id="overview" className="mb-6 scroll-mt-28 text-[clamp(32px,4vw,56px)] font-bold tracking-[-0.03em]">The project, <span className="aside">at a glance.</span></h2>
                {prose.split(/\n{2,}/).map((p, i) => (
                  <p key={i} className="mb-4 text-[18px] leading-[1.65] text-mist">
                    {p}
                  </p>
                ))}
              </AnimatedContent>
            )}
            {project.gallery.length > 0 && (
              <ul className="grid min-w-0 flex-[1_1_360px] grid-cols-2 gap-3">
                {project.gallery.map((g) => (
                  <li key={g.src}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- uploaded gallery images */}
                    <img src={g.src} alt={g.alt} loading="lazy" className="aspect-[4/3] w-full rounded-[16px] border border-rule object-cover" />
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        {!prose && <h2 id="overview" className="text-3xl font-bold">Project overview</h2>}
        {story && <section id="repository-notes" className="mt-16 scroll-mt-28 border-t border-rule pt-8">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <p className="folio">02 — Build notes · Synced from GitHub</p>
            <a href={`${project.repoUrl}#readme`} target="_blank" rel="noreferrer" className="pill pill-line">Original README ↗</a>
          </div>
          {story}
        </section>}
          </div>
        </div>

        {project.topics.length > 0 && (
          <ul className="flex flex-wrap gap-2" aria-label="GitHub topics">
            {project.topics.map((t) => (
              <li key={t} className="rounded-full border border-edge px-3 py-1.5 font-mono text-[12px] text-mist">
                #{t}
              </li>
            ))}
          </ul>
        )}

        {next && (
          <Link href={`/work/${next.slug}`} className="group flex flex-wrap items-end justify-between gap-4 border-t border-rule pt-8">
            <span className="folio">Next case</span>
            <span className="display text-[clamp(48px,8vw,120px)] transition-transform duration-500 group-hover:-translate-x-3">
              {next.title} →
            </span>
          </Link>
        )}
      </div>
    </article>
  )
}
