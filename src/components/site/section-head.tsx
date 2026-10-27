"use client"

import type { ReactNode } from "react"

import AnimatedContent from "@/components/AnimatedContent"

/** The folio row every chapter opens with: `NN — Name` on the left, context on the right. */
export function Folio({ index, name, aside }: { index: string; name: string; aside?: ReactNode }) {
  return (
    <AnimatedContent distance={16} duration={0.8} ease="expo.out" threshold={0.2}>
      <div className="folio flex flex-wrap justify-between gap-3 border-t border-rule pt-4">
        <span>
          {index} — {name}
        </span>
        {aside && <span>{aside}</span>}
      </div>
    </AnimatedContent>
  )
}

/** A display heading that rises in line by line, with an italic serif aside. */
export function ChapterTitle({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <AnimatedContent distance={60} duration={1.1} ease="expo.out" blur={8} threshold={0.15}>
      <h2 className={`display text-[clamp(56px,9vw,152px)] ${className}`}>{children}</h2>
    </AnimatedContent>
  )
}
