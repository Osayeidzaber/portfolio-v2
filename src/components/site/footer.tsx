"use client"

import { motion, useScroll, useTransform } from "motion/react"
import Link from "next/link"
import { useRef } from "react"

import LetterSwapPingPong from "@/components/fancy/text/letter-swap-pingpong-anim"
import { useReducedMotion } from "@/lib/motion/hooks"

import type { NavItem } from "./nav"
import { EffectsToggle } from "./effects-toggle"

/*
 * The last scene: an index, a colophon and the name set at full bleed.
 * Built in the pattern of Aceternity's "footer with big text" block (a Pro block we
 * can't install), in our own markup.
 */
export function Footer({
  name,
  location,
  items,
  socials,
  year,
}: {
  year: number
  name: string
  location: string
  items: NavItem[]
  socials: Array<{ label: string; url: string }>
}) {
  const ref = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end end"] })
  const y = useTransform(scrollYProgress, [0, 1], ["40%", "0%"])
  const first = name.split(" ")[0]

  const toTop = () => window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" })

  return (
    <footer ref={ref} className="gutter relative isolate flex flex-col gap-12 overflow-hidden border-t border-rule pb-6 pt-16">
      <div aria-hidden className="pointer-events-none absolute -right-64 top-12 -z-10 size-[640px] rounded-full border border-rule before:absolute before:inset-16 before:rounded-full before:border before:border-rule after:absolute after:inset-32 after:rounded-full after:border after:border-rule" />
      <div className="grid gap-8 border-b border-rule pb-12 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <p className="folio mb-6">End of the page. Start of a conversation.</p>
          <Link href="/#contact" className="group block w-fit text-[clamp(48px,8vw,132px)] font-bold leading-[.95] tracking-[-.055em]">
            Have something<br /><span className="aside">in mind?</span><span className="ml-4 inline-block transition-transform duration-500 group-hover:-translate-y-2 group-hover:translate-x-2">↗</span>
          </Link>
        </div>
        <p className="max-w-64 text-lg leading-relaxed text-mist">A storefront, a platform, a useful little idea. Let&apos;s give it a place on the web.</p>
      </div>
      <div className="folio flex flex-wrap justify-between gap-8">
        <nav aria-label="Footer" className="flex flex-col gap-2.5">
          <span className="!text-paper">Index</span>
          {items.slice(0, 5).map((i) => (
            <a key={i.id} href={`/#${i.id}`} className="flex min-h-11 items-center gap-4 hover:!text-paper">
              <span className="text-dust">{i.folio}</span> {i.label}
            </a>
          ))}
        </nav>
        <div className="flex flex-col gap-2.5">
          <span className="!text-paper">Elsewhere</span>
          {socials.map((s) => (
            <a key={s.url} href={s.url} target="_blank" rel="noreferrer" className="flex min-h-11 items-center hover:!text-paper">
              {s.label} ↗
            </a>
          ))}
        </div>
        <div className="flex flex-col gap-2.5">
          <span className="!text-paper">From Dhaka, with intention.</span>
          <span className="max-w-56 normal-case !tracking-normal text-sm leading-relaxed">Designed, built and continually tinkered with by {name}.</span>
          <Link href="/#play" className="flex min-h-11 items-center hover:!text-paper">Try the workbench ↗</Link>
          <Link href="/oz-studio" className="flex min-h-11 items-center hover:!text-paper">OZ Studio · Design & development ↗</Link>
          <EffectsToggle />
        </div>
        <button
          type="button"
          onClick={toTop}
          aria-label="Back to top"
          className="group flex size-16 items-center justify-center self-start rounded-full border border-edge text-[22px] !text-paper transition-colors hover:bg-paper hover:!text-ink"
        >
          <span className="transition-transform duration-500 group-hover:-translate-y-1">↑</span>
        </button>
      </div>

      <motion.div style={reduced ? undefined : { y }} className="select-none">
        <p className="sr-only">{name}</p>
        <div aria-hidden className="display whitespace-nowrap text-[clamp(80px,21vw,340px)] !leading-[0.78] tracking-[-0.065em]">
          {reduced ? (
            <span>{first}.</span>
          ) : (
            <LetterSwapPingPong label={`${first}.`} staggerFrom="center" staggerDuration={0.04} className="cursor-default" />
          )}
        </div>
      </motion.div>

      <div className="folio flex flex-wrap justify-between gap-3 !text-[11px]">
        <span>
          © {year} {name} · {location.split(",")[0]}
        </span>
        <span>Made to be explored · Thanks for stopping by</span>
      </div>
    </footer>
  )
}
