import { Footer } from "@/components/site/footer"
import { Nav } from "@/components/site/nav"
import { getContent } from "@/lib/content/read"
import { getGithubData } from "@/lib/github/data"
import { navItems } from "@/lib/site"

export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const [content, github] = await Promise.all([getContent(), getGithubData()])
  const items = navItems(content)
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Nav items={items} name={content.profile.name} socials={content.profile.socials} />
      <main id="main">{children}</main>
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
