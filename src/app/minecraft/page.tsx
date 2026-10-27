import type { Metadata, Viewport } from "next"
import Link from "next/link"
import { MinecraftWorkbench } from "@/components/site/minecraft-workbench"
import { siteUrl } from "@/lib/env"

export const metadata: Metadata = {
  title: { absolute: "Minecraft Tools & LuckPerms Rank Builder | Zaber" },
  description: "Free Minecraft calculators, RGB gradients and LuckPerms rank commands. 13 tools, live previews, no login — all in your browser.",
  alternates: { canonical: "/minecraft" },
  openGraph: { type: "website", title: "Minecraft Crafting Room", description: "13 free Minecraft tools, including RGB gradients and LuckPerms rank builders.", url: `${siteUrl}/minecraft`, images: [{ url: "/minecraft/opengraph-image", width: 1200, height: 630 }] },
  twitter: { card: "summary_large_image", title: "Minecraft Crafting Room | Zaber", description: "Calculators, RGB gradients and LuckPerms commands, made easy.", images: ["/minecraft/opengraph-image"] },
}
export const viewport: Viewport = { themeColor: "#17251d" }

export default function MinecraftPage() {
  return <div className="mc-tools-page">
    <a href="#tools" className="skip-link">Skip to tools</a>
    <header className="mc-page-header"><Link href="/" className="mc-page-brand"><span aria-hidden className="mc-brand-block" />ZABER.TECH<span className="mc-page-edition">/ SIDE QUESTS</span></Link><Link href="/" className="mc-page-back">← Portfolio</Link></header>
    <main>
      <section className="mc-page-hero" aria-labelledby="minecraft-title">
        <div className="mc-page-sky" aria-hidden><span /><span /><span /><span /><span /></div>
        <div className="mc-hero-scene" aria-hidden>
          <svg viewBox="0 0 320 280" shapeRendering="crispEdges">
            <path fill="#6c573d" d="m25 170 135-70 135 70-135 70z" /><path fill="#4c3c2b" d="m25 170 135 70v35L25 205z" /><path fill="#382c23" d="m160 240 135-70v35l-135 70z" /><path fill="#7b9c48" d="m25 164 135-70 135 70-135 70z" /><path fill="#4f7136" d="m25 164 135 70v9L25 173z" /><path fill="#3d5a30" d="m160 234 135-70v9l-135 70z" />
            <path fill="#a38653" d="m43 191 17 9v8l-17-9zm35 19 13 7v6l-13-7zm46 23 15 8v10l-15-8z" /><path fill="#62503b" d="m192 237 20-10v9l-20 10zm50-26 14-7v7l-14 7z" />
            <path fill="#281f35" d="m137 73 54-28 39 20v102l-54 28-39-20z" /><path fill="#4e3b5d" d="m137 73 39 20v102l-39-20zm0 0 54-28 39 20-54 28z" /><path fill="#191520" d="m176 93 54-28v102l-54 28z" /><path fill="#7c3fb0" d="m184 98 37-19v82l-37 19z" /><path fill="#a05cd6" d="m190 108 7-4v20l-7 4zm15-11 8-4v43l-8 4zm-12 43 8-4v29l-8 4z" /><path fill="#c895ec" d="m190 104 4-2v8l-4 2zm18 43 5-3v14l-5 3z" />
            <path fill="#775439" d="m71 135 10-5 10 5v43l-10 5-10-5z" /><path fill="#365a34" d="m48 100 33-17 34 17v47l-34 17-33-17z" /><path fill="#567c42" d="m48 100 33-17 34 17-34 17z" /><path fill="#294b30" d="m81 117 34-17v47l-34 17z" /><path fill="#6a8c4b" d="m57 100 15-8 10 5-15 8z" />
            <path fill="#839c51" d="m249 154 8-4v-12l6-3v12l8-4v7l-8 4v11l-6 3v-11l-8 4z" /><path fill="#88a755" d="m101 186 7-4v-10l5-3v10l8-4v7l-8 4v8l-5 3v-8l-7 4z" />
            <path fill="#c78ef4" d="M242 72h5v5h-5zm-14-42h4v4h-4zm-65 0h4v4h-4zM127 109h4v4h-4z" />
          </svg>
          <span className="mc-scene-caption">YOUR NEXT SIDE QUEST</span>
        </div>
        <p className="mc-page-kicker">A few useful blocks of the internet</p>
        <h1 id="minecraft-title">THE CRAFTING<br /><span>ROOM</span><span aria-hidden className="mc-page-splash">Now with ranks!</span></h1>
        <p className="mc-page-intro">Build the world. We&apos;ll do the math.<br />Coordinates, gradients, inventory helpers and LuckPerms commands — right in your browser.</p>
        <div className="mc-page-hero-actions"><a href="#tools" className="mc-button">Open inventory ↓</a><span>13 tools · Free to use · No account</span></div>
        <div className="mc-page-terrain" aria-hidden />
      </section>
      <section id="tools" className="mc-page-tools" aria-labelledby="inventory-title"><h2 id="inventory-title">Pick your next upgrade.</h2><MinecraftWorkbench /></section>
    </main>
    <footer className="mc-page-footer"><span>Crafted by <Link href="/">Osayeed Zaber ↗</Link></span><a href="mailto:mail@zaber.tech">mail@zaber.tech</a><span>Fan-made tools. Not an official Minecraft product.</span></footer>
  </div>
}
