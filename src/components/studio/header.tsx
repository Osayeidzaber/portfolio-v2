import Link from "next/link"

export function StudioHeader({ project = false }: { project?: boolean }) {
  const base = project ? "/oz-studio" : ""
  return <header className="oz-header">
    <Link href="/oz-studio" className="oz-wordmark" aria-label="OZ Studio home">OZ<span>STUDIO</span><span className="oz-brand-dot" aria-hidden /></Link>
    <nav aria-label="Studio navigation">
      <a href={`${base}#oz-work`}>Work</a><a href={`${base}#oz-services`}>Practice</a><a href={`${base}#oz-about`}>About</a>
      <a href={`${base}#oz-contact`} className="oz-nav-cta">Let’s talk <span aria-hidden>↗</span></a>
    </nav>
  </header>
}
