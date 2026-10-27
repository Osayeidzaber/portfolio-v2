"use client"

import dynamic from "next/dynamic"

import { useReducedMotion } from "@/lib/motion/hooks"

// Effects load on demand, when their section approaches the viewport.
const TextLoop = dynamic(() => import("@/components/TextLoop"), {
  ssr: false,
  // Holds the ribbon's height while the chunk loads, so nothing below jumps.
  loading: () => <div className="aspect-[1440/250] w-full" />,
})

/** Full-bleed crossing ribbons between the cover and the first chapter. Purely decorative. */
export function Ribbon({ words }: { words: string[] }) {
  const reduced = useReducedMotion()
  const text = words.join(" ✦ ")
  if (reduced) {
    return (
      <div aria-hidden className="folio overflow-hidden whitespace-nowrap border-y border-rule bg-paper py-4 !text-ink">
        {text}
      </div>
    )
  }
  return (
    <div aria-hidden className="relative -my-10 overflow-hidden">
      <TextLoop
        text={text}
        shape="wave"
        curviness={40}
        speed={60}
        fontSize={34}
        fontWeight={800}
        letterSpacing={1}
        color="#000000"
        ribbonColor="#f2f2f2"
        ribbonWidth={64}
        cross
        crossColor="#141414"
        crossAngle={-6}
        scrollBoost={1.5}
        className="font-sans"
      />
    </div>
  )
}
