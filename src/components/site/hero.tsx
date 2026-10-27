"use client"

import dynamic from "next/dynamic"
import { AnimatePresence, motion } from "motion/react"
import { useEffect, useRef, useState } from "react"

import ShinyText from "@/components/ShinyText"
import VariableFontAndCursor from "@/components/fancy/text/variable-font-and-cursor"
import type { SiteContent } from "@/lib/content/schema"
import { useMediaQuery, useReducedMotion } from "@/lib/motion/hooks"

import { WebGLGate } from "./webgl-gate"

// Effects load on demand, when their section approaches the viewport.
const LightTunnel = dynamic(() => import("@/components/LightTunnel"), { ssr: false })

/** Static stand-in for the tunnel: concentric hairlines, as on the design canvas. */
function Rings() {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      {[1400, 1120, 840, 560].map((size) => (
        <div
          key={size}
          className="absolute left-1/2 top-[52%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#161616]"
          style={{ width: size, height: size }}
        />
      ))}
    </div>
  )
}

export function Hero({ profile }: { profile: SiteContent["profile"] }) {
  const root = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()
  const fine = useMediaQuery("(pointer: fine)", false)
  const portrait = useMediaQuery("(orientation: portrait)")
  const [roleIndex, setRoleIndex] = useState(0)
  const [first, ...rest] = profile.name.split(" ")
  const last = rest.join(" ")

  useEffect(() => {
    if (reduced || portrait || profile.roles.length < 2) return
    const id = window.setInterval(() => setRoleIndex((i) => (i + 1) % profile.roles.length), 2600)
    return () => window.clearInterval(id)
  }, [reduced, portrait, profile.roles.length])

  // Opening choreography runs in CSS (globals.css, .hero-*) so it starts at first paint
  // instead of waiting for hydration; the intro copy is never hidden, which keeps LCP early.

  const role = profile.roles[roleIndex] ?? profile.roles[0]
  const nameSpan = (text: string, invert = false) =>
    reduced || !fine || portrait ? (
      <span>{text}</span>
    ) : (
      <VariableFontAndCursor
        containerRef={root as React.RefObject<HTMLDivElement | null>}
        fontVariationMapping={{
          x: { name: "wght", min: invert ? 800 : 200, max: invert ? 200 : 800 },
          y: { name: "wdth", min: 75, max: 100 },
        }}
      >
        {text}
      </VariableFontAndCursor>
    )

  return (
    <section
      id="top"
      ref={root}
      aria-label="Introduction"
      className="hero-shell gutter relative isolate flex min-h-[min(100svh,1000px)] flex-col justify-between gap-10 overflow-hidden pb-8 pt-28"
    >
      <WebGLGate defer className="!absolute inset-0 -z-10" fallback={<Rings />}>
        <LightTunnel
          className="absolute inset-0"
          cableColor="#5a5a5a"
          pulseColor="#ffffff"
          tunnelColor="#000000"
          colorVariance={false}
          brightness={fine ? 0.9 : 0.7}
          opacity={0.9}
          cableCount={fine && !portrait ? 40 : 18}
          dpr={1}
          mouseStrength={portrait ? 0 : 0.08}
        />
      </WebGLGate>
      {/* Keeps the type legible over the brightest part of the tunnel. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_30%_70%,rgba(0,0,0,0.85),rgba(0,0,0,0.2)_60%,transparent)]"
      />

      <div className="hero-spacer flex-1" />

      <div className="flex flex-col gap-7">
        <div className="folio flex flex-wrap justify-between gap-3">
          <span className="hero-fade">00 — Cover</span>
          <span className="hero-fade [--d:80ms]">{profile.location}</span>
        </div>

        <h1 className="hero-name display text-[clamp(64px,16vw,248px)] !leading-[0.88] tracking-[-0.055em]">
          <span className="-mb-[0.12em] block overflow-hidden pb-[0.12em]">
            <span className="hero-rise block [--d:100ms]">
              {nameSpan(first)}
            </span>
          </span>
          <span className="-mb-[0.12em] block overflow-hidden pb-[0.14em]">
            <span className="hero-rise flex flex-wrap items-start gap-x-[0.2em] font-extralight [--d:220ms]">
              {nameSpan(last, true)}
              <span className="aside mt-[0.3em] text-[0.3em] !leading-none text-dust">{profile.title.split(" ")[0]}</span>
            </span>
          </span>
        </h1>

        <div className="hero-rule h-px w-full bg-rule" />

        <div className="hero-intro flex flex-wrap items-end justify-between gap-8">
          <div className="flex max-w-[720px] flex-col gap-4">
            <p className="text-[clamp(22px,2.4vw,34px)] leading-[1.15]">
              I build{" "}
              <span className="relative inline-flex min-h-[1.3em] min-w-[6ch]" aria-hidden>
                {reduced || portrait ? <span className="aside">{role}</span> : <AnimatePresence mode="wait" initial={false}>
                  <motion.span key={role} className="aside inline-block" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
                    {role}
                  </motion.span>
                </AnimatePresence>}
              </span>
              <span className="sr-only">{profile.roles.join(", ")}</span>.
            </p>
            <p className="max-w-[560px] text-[17px] leading-relaxed text-mist">{profile.intro}</p>
          </div>

          <div className="flex flex-col items-start gap-4">
            {profile.availability.label && (
              <p className="folio flex items-center gap-2">
                <span
                  aria-hidden
                  className={
                    profile.availability.status === "unavailable"
                      ? "size-2 rounded-full border border-dust"
                      : "size-2 rounded-full bg-paper"
                  }
                />
                <ShinyText text={profile.availability.label} color="#8a8a8a" shineColor="#ffffff" speed={3} />
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              <a href="#work" className="pill pill-solid h-[52px] px-8">See the work <span aria-hidden>↘</span></a>
              <a href="#contact" className="pill pill-line h-[52px]">
                Say hello
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="folio flex flex-wrap justify-between gap-4">
        <ul className="flex gap-5">
          {profile.socials.map((s) => (
            <li key={s.url}>
              <a href={s.url} target="_blank" rel="noreferrer" className="hover:!text-paper">
                {s.label} ↗
              </a>
            </li>
          ))}
        </ul>
        <span className="hidden sm:inline">{fine && !portrait ? "Move the cursor — the name changes weight" : "Independent developer · Dhaka"}</span>
        <span>Scroll — 01 About</span>
      </div>
    </section>
  )
}
