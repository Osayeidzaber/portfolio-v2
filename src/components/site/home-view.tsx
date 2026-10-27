import dynamic from "next/dynamic"
import { Suspense } from "react"

import { About } from "@/components/site/about"
import { Hero } from "@/components/site/hero"
import { Ribbon } from "@/components/site/ribbon"
import { Work } from "@/components/site/work"
import { visible } from "@/lib/content/read"
import { siteUrl } from "@/lib/env"
import { languageShares } from "@/lib/github/rank"
import { buildProjects } from "@/lib/projects"

import type { SiteContent } from "@/lib/content/schema"
import type { GithubData } from "@/lib/github/types"

// Below-the-fold chapters ship as separate chunks.
const Achievements = dynamic(() => import("@/components/site/achievements").then((m) => m.Achievements))
const Contact = dynamic(() => import("@/components/site/contact").then((m) => m.Contact))
const Experience = dynamic(() => import("@/components/site/experience").then((m) => m.Experience))
const Ledger = dynamic(() => import("@/components/site/ledger").then((m) => m.Ledger))
const Playground = dynamic(() => import("@/components/site/playground").then((m) => m.Playground))
const Showcase = dynamic(() => import("@/components/site/showcase").then((m) => m.Showcase))
const Toolkit = dynamic(() => import("@/components/site/toolkit").then((m) => m.Toolkit))

/** The whole home page for a given content + GitHub snapshot (used by / and the admin preview). */
export function HomeView({ content, github }: { content: SiteContent; github: GithubData }) {
  const { profile, sections } = content
  const projects = buildProjects(content, github)
  const lead = projects.find((p) => p.slug === "corso-velle") ?? projects.find((p) => p.featured) ?? projects[0]
  const ownRepos = github.repos.filter((r) => !r.fork)
  const languages = languageShares(ownRepos)
  const experience = visible(content.experience)
  const achievements = visible(content.achievements)
  const avatar = profile.avatar || github.profile.avatarUrl

  const sinceYear = github.profile.createdAt.slice(0, 4)
  const shopify = content.projects.filter((p) => !p.hidden && p.category === "Shopify").length
  const activeDays = github.activity.days.filter((d) => d.count > 0).length
  const stars = ownRepos.reduce((a, r) => a + r.stars, 0)

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profile.name,
    jobTitle: profile.title,
    url: siteUrl,
    image: avatar,
    email: profile.email ? `mailto:${profile.email}` : undefined,
    address: profile.location ? { "@type": "PostalAddress", addressLocality: profile.location } : undefined,
    sameAs: profile.socials.map((s) => s.url),
    knowsAbout: content.skills.flatMap((g) => g.items.map((i) => i.name)),
  }

  return (
    <>
      <script
        type="application/ld+json"
        // JSON.stringify output with `<` escaped cannot break out of the script tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <Hero profile={profile} />
      <Ribbon words={profile.roles} />
      {/* Each chapter is its own Suspense boundary, so React hydrates them one at a time
          and yields to the browser in between instead of one long main-thread task. */}
      <Suspense>
        {sections.about && (
          <About
            about={content.about}
            profile={profile}
            avatar={avatar}
            stats={[
              { value: String(github.profile.publicRepos), label: "Public repos" },
              { value: sinceYear, label: "On GitHub since" },
              ...(shopify ? [{ value: String(shopify), label: "Shopify stores shipped" }] : []),
            ]}
          />
        )}
      </Suspense>
      <Suspense>
        {sections.work && projects.length > 0 && <Work projects={projects} categories={content.categories} />}
      </Suspense>
      <Suspense>
        {sections.showcase && lead && <Showcase project={lead} />}
      </Suspense>
      <Suspense>
        {sections.toolkit && <Toolkit skills={content.skills} interests={content.interests} />}
      </Suspense>
      <Suspense>
        {sections.ledger && (
          <Ledger
            login={github.profile.login}
            activity={github.activity}
            events={github.events}
            languages={languages}
            fetchedAt={github.fetchedAt}
            origin={github.origin}
            stats={[
              { value: String(github.profile.publicRepos), label: "Public repos" },
              { value: String(languages.length), label: "Languages" },
              { value: String(activeDays), label: github.activity.source === "calendar" ? "Active days, 1 yr" : "Active days, 90 d" },
              { value: String(stars), label: "Stars received" },
            ]}
          />
        )}
      </Suspense>
      <Suspense>
        {sections.experience && experience.length > 0 && <Experience items={experience} />}
      </Suspense>
      <Suspense>
        {sections.achievements && achievements.length > 0 && <Achievements items={achievements} />}
      </Suspense>
      <Suspense>
        {sections.playground && <Playground veilImage={lead ? lead.image : avatar} />}
      </Suspense>
      <Suspense>
        {sections.contact && <Contact profile={profile} contact={content.contact} />}
      </Suspense>
    </>
  )
}
