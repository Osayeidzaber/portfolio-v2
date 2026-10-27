"use client"

import dynamic from "next/dynamic"
import Link from "next/link"
import { AnimatePresence, motion } from "motion/react"
import { useMemo, useState } from "react"

import GradientText from "@/components/GradientText"
import { Tooltip } from "@/components/ui/tooltip-card"
import type { ProjectView } from "@/lib/projects"
import { cn } from "@/lib/utils"
import { useMediaQuery } from "@/lib/motion/hooks"

import { ChapterTitle, Folio } from "./section-head"
import { WebGLGate } from "./webgl-gate"

// Effects load on demand, when their section approaches the viewport.
const FlexCarousel = dynamic(() => import("@/components/FlexCarousel"), { ssr: false })

const fmtMonth = (iso: string) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" }) : ""

/** Plain image strip used when WebGL is off: still swipeable, still selectable. */
function StripFallback({ items, active, onPick }: { items: ProjectView[]; active: number; onPick: (i: number) => void }) {
  return (
    <div className="gutter flex h-full snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
      {items.map((p, i) => (
        <button
          key={p.slug}
          type="button"
          onClick={() => onPick(i)}
          aria-pressed={i === active}
          className={cn(
            "relative h-full w-[88vw] max-w-[1100px] flex-none snap-center overflow-hidden rounded-[16px] border transition-colors",
            i === active ? "border-paper" : "border-rule",
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- same-origin route output, sized by CSS */}
          <img src={p.image} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover object-top" />
          <span className="absolute inset-x-0 bottom-0 bg-black/90 p-4 text-left text-[28px] font-bold tracking-[-0.03em]">{p.title}</span>
        </button>
      ))}
    </div>
  )
}

export function Work({ projects, categories }: { projects: ProjectView[]; categories: string[] }) {
  const phone = useMediaQuery("(max-width: 639px)")
  const usedCategories = useMemo(
    () => ["All", ...categories.filter((c) => projects.some((p) => p.category === c))],
    [categories, projects],
  )
  const [category, setCategory] = useState("All")
  const [active, setActive] = useState(0)
  const list = useMemo(
    () => (category === "All" ? projects : projects.filter((p) => p.category === category)),
    [projects, category],
  )
  const current = list[Math.min(active, list.length - 1)]
  const items = useMemo(
    () => list.map((p) => ({ src: p.image, alt: `${p.title} preview`, title: p.title, subtitle: p.category })),
    [list],
  )

  return (
    <section id="work" aria-labelledby="work-title" className="section-y flex flex-col gap-12">
      <div className="gutter flex flex-col gap-10">
        <Folio index="02" name="Selected work" aside={`${list.length} projects · Explore the collection`} />
        <div className="flex flex-wrap items-end justify-between gap-8">
          <ChapterTitle>
            <span id="work-title">
              Built to be
              <br />
              <span className="aside">used.</span>
            </span>
          </ChapterTitle>
          <div role="group" aria-label="Filter projects by category" className="flex flex-wrap gap-1 rounded-full border border-rule p-[5px]">
            {usedCategories.map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={category === c}
                onClick={() => {
                  setCategory(c)
                  setActive(0)
                }}
                className={cn(
                  "folio relative h-10 rounded-full px-4 transition-colors",
                  category === c ? "!text-ink" : "hover:!text-paper",
                )}
              >
                {category === c && (
                  <motion.span layoutId="work-filter" className="absolute inset-0 -z-0 rounded-full bg-paper" />
                )}
                <span className="relative">{c}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Full-bleed stage: the carousel owns the whole viewport width. */}
      <div className="relative h-[clamp(260px,42vw,600px)] w-full" data-carousel-stage>
        <WebGLGate
          key={category}
          className="h-full"
          fallback={<StripFallback items={list} active={active} onPick={setActive} />}
        >
          <FlexCarousel
            items={items}
            preset="liquid"
            cardHeight={phone ? 0.64 : 0.9}
            fit="wide"
            intro="none"
            bend={0.06}
            reach={0.04}
            tilt={0}
            squeeze={0}
            focusOnClick={false}
            gap={28}
            dispersion={0}
            radius={16}
            captions={false}
            captureWheel={false}
            onChange={(i) => setActive(i)}
            className="h-full"
          />
        </WebGLGate>
      </div>

      <p className="folio gutter -mt-6">Drag or swipe to explore · Choose a project below for the full story ↘</p>

      <div className="gutter">
        <AnimatePresence mode="wait">
          {current && (
            <motion.article
              key={current.slug}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="grid gap-8 border-t border-rule pt-8 md:grid-cols-[1.2fr_1fr]"
              aria-live="polite"
            >
              <div className="flex flex-col gap-4">
                <div className="folio flex flex-wrap items-center gap-3">
                  <span>
                    {String(list.indexOf(current) + 1).padStart(2, "0")} / {String(list.length).padStart(2, "0")}
                  </span>
                  <span>·</span>
                  <span>{current.category}</span>
                  {current.featured && (
                    <GradientText
                      colors={["#5a5a5a", "#ffffff", "#5a5a5a"]}
                      animationSpeed={6}
                      className="!mx-0 font-mono text-[12px] uppercase tracking-[0.14em]"
                    >
                      ★ Featured
                    </GradientText>
                  )}
                </div>
                <h3 className="text-[clamp(40px,5vw,72px)] font-bold leading-[0.95] tracking-[-0.04em]">{current.title}</h3>
                <p className="max-w-[620px] text-[18px] leading-[1.6] text-mist">
                  {current.description || "No description on GitHub yet."}
                </p>
              </div>
              <div className="flex flex-col justify-between gap-6">
                <ul className="flex flex-wrap gap-2" aria-label="Technologies">
                  {current.tech.map((t) => (
                    <li key={t}>
                      <Tooltip
                        containerClassName="text-paper"
                        content={
                          <span className="block text-[13px] leading-[1.5]">
                            <span className="folio block !text-[11px]">{current.title} uses</span>
                            {t}
                            {current.languages.length > 0 && (
                              <span className="mt-2 block text-[12px] text-dust">
                                Repo languages:{" "}
                                {current.languages
                                  .slice(0, 3)
                                  .map((l) => `${l.language} ${Math.round(l.share * 100)}%`)
                                  .join(" · ")}
                              </span>
                            )}
                          </span>
                        }
                      >
                        <span className="inline-flex h-9 items-center rounded-full border border-edge px-3.5 font-mono text-[12px] text-mist">
                          {t}
                        </span>
                      </Tooltip>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap items-center gap-3">
                  <Link href={`/work/${current.slug}`} className="pill pill-solid">
                    Open case study →
                  </Link>
                  {current.liveUrl && (
                    <a href={current.liveUrl} target="_blank" rel="noreferrer" className="pill pill-line">
                      Live site ↗
                    </a>
                  )}
                  {current.repoUrl && (
                    <a href={current.repoUrl} target="_blank" rel="noreferrer" className="pill pill-line">
                      Source ↗
                    </a>
                  )}
                </div>
                {current.pushedAt && <p className="folio">Last push {fmtMonth(current.pushedAt)}</p>}
              </div>
            </motion.article>
          )}
        </AnimatePresence>

        {/* The index: every project as a plain link, for keyboards, screen readers and skimmers. */}
        <nav aria-label="All projects" className="mt-16">
          <h3 className="folio mb-3">Index</h3>
          <ul className="border-t border-rule">
            {list.map((p, i) => (
              <li key={p.slug}>
                <Link
                  href={`/work/${p.slug}`}
                  className="group flex items-baseline justify-between gap-4 border-b border-rule py-4"
                >
                  <span className="flex items-baseline gap-4">
                    <span className="folio w-8">{String(i + 1).padStart(2, "0")}</span>
                    <span className="text-[clamp(22px,2.4vw,32px)] font-semibold tracking-[-0.02em] transition-transform duration-300 group-hover:translate-x-2">
                      {p.title}
                    </span>
                  </span>
                  <span className="folio hidden text-right sm:inline">
                    {p.category}
                    {p.auto ? " · from GitHub" : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </section>
  )
}
