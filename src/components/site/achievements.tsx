"use client"

import AnimatedContent from "@/components/AnimatedContent"
import { Tooltip } from "@/components/ui/tooltip-card"
import type { Achievement } from "@/lib/content/schema"

import { ChapterTitle, Folio } from "./section-head"

const KIND: Record<Achievement["kind"], string> = {
  award: "Award",
  certificate: "Cert.",
  recognition: "Lead.",
  event: "Event",
  milestone: "Mile.",
}

const fmt = (ym: string) => {
  if (!ym) return ""
  const [y, m] = ym.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" })
}

/** Only rendered when at least one real (non-placeholder) item exists. */
export function Achievements({ items }: { items: Achievement[] }) {
  return (
    <section id="recognition" aria-labelledby="recognition-title" className="gutter section-y flex flex-col gap-14">
      <Folio index="06" name="Recognition" aside="Certificates · awards · events" />
      <div className="flex flex-wrap items-start gap-12">
        <div className="flex-[1_1_420px]">
          <ChapterTitle className="!text-[clamp(56px,8vw,128px)]">
            <span id="recognition-title">
              On the <span className="aside">record</span>
            </span>
          </ChapterTitle>
        </div>
        <ul className="min-w-0 flex-[999_1_560px] border-t border-rule">
          {items.map((a, i) => {
            const row = (
              <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-3 py-7">
                <span className="folio w-[72px] flex-none">{KIND[a.kind]}</span>
                <span className="flex min-w-0 flex-[1_1_300px] flex-col gap-1">
                  <span className="text-[28px] font-semibold leading-[1.1] tracking-[-0.02em]">{a.title}</span>
                  {a.issuer && <span className="text-[15px] text-dust">{a.issuer}</span>}
                </span>
                <span className="folio">{fmt(a.date)}</span>
              </div>
            )
            const body = a.url ? (
              <a href={a.url} target="_blank" rel="noreferrer" className="block hover:bg-lift">
                {row}
              </a>
            ) : (
              row
            )
            return (
              <AnimatedContent key={a.id} distance={30} delay={i * 0.05} duration={0.8} ease="expo.out">
                <li className="border-b border-rule">
                  {a.image ? (
                    <Tooltip
                      containerClassName="block w-full"
                      content={
                        // eslint-disable-next-line @next/next/no-img-element -- uploaded certificate image
                        <img src={a.image} alt={`${a.title} certificate`} className="w-full rounded-md" loading="lazy" />
                      }
                    >
                      {body}
                    </Tooltip>
                  ) : (
                    body
                  )}
                </li>
              </AnimatedContent>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
