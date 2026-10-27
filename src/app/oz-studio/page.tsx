import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"

import { getContent } from "@/lib/content/read"
import { siteUrl } from "@/lib/env"
import { StudioHeader } from "@/components/studio/header"
import { ProjectCollection } from "@/components/studio/project-collection"
import { ProjectEnquiry } from "@/components/studio/project-enquiry"
import { studioProjects } from "@/lib/studio/portfolio"
import "./theme.css"

export const metadata: Metadata = {
  title: { absolute: "OZ Studio — Independent design & development" },
  description: "The independent studio of Osayeed Zaber. Websites, Shopify storefronts, and the systems behind them. Based in Dhaka, working on the web.",
  alternates: { canonical: "/oz-studio" },
  openGraph: { title: "OZ Studio", description: "Independent by design. Websites, storefronts, and the systems behind them.", url: `${siteUrl}/oz-studio`, images: ["/oz-studio/opengraph-image"] },
  twitter: { card: "summary_large_image", images: ["/oz-studio/opengraph-image"] },
}

const services = [
  { number: "01", name: "Web experiences", description: "Websites that put a clear story and careful interaction first. From a first impression to the final form submission.", tags: "NEXT.JS / REACT / INTERACTION" },
  { number: "02", name: "Commerce, considered.", description: "Custom Shopify storefronts shaped around the products, the people buying them, and the people running the store.", tags: "SHOPIFY / LIQUID / STOREFRONTS" },
  { number: "03", name: "The systems behind it.", description: "Admin portals, client dashboards, delivery workflows and practical tools that make the everyday work easier.", tags: "DASHBOARDS / PORTALS / WORKFLOWS" },
]

export default async function OzStudioPage() {
  const content = await getContent()
  const projects = studioProjects(content.projects)
  return <div className="oz-site">
    <a href="#oz-main" className="skip-link">Skip to studio</a>
    <StudioHeader />
    <main id="oz-main">
      <section className="oz-hero" aria-labelledby="oz-title">
        <div className="oz-hero-top"><span className="oz-label">INDEPENDENT DESIGN & DEVELOPMENT</span><span className="oz-label">DHAKA / WORKING ON THE WEB</span></div>
        <div className="oz-hero-layout">
          <div className="oz-hero-copy"><p className="oz-eyebrow">A small studio. A considered approach.</p><h1 id="oz-title">Good ideas.<br />Built <em>properly.</em></h1><p className="oz-intro">Websites, storefronts, and the systems behind them. An independent practice by Osayeed Zaber, built around the details that make a difference.</p><div className="oz-hero-actions"><a href={`mailto:${content.profile.email}?subject=Let%E2%80%99s%20make%20something%20with%20OZ%20Studio`} className="oz-button oz-button-light">Let’s make something <span aria-hidden>↗</span></a><a href="#oz-work" className="oz-text-link">Explore the work ↓</a></div></div>
          <div className="oz-brand-stage"><div className="oz-stage-corner oz-corner-top" aria-hidden>+</div><Image src="/oz-studio/logo.svg" alt="OZ Studio monogram and wordmark" width={1080} height={1080} priority className="oz-hero-logo" /><div className="oz-stage-corner oz-corner-bottom" aria-hidden>+</div><span className="oz-stage-caption oz-label">ONE PRACTICE. FROM IDEA TO LIVE.</span></div>
        </div>
        <div className="oz-hero-bottom oz-label"><span>DESIGN WITH INTENT. BUILD WITH CARE.</span><span>SCROLL TO EXPLORE ↓</span></div>
      </section>
      <section id="oz-work" className="oz-section" aria-labelledby="oz-work-title"><div className="oz-section-heading"><div><p className="oz-label">01 / SELECTED WORK</p><h2 id="oz-work-title">Proof in the <em>making.</em></h2></div><p>Selected projects by Osayeed.<br />The foundation of a new studio.</p></div><ProjectCollection projects={projects} /></section>
      <section id="oz-services" className="oz-section oz-practice" aria-labelledby="oz-services-title"><div className="oz-section-heading"><div><p className="oz-label">02 / THE PRACTICE</p><h2 id="oz-services-title">From first sketch<br />to <em>what’s next.</em></h2></div><p>Design and development, together.<br />One person close to the whole project.</p></div>{services.map((service) => <article className="oz-service" key={service.number}><span className="oz-label">/{service.number}</span><h3>{service.name}</h3><div><p>{service.description}</p><span className="oz-label">{service.tags}</span></div></article>)}</section>
      <section id="oz-about" className="oz-section oz-about" aria-labelledby="oz-about-title"><div><p className="oz-label">03 / THE PERSON BEHIND THE MARK</p><h2 id="oz-about-title">Independent<br />by <em>design.</em></h2></div><div className="oz-about-copy"><p>OZ Studio is my independent design and development practice. I’m Osayeed, a full-stack developer based in Dhaka, building across the web and Shopify.</p><p>I like being close to the whole thing: understanding what needs to work, shaping how it feels, and writing the code that brings it together. The studio gives that work a home of its own.</p><Link href="/" className="oz-text-link">Meet the person behind the studio ↗</Link><div className="oz-process"><span className="oz-label">HOW WE’LL WORK</span><p><strong>Understand.</strong> A conversation about the problem and the people.</p><p><strong>Shape.</strong> A clear direction, scope and plan.</p><p><strong>Build.</strong> Thoughtful design, working software, regular check-ins.</p><p><strong>Launch.</strong> The details checked, the work handed over.</p></div></div></section>
      <section id="oz-contact" className="oz-contact" aria-labelledby="oz-contact-title"><p className="oz-label">04 / THE NEXT THING STARTS HERE</p><h2 id="oz-contact-title">Something<br />on your <em>mind?</em></h2><div className="oz-contact-bottom"><p>A new business. A better storefront.<br />An idea you’re ready to build. Let’s talk.</p><a href={`mailto:${content.profile.email}?subject=OZ%20Studio%20project%20enquiry`} className="oz-contact-email">{content.profile.email}<span aria-hidden>↗</span></a></div><ProjectEnquiry email={content.profile.email} /></section>
    </main>
    <footer className="oz-footer"><Link href="/oz-studio" className="oz-wordmark">OZ<span>STUDIO</span></Link><p>An independent practice by Osayeed Zaber.</p><nav aria-label="Studio footer"><Link href="/">Personal portfolio ↗</Link><Link href="/admin/oz-studio">Studio workspace ↗</Link></nav></footer>
  </div>
}
