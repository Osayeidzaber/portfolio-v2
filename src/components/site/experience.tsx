"use client"

import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { useRef } from "react"

import type { Experience as ExperienceItem } from "@/lib/content/schema"
import { useReducedMotion } from "@/lib/motion/hooks"

import { ChapterTitle, Folio } from "./section-head"

gsap.registerPlugin(useGSAP, ScrollTrigger)

const fmt = (ym: string) => {
  if (!ym) return "Now"
  const [y, m] = ym.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" })
}

export function Experience({ items }: { items: ExperienceItem[] }) {
  const root = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()
  const sorted = [...items].sort((a, b) => b.start.localeCompare(a.start))
  const firstYear = sorted.at(-1)?.start.slice(0, 4)

  useGSAP(
    () => {
      if (reduced) return
      // The spine draws itself with the scroll; each entry lights its dot as it passes.
      gsap.fromTo(
        "[data-spine]",
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: "none",
          transformOrigin: "top",
          scrollTrigger: { trigger: "[data-timeline]", start: "top 70%", end: "bottom 60%", scrub: 0.6 },
        },
      )
      gsap.utils.toArray<HTMLElement>("[data-entry]").forEach((el) => {
        gsap.from(el, {
          opacity: 0,
          x: 40,
          duration: 0.9,
          ease: "expo.out",
          scrollTrigger: { trigger: el, start: "top 82%", once: true },
        })
        ScrollTrigger.create({
          trigger: el,
          start: "top 60%",
          end: "bottom 60%",
          toggleClass: { targets: el, className: "is-current" },
        })
      })
    },
    { scope: root, dependencies: [reduced, items.length] },
  )

  return (
    <section id="experience" ref={root} aria-labelledby="experience-title" className="gutter section-y flex flex-col gap-14 overflow-x-clip">
      <Folio index="05" name="Experience" aside={firstYear ? `${firstYear} → now` : undefined} />
      <ChapterTitle>
        <span id="experience-title">
          A few chapters
          <br />
          <span className="aside">of the journey.</span>
        </span>
      </ChapterTitle>

      <ol data-timeline className="relative ml-2">
        <span aria-hidden className="absolute bottom-0 left-0 top-0 w-px bg-rule" />
        <span aria-hidden data-spine className="absolute bottom-0 left-0 top-0 w-px origin-top bg-paper" />
        {sorted.map((item, index) => (
          <li
            key={item.id}
            data-entry
            className="group relative mb-6 flex flex-wrap gap-x-12 gap-y-4 border-b border-rule pb-8 pl-8 pt-6 transition-colors duration-500 sm:pl-12 [&.is-current]:bg-lift [&.is-current_.dot]:bg-paper [&.is-current_.dot]:shadow-[0_0_0_6px_#000,0_0_0_7px_#3a3a3a]"
          >
            <span aria-hidden className="dot absolute -left-[6px] top-[10px] size-[13px] rounded-full border border-dust bg-ink transition-all duration-500" />
            <span className="w-[140px] flex-none pt-2 font-mono text-[13px] tracking-[0.08em] text-dust">
              <span className="mb-4 block text-[40px] leading-none tracking-[-0.06em] text-dust">{String(index + 1).padStart(2, "0")}</span>
              <time dateTime={item.start}>{fmt(item.start)}</time>
              {item.end && (
                <>
                  {" – "}
                  <time dateTime={item.end}>{fmt(item.end)}</time>
                </>
              )}
              {!item.end && <span className="mt-3 block text-paper">↳ Ongoing</span>}
            </span>
            <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-2">
              <h3 className="text-[clamp(26px,3vw,40px)] font-bold leading-[1.05] tracking-[-0.03em]">
                {item.link ? (
                  <a href={item.link} target="_blank" rel="noreferrer" className="hover:underline hover:decoration-1 hover:underline-offset-4">
                    {item.title}
                  </a>
                ) : (
                  item.title
                )}
              </h3>
              {(item.org || item.role) && (
                <p className="folio !text-mist">{[item.org, item.role].filter(Boolean).join(" · ")}</p>
              )}
              {item.description && <p className="max-w-[640px] text-[17px] leading-[1.55] text-dust">{item.description}</p>}
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
