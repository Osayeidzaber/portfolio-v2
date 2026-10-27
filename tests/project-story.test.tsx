import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { ProjectStory } from "../src/components/site/project-story"

describe("repository documentation on case studies", () => {
  it("preserves readable headings, lists, code and tables without adding a second h1", () => {
    const html = renderToStaticMarkup(<ProjectStory repoUrl="https://github.com/owner/project" markdown={'# Project\n\n## Features\n\n- Search\n- Cart\n\n```ts\nconst cart = []\n```\n\n| Area | Feature |\n| --- | --- |\n| Shop | Search |'} />)
    expect(html).toContain("<h2>Project</h2>")
    expect(html).not.toContain("<h1")
    expect(html).toContain("<li>Search</li>")
    expect(html).toContain("<table>")
    expect(html).toContain("<pre ")
  })

  it("drops embedded HTML and unsafe links while resolving repository documentation links", () => {
    const html = renderToStaticMarkup(<ProjectStory repoUrl="https://github.com/owner/project" markdown={'<script>alert(1)</script>\n\n[Guide](docs/guide.md)\n\n[Unsafe](javascript:alert)\n\n![Badge](https://example.com/badge.svg)'} />)
    expect(html).not.toContain("<script")
    expect(html).not.toContain("javascript:")
    expect(html).not.toContain("<img")
    expect(html).toContain('href="https://github.com/owner/project/blob/HEAD/docs/guide.md"')
  })
})
