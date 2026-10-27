import { Suspense } from "react"

import { Footer } from "@/components/site/footer"
import { HomeView } from "@/components/site/home-view"
import { Nav } from "@/components/site/nav"
import { requireAdmin } from "@/lib/auth/session"
import { bundledContent, CONTENT_PATH, DRAFT_PATH } from "@/lib/content/read"
import { readFile } from "@/lib/content/repo"
import { parseContent } from "@/lib/content/schema"
import { getGithubData } from "@/lib/github/data"
import { navItems } from "@/lib/site"

async function DraftPreview() {
  await requireAdmin()
  const [draft, published, github] = await Promise.all([readFile(DRAFT_PATH), readFile(CONTENT_PATH), getGithubData()])
  const pick = draft ?? published
  const parsed = pick ? parseContent(JSON.parse(pick.text)) : null
  const content = parsed?.success ? parsed.data : bundledContent()
  const items = navItems(content)
  return (
    <>
      <div className="folio fixed bottom-4 left-1/2 z-[70] -translate-x-1/2 rounded-full bg-paper px-4 py-2.5 !text-ink shadow-lg">
        {draft ? "Preview of your saved draft — not live" : "No draft saved — showing published content"} ·{" "}
        <a href="/admin" className="underline">
          Back to editor
        </a>
      </div>
      <Nav items={items} name={content.profile.name} socials={content.profile.socials} />
      <main id="main">
        <HomeView content={content} github={github} />
      </main>
      <Footer
        name={content.profile.name}
        location={content.profile.location}
        items={items}
        socials={content.profile.socials}
        year={new Date(github.fetchedAt).getUTCFullYear()}
      />
    </>
  )
}

export default function PreviewPage() {
  return (
    <Suspense fallback={<p className="folio gutter py-10">Loading preview…</p>}>
      <DraftPreview />
    </Suspense>
  )
}
