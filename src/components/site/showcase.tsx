"use client"

import Link from "next/link"

import { MacbookScroll } from "@/components/ui/macbook-scroll"
import type { ProjectView } from "@/lib/projects"
import { useReducedMotion } from "@/lib/motion/hooks"

/**
 * The lead project opened on a laptop as you scroll. The screen is the project's real
 * preview image (uploaded screenshot, the live site's og:image, or GitHub's card).
 */
export function Showcase({ project }: { project: ProjectView }) {
  const reduced = useReducedMotion()
  const title = (
    <span className="flex flex-col items-center gap-4">
      <span className="folio">02b — Showcase · {project.category}</span>
      <span className="display text-[clamp(44px,7vw,112px)]">
        {project.title}, <span className="aside">live</span>
      </span>
    </span>
  )

  if (reduced) {
    return (
      <section aria-label={`${project.title} showcase`} className="gutter section-y flex flex-col items-center gap-10">
        {title}
        {/* eslint-disable-next-line @next/next/no-img-element -- same-origin route output */}
        <img src={project.image} alt={`${project.title} preview`} className="w-full max-w-[980px] rounded-[16px] border border-rule" />
        <Link href={`/work/${project.slug}`} className="pill pill-solid">
          Read the case study →
        </Link>
      </section>
    )
  }

  return (
    <section aria-label={`${project.title} showcase`} className="gutter section-y relative flex w-full flex-col items-center gap-12 overflow-x-clip">
      <h2>{title}</h2>
      <div className="flex h-[340px] w-full justify-center sm:h-[520px] lg:h-[620px]" data-laptop-scene>
      <MacbookScroll
        contained
        src={project.image}
        alt={`${project.title} preview`}
        showGradient
        badge={
          <Link href={`/work/${project.slug}`} className="folio rounded-full bg-paper px-3 py-2 !text-ink">
            Case study →
          </Link>
        }
      />
      </div>
      <Link href={`/work/${project.slug}`} className="pill pill-line">Explore Corso Velle →</Link>
    </section>
  )
}
