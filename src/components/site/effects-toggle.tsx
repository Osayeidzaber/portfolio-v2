"use client"

import { useEffect } from "react"
import { setReducedEffects, useReducedEffects } from "@/lib/motion/preferences"

export function EffectsToggle() {
  const reduced = useReducedEffects()
  useEffect(() => { document.documentElement.dataset.effects = reduced ? "reduced" : "full" }, [reduced])
  return <button type="button" aria-label="Use fewer visual effects" aria-pressed={reduced} onClick={() => setReducedEffects(!reduced)} className="folio flex min-h-11 items-center gap-2 rounded-full border border-edge px-3 !text-paper"><span aria-hidden>{reduced ? "◐" : "◉"}</span>{reduced ? "Fewer effects" : "Full effects"}</button>
}
