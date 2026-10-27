"use client"

import AnimatedContent from "@/components/AnimatedContent"
import ReflectiveCard from "@/components/ReflectiveCard"
import { TextAnimate } from "@/components/ui/text-animate"
import type { SiteContent } from "@/lib/content/schema"

import { Folio } from "./section-head"
import { WebGLGate } from "./webgl-gate"

type Stat = { value: string; label: string }

export function About({
  about,
  profile,
  avatar,
  stats,
}: {
  about: SiteContent["about"]
  profile: SiteContent["profile"]
  /** Uploaded portrait, else the GitHub avatar. */
  avatar: string
  stats: Stat[]
}) {
  const pillars = about.pillars.filter((p) => !p.placeholder)
  const portrait = (
    <div className="flex h-full flex-col justify-between">
      <div className="folio flex justify-between !text-[11px]">
        <span>ID — OZ/26</span>
        <span>{profile.location.split(",")[0]}</span>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element -- plain img keeps the WebGL card simple and avatars are tiny */}
      <img
        src={avatar}
        alt={`Portrait of ${profile.name}`}
        width={220}
        height={220}
        loading="lazy"
        className="mx-auto aspect-square w-[62%] rounded-full object-cover grayscale"
      />
      <div className="flex flex-col gap-1">
        <span className="text-[28px] font-bold leading-none tracking-[-0.02em]">{profile.name}</span>
        <span className="folio !text-[11px]">{profile.title}</span>
      </div>
    </div>
  )

  return (
    <section id="about" aria-labelledby="about-title" className="gutter section-y flex flex-col gap-[72px]">
      <Folio index="01" name="About" aside="Margin notes" />

      <div className="flex flex-wrap items-start gap-16">
        <div className="flex min-w-0 flex-[1_1_520px] flex-col gap-10">
          <h2 id="about-title" className="text-[clamp(44px,6.4vw,104px)] font-bold leading-[0.92] tracking-[-0.045em]">
            <TextAnimate as="span" by="word" animation="blurInUp" startOnView once>
              {about.heading}
            </TextAnimate>
          </h2>
          <div className="grid max-w-[760px] gap-8 sm:grid-cols-2">
            {about.paragraphs.map((p, i) => (
              <AnimatedContent key={i} distance={40} delay={0.1 * i} duration={0.9} ease="expo.out">
                <p className="text-[18px] leading-[1.6] text-mist">{p}</p>
              </AnimatedContent>
            ))}
          </div>
          {stats.length > 0 && (
            <dl className="flex flex-wrap border-y border-rule">
              {stats.map((s, i) => (
                <div
                  key={s.label}
                  className={`flex flex-[1_1_160px] flex-col-reverse gap-1.5 py-6 ${i ? "sm:border-l sm:border-rule sm:pl-6" : ""} pr-6`}
                >
                  <dt className="folio">{s.label}</dt>
                  <dd className="text-[56px] font-bold leading-none tracking-[-0.04em]">{s.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        <figure className="flex min-w-[280px] flex-[0_1_360px] flex-col gap-4">
          <WebGLGate
            motionSafe
            keepMounted
            fallback={
              <div className="aspect-[3/4.4] rounded-[24px] border border-edge bg-[linear-gradient(160deg,#1a1a1a,#050505_55%,#121212)] p-5">
                {portrait}
              </div>
            }
          >
            <ReflectiveCard
              width="100%"
              height={500}
              radius={24}
              tint="#ffffff"
              grayscale={1}
              statusColor="#f2f2f2"
              className="!w-full"
            >
              {portrait}
            </ReflectiveCard>
          </WebGLGate>
          {about.quote && (
            <figcaption className="aside text-[22px] leading-[1.3] text-mist">&ldquo;{about.quote}&rdquo;</figcaption>
          )}
        </figure>
      </div>

      {pillars.length > 0 && (
        <ol className="grid border-t border-rule sm:grid-cols-2 lg:grid-cols-4">
          {pillars.map((p, i) => (
            <li key={p.title} className="flex flex-col gap-2.5 pb-4 pr-6 pt-7">
              <span className="folio">{["i.", "ii.", "iii.", "iv.", "v.", "vi."][i]}</span>
              <span className="text-[22px] font-semibold">{p.title}</span>
              <span className="text-[16px] leading-[1.55] text-dust">{p.body}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
