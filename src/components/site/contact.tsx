"use client"

import { useState } from "react"

import LetterSwapForward from "@/components/fancy/text/letter-swap-forward-anim"
import { BackgroundGradientAnimation } from "@/components/ui/background-gradient-animation"
import type { SiteContent } from "@/lib/content/schema"
import { useReducedMotion } from "@/lib/motion/hooks"

import { Folio } from "./section-head"

export function Contact({ profile, contact }: { profile: SiteContent["profile"]; contact: SiteContent["contact"] }) {
  const reduced = useReducedMotion()
  const [copied, setCopied] = useState<"idle" | "done" | "failed">("idle")
  const [line1, ...line2] = contact.heading.split(" ")

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(profile.email)
      setCopied("done")
    } catch {
      setCopied("failed")
    }
    window.setTimeout(() => setCopied("idle"), 2400)
  }

  const links = [
    ...profile.socials,
    ...(profile.resume ? [{ label: "Résumé (PDF)", url: profile.resume }] : []),
  ]

  const body = (
    <div className="gutter section-y relative z-10 flex min-h-[min(900px,100svh)] flex-col justify-center gap-12">
      <Folio
        index="08"
        name="Contact"
        aside={
          <span className="inline-flex items-center gap-2">
            <span aria-hidden className={profile.availability.status === "unavailable" ? "size-2 rounded-full border border-dust" : "size-2 rounded-full bg-paper"} />
            {profile.availability.label}
          </span>
        }
      />
      <h2 id="contact-title" className="display text-[clamp(72px,15vw,240px)] !leading-[0.9] tracking-[-0.055em]">
        {line1}
        <br />
        <span className="aside">{line2.join(" ")}</span>
      </h2>
      {contact.note && <p className="max-w-[520px] text-[18px] leading-[1.55] text-mist">{contact.note}</p>}
      {profile.email && (
        <div className="flex flex-wrap items-center gap-3">
          <a href={`mailto:${profile.email}`} className="pill pill-solid h-16 px-8 text-[clamp(16px,2vw,20px)]">
            {profile.email}
          </a>
          <button type="button" onClick={copy} className="pill pill-line h-16 px-7 text-[18px]">
            {copied === "done" ? "Copied ✓" : copied === "failed" ? "Press ⌘C / Ctrl+C" : "Copy email"}
          </button>
          <span className="sr-only" aria-live="polite">
            {copied === "done" ? "Email address copied to clipboard" : ""}
          </span>
        </div>
      )}
      <ul className="flex flex-wrap border-t border-rule">
        {links.map((l) => (
          <li key={l.url} className="flex-[1_1_220px] border-b border-rule">
            <a
              href={l.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between py-6 pr-6 text-[28px] font-semibold"
            >
              <LetterSwapForward label={l.label} staggerFrom="center" />
              <span aria-hidden className="text-dust">
                {l.label.startsWith("Résumé") ? "↓" : "↗"}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  )

  return (
    <section id="contact" aria-labelledby="contact-title" className="relative isolate w-full">
      {!reduced && <div aria-hidden className="pointer-events-none absolute -inset-y-32 inset-x-0 -z-10 overflow-hidden opacity-45 [mask-image:linear-gradient(to_bottom,transparent,black_25%,black_75%,transparent)]">
        <BackgroundGradientAnimation
          containerClassName="!absolute !inset-0 !h-full !w-full !overflow-visible"
          gradientBackgroundStart="rgb(0, 0, 0)"
          gradientBackgroundEnd="rgb(5, 5, 5)"
          firstColor="38, 38, 38"
          secondColor="22, 22, 22"
          thirdColor="58, 58, 58"
          fourthColor="14, 14, 14"
          fifthColor="30, 30, 30"
          pointerColor="70, 70, 70"
          size="70%"
          blendingValue="screen"
          interactive={false}
        />
      </div>}
      {body}
    </section>
  )
}
