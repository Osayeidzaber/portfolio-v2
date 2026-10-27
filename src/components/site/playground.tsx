"use client"

import dynamic from "next/dynamic"
import Link from "next/link"
import { useState, useSyncExternalStore } from "react"

import JellyRadio from "@/components/JellyRadio"
import SpecularButton from "@/components/SpecularButton"

import { ChapterTitle, Folio } from "./section-head"
import { WebGLGate } from "./webgl-gate"

// Effects load on demand, when their section approaches the viewport.
const DitherVeil = dynamic(() => import("@/components/DitherVeil"), { ssr: false })
const ElasticMesh = dynamic(() => import("@/components/ElasticMesh"), { ssr: false })
const FuzzyText = dynamic(() => import("@/components/FuzzyText"), { ssr: false })

// three.js only loads when someone actually opens the shader lab.
const InkPress = dynamic(() => import("@/components/shaders/ink-press"), { ssr: false })

type Mode = "mesh" | "veil" | "fuzz" | "ink"

const MODES: Array<{ value: Mode; label: string; hint: string; control: string }> = [
  { value: "mesh", label: "Elastic Mesh", hint: "Grab the word and pull — it springs back", control: "Stretch" },
  { value: "veil", label: "Dither Veil", hint: "Move over the print to lift the dither", control: "Dot size" },
  { value: "fuzz", label: "Fuzzy Text", hint: "Hover or tap to tune the signal", control: "Noise" },
  { value: "ink", label: "Shader Lab", hint: "Push the ink around with the pointer", control: "Turbulence" },
]

/** The resolved body font stack; canvas-based effects need the real family name. */
function useBodyFont() {
  return useSyncExternalStore(
    () => () => {},
    () => getComputedStyle(document.body).fontFamily,
    () => "system-ui, sans-serif",
  )
}

function Still({ label }: { label: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_50%_50%,#1a1a1a,#000_65%)]">
      <span className="display text-[clamp(64px,12vw,200px)]">{label}</span>
    </div>
  )
}

export function Playground({ veilImage }: { veilImage: string }) {
  const [mode, setMode] = useState<Mode>("mesh")
  const [amount, setAmount] = useState(60)
  const [seed, setSeed] = useState(0)
  const [labOpen, setLabOpen] = useState(false)
  const font = useBodyFont()
  const meta = MODES.find((m) => m.value === mode)!
  const t = amount / 100

  const stage = {
    mesh: (
      <ElasticMesh
        key={`mesh-${seed}`}
        text="stretch"
        fontFamily={font}
        fontWeight={800}
        color="#f2f2f2"
        imageColors={false}
        material="chrome"
        theme="dark"
        stretch={0.2 + t * 0.8}
        wobble={0.2 + t * 0.7}
        className="absolute inset-0"
      />
    ),
    veil: (
      <DitherVeil
        key={`veil-${seed}`}
        src={veilImage}
        fit="cover"
        pattern="floyd"
        pixelSize={Math.round(1 + t * 7)}
        inkColor="#000000"
        paperColor="#f2f2f2"
        rimColor="#ffffff"
        rim={0.4}
        revealRadius={180}
        wander
        className="absolute inset-0"
      />
    ),
    fuzz: (
      <div className="absolute inset-0 flex items-center justify-center">
        <FuzzyText
          key={`fuzz-${seed}`}
          fontSize="clamp(64px, 14vw, 220px)"
          fontWeight={800}
          fontFamily={font}
          color="#f2f2f2"
          baseIntensity={0.05 + t * 0.4}
          hoverIntensity={0.3 + t * 0.6}
          clickEffect
          glitchMode={amount > 80}
          intro
        >
          static
        </FuzzyText>
      </div>
    ),
    ink: <InkPress key={`ink-${seed}`} strength={0.2 + t * 1.3} className="!absolute inset-0" />,
  }[mode]

  return (
    <section id="play" aria-labelledby="play-title" className="gutter section-y flex flex-col gap-10">
      <Folio index="07" name="Crafting room" aside="Minecraft utilities · Made for the next session" />
      <div className="flex flex-wrap items-end justify-between gap-6">
        <ChapterTitle>
          <span id="play-title">
            Less guessing.
            <br /><span className="aside">More crafting.</span>
          </span>
        </ChapterTitle>
        <p className="max-w-sm text-lg leading-relaxed text-mist">A whole other world of little helpers. Minecraft calculators, color tools and a LuckPerms rank builder, in their own crafting room.</p>
      </div>
      <Link href="/minecraft" className="mc-launch-card group">
        <span className="mc-launch-block" aria-hidden><span /></span>
        <span className="mc-launch-copy"><span className="folio">Side quest / Minecraft tools</span><span className="mc-launch-title">Enter the crafting room <span className="inline-block transition-transform group-hover:translate-x-2">↗</span></span><span>13 free tools. Coordinates, ranks, gradients, XP and more.</span></span>
        <span className="mc-button">Open tools</span>
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-6 border-t border-rule pt-8">
        <div><h3 className="text-3xl font-semibold tracking-tight">After hours <span className="aside">/ visual lab</span></h3><p className="mt-2 text-mist">Interactive type, materials and shaders. This is where I try things out.</p></div>
        <button type="button" aria-expanded={labOpen} aria-controls="visual-lab" className="pill pill-line" onClick={() => setLabOpen((open) => !open)}>{labOpen ? "Close the lab −" : "Enter the lab ↗"}</button>
      </div>
      {labOpen && <div id="visual-lab" className="flex min-w-0 flex-col gap-8">
        <div className="-mx-1 max-w-full overflow-x-auto px-1 pb-1">
        <JellyRadio
          items={MODES.map((m) => ({ value: m.value, label: m.label }))}
          value={mode}
          onChange={(v) => setMode(v as Mode)}
          chipColor="#0a0a0a"
          activeColor="#f2f2f2"
          textColor="#bdbdbd"
          activeTextColor="#000000"
          size="md"
          ariaLabel="Choose an experiment"
        />
        </div>

      {/* One experiment mounted at a time: one GPU context, never four. */}
      <div className="relative h-[clamp(420px,62vh,640px)] overflow-hidden rounded-[16px] border border-rule bg-ink">
        <WebGLGate key={mode} className="!absolute inset-0" fallback={<Still label={mode === "fuzz" ? "static" : "play"} />}>
          {stage}
        </WebGLGate>
        <div className="folio pointer-events-none absolute inset-x-6 top-6 flex flex-wrap justify-between gap-3 !text-mist">
          <span>{meta.label}</span>
          <span>{meta.hint}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-6">
        <label className="folio flex items-center gap-3">
          {meta.control}
          <input
            type="range"
            min={0}
            max={100}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="h-11 w-48 accent-[#f2f2f2]"
          />
          <output className="w-8 text-paper">{amount}</output>
        </label>
        <WebGLGate motionSafe fallback={<button type="button" onClick={() => setSeed((s) => s + 1)} className="pill pill-line h-11">Reset</button>}>
          <SpecularButton radius={24} size="md" baseColor="#3a3a3a" lineColor="#ffffff" textColor="#f2f2f2" tint="#ffffff" tintOpacity={0.06} onClick={() => setSeed((s) => s + 1)}>Reset</SpecularButton>
        </WebGLGate>
        <span className="folio">Effects pause off-screen and switch to stills with reduced motion.</span>
      </div>
      </div>}
    </section>
  )
}
