"use client"

import dynamic from "next/dynamic"
import { motion } from "motion/react"
import { useState } from "react"

import LogoLoop, { type LogoItem } from "@/components/LogoLoop"
import { Marquee } from "@/components/ui/marquee"
import type { SkillGroup } from "@/lib/content/schema"
import { cn } from "@/lib/utils"

import { ChapterTitle, Folio } from "./section-head"
import { WebGLGate } from "./webgl-gate"

// Effects load on demand, when their section approaches the viewport.
const MicroSlats = dynamic(() => import("@/components/MicroSlats"), { ssr: false })

const iconUrl = (slug: string) => `https://cdn.simpleicons.org/${slug}/f2f2f2`
const monogram = (name: string) => name.replace(/[^A-Za-z]/g, "").slice(0, 2)

function SkillIcon({ name, icon, size = 20 }: { name: string; icon: string; size?: number }) {
  if (!icon) return <span className="font-mono text-[13px]">{monogram(name)}</span>
  // eslint-disable-next-line @next/next/no-img-element -- tiny remote SVG icons
  return <img src={iconUrl(icon)} alt="" width={size} height={size} loading="lazy" />
}

export function Toolkit({ skills, interests }: { skills: SkillGroup[]; interests: string[] }) {
  const groups = skills.filter((g) => g.items.length)
  const [tab, setTab] = useState(groups[0]?.category ?? "")
  const current = groups.find((g) => g.category === tab) ?? groups[0]
  const all = groups.flatMap((g) => g.items)

  const logos: LogoItem[] = all.map((s) => ({
    node: (
      <span className="flex items-center gap-3 whitespace-nowrap text-[clamp(28px,4vw,56px)] font-bold tracking-[-0.03em]">
        <span className="flex size-[0.9em] items-center justify-center">
          <SkillIcon name={s.name} icon={s.icon} size={40} />
        </span>
        {s.name}
      </span>
    ),
    title: s.name,
  }))

  const onKeyTabs = (e: React.KeyboardEvent) => {
    const i = groups.findIndex((g) => g.category === tab)
    if (e.key === "ArrowDown" || e.key === "ArrowRight") setTab(groups[(i + 1) % groups.length].category)
    if (e.key === "ArrowUp" || e.key === "ArrowLeft") setTab(groups[(i - 1 + groups.length) % groups.length].category)
  }

  return (
    <section id="toolkit" aria-labelledby="toolkit-title" className="section-y relative isolate flex flex-col gap-14 overflow-hidden">
      {/* Slats behind the whole chapter, not in a box. */}
      <WebGLGate className="!absolute inset-0 -z-10 opacity-60" fallback={null}>
        <MicroSlats
          className="absolute inset-0"
          color="#141414"
          glintColor="#5a5a5a"
          backgroundColor="#000000"
          interactive
        />
      </WebGLGate>
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(180deg,#000_0%,transparent_25%,transparent_75%,#000_100%)]" />

      <div className="gutter flex flex-col gap-10">
        <Folio index="03" name="Toolkit" aside="Only what I actually use" />
        <ChapterTitle>
          <span id="toolkit-title">
            The <span className="aside">kit</span>
          </span>
        </ChapterTitle>
      </div>

      <div className="border-y border-rule bg-ink/60 py-6 backdrop-blur-[2px]">
        <LogoLoop
          logos={logos}
          speed={60}
          gap={64}
          logoHeight={56}
          fadeOut
          fadeOutColor="#000000"
          pauseOnHover
          scaleOnHover
          ariaLabel="Technologies I use"
        />
      </div>

      {interests.length > 0 && (
        <div aria-label="Interests" className="-mt-14 border-b border-rule">
          <Marquee reverse pauseOnHover className="[--duration:48s] [--gap:3rem] py-5">
            {interests.map((i) => (
              <span key={i} className="aside whitespace-nowrap text-[clamp(32px,4vw,64px)] text-dust">
                {i} <span className="not-italic text-edge">✦</span>
              </span>
            ))}
          </Marquee>
        </div>
      )}

      {current && (
        <div className="gutter flex flex-wrap gap-12">
          <div
            role="tablist"
            aria-label="Skill categories"
            aria-orientation="vertical"
            onKeyDown={onKeyTabs}
            className="flex flex-[0_1_280px] flex-col border-t border-rule"
          >
            {groups.map((g) => {
              const selected = g.category === current.category
              return (
                <button
                  key={g.category}
                  type="button"
                  role="tab"
                  id={`tab-${g.category}`}
                  aria-selected={selected}
                  aria-controls="skills-panel"
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setTab(g.category)}
                  className={cn(
                    "relative flex min-h-14 w-full items-center justify-between border-b border-rule px-4 text-left text-[22px] transition-colors",
                    selected ? "font-semibold text-ink" : "text-mist hover:text-paper",
                  )}
                >
                  {selected && <motion.span layoutId="skills-tab" className="absolute inset-0 -z-0 bg-paper" />}
                  <span className="relative">{g.category}</span>
                  <span className="relative font-mono text-[12px]">{String(g.items.length).padStart(2, "0")}</span>
                </button>
              )
            })}
          </div>
          <div
            id="skills-panel"
            role="tabpanel"
            aria-labelledby={`tab-${current.category}`}
            className="grid min-w-0 flex-[999_1_560px] content-start gap-3 [grid-template-columns:repeat(auto-fill,minmax(200px,1fr))]"
          >
            {current.items.map((s, i) => (
              <motion.div
                key={`${current.category}-${s.name}`}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="group flex flex-col gap-5 rounded-[16px] border border-rule bg-lift p-6 transition-colors hover:border-edge"
              >
                <span className="flex size-11 items-center justify-center rounded-full border border-edge transition-transform duration-500 group-hover:rotate-[360deg]">
                  <SkillIcon name={s.name} icon={s.icon} />
                </span>
                <span className="flex flex-col gap-1">
                  <span className="text-[22px] font-semibold">{s.name}</span>
                  {s.note && <span className="font-mono text-[12px] text-dust">{s.note}</span>}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
