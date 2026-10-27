"use client"

import { useState } from "react"

import { ActivityHeatmap } from "@/components/arc/activity-heatmap/activity-heatmap"
import AnimatedContent from "@/components/AnimatedContent"
import type { GithubActivity, GithubEvent } from "@/lib/github/types"

import { ChapterTitle, Folio } from "./section-head"

const SHADES = ["#f2f2f2", "#bdbdbd", "#8a8a8a", "#5a5a5a", "#3a3a3a", "#262626"]

const fmtDay = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })

export type LedgerStats = Array<{ value: string; label: string }>

export function Ledger({
  login,
  activity,
  events,
  languages,
  stats,
  fetchedAt,
  origin,
}: {
  login: string
  activity: GithubActivity
  events: GithubEvent[]
  languages: Array<{ language: string; share: number }>
  stats: LedgerStats
  fetchedAt: string
  origin: "live" | "snapshot"
}) {
  const [selected, setSelected] = useState<string | null>(null)
  const top = languages.slice(0, 6)
  const period = activity.source === "calendar" ? "the last year" : "the last 90 days of public activity"
  const dayEvents = selected ? events.filter((e) => e.date.startsWith(selected)) : []

  return (
    <section id="ledger" aria-labelledby="ledger-title" className="gutter section-y flex flex-col gap-14">
      <Folio
        index="04"
        name="Ledger"
        aside={
          <a href={`https://github.com/${login}`} target="_blank" rel="noreferrer" className="hover:!text-paper">
            @{login} ↗
          </a>
        }
      />
      <div className="flex flex-wrap items-end justify-between gap-6">
        <ChapterTitle>
          <span id="ledger-title">
            The <span className="aside">ledger</span>
          </span>
        </ChapterTitle>
        <p className="max-w-[440px] text-[16px] leading-[1.55] text-dust">
          {activity.source === "calendar"
            ? "Every square is a real day from GitHub's contribution calendar."
            : "Every square is a day of public GitHub events (pushes, new repos, releases). GitHub only exposes the last 90 days of these without a token."}{" "}
          Nothing here is typed in by hand.
        </p>
      </div>

      <AnimatedContent distance={40} duration={0.9} ease="expo.out">
        <div className="ledger-heatmap rounded-[16px] border border-rule bg-[#050505] p-[clamp(16px,3vw,32px)]">
          <ActivityHeatmap
            days={activity.days}
            label={`GitHub activity for ${login}`}
            period={period}
            unit={activity.source === "calendar" ? { one: "contribution", other: "contributions" } : { one: "event", other: "events" }}
            selectedDate={selected}
            onSelectDate={(d) => setSelected((cur) => (cur === d ? null : d))}
          />
          {selected && (
            <div className="mt-5 border-t border-rule pt-4 text-[15px] text-mist" aria-live="polite">
              <span className="folio mr-3">{fmtDay(selected)}</span>
              {dayEvents.length
                ? dayEvents.map((e) => `${e.summary} in ${e.repo.split("/")[1]}`).join(" · ")
                : "No public events in the recent feed for this day."}
            </div>
          )}
        </div>
      </AnimatedContent>

      <dl className="grid grid-cols-2 border-y border-rule md:grid-cols-4">
        {stats.map((s, i) => (
          <div key={s.label} className={`flex flex-col-reverse gap-1.5 py-6 ${i % 2 ? "pl-6" : "pr-6"} md:px-6 md:first:pl-0 ${i ? "md:border-l md:border-rule" : ""}`}>
            <dt className="folio">{s.label}</dt>
            <dd className="text-[clamp(36px,4vw,56px)] font-bold leading-none tracking-[-0.04em]">{s.value}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-wrap gap-12">
        <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-5">
          <h3 className="folio">Languages, by bytes across public repos</h3>
          <div className="flex h-3.5 gap-0.5 overflow-hidden rounded-full" role="img" aria-label={top.map((l) => `${l.language} ${Math.round(l.share * 100)}%`).join(", ")}>
            {top.map((l, i) => (
              <div key={l.language} style={{ flexGrow: l.share, background: SHADES[i] }} />
            ))}
          </div>
          <ul className="grid grid-cols-2 gap-x-6 gap-y-2.5 font-mono text-[13px] text-mist">
            {top.map((l, i) => (
              <li key={l.language} className="flex items-center gap-2.5">
                <span aria-hidden className="size-2.5 rounded-[3px]" style={{ background: SHADES[i] }} />
                {l.language}
                <span className="ml-auto text-dust">{(l.share * 100).toFixed(1)}%</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex min-w-0 flex-[1_1_380px] flex-col">
          <h3 className="folio pb-4">Recent public activity</h3>
          <ul className="border-t border-rule">
            {events.slice(0, 6).map((e) => (
              <li key={e.id}>
                <a
                  href={`https://github.com/${e.repo}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-baseline justify-between gap-4 border-b border-rule py-4 hover:bg-lift"
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-[20px] font-semibold">{e.repo.split("/")[1]}</span>
                    <span className="text-[14px] text-dust">{e.summary}</span>
                  </span>
                  <span className="folio shrink-0">{fmtDay(e.date)}</span>
                </a>
              </li>
            ))}
            {!events.length && <li className="py-4 text-dust">No public events in the last 90 days.</li>}
          </ul>
        </div>
      </div>

      <p className="folio !normal-case !tracking-normal">
        {origin === "live" ? "Fetched from GitHub" : "GitHub was unreachable; showing the last saved copy from"}{" "}
        {new Date(fetchedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" })} UTC.
        Refreshes hourly and on every push.
      </p>
    </section>
  )
}
