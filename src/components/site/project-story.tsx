import Markdown from "react-markdown"
import remarkGfm from "remark-gfm"

/** Render on the server: no Markdown parser in the case study's client bundle. */
export function ProjectStory({ markdown, repoUrl }: { markdown: string; repoUrl: string }) {
  const resolveLink = (href: string) => {
    if (/^(https?:|mailto:)/i.test(href) || href.startsWith("#")) return href
    if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith("//")) return ""
    return repoUrl ? `${repoUrl}/blob/HEAD/${href.replace(/^\.\//, "").replace(/^\//, "")}` : ""
  }
  return (
    <div className="case-prose min-w-0">
      <Markdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        disallowedElements={["img", "input"]}
        urlTransform={resolveLink}
        components={{
          h1: ({ children }) => <h2>{children}</h2>,
          a: ({ href, children }) => <a href={href} title={href} target={href?.startsWith("http") ? "_blank" : undefined} rel="noreferrer">{children}</a>,
          pre: ({ children }) => <pre tabIndex={0} aria-label="Code sample">{children}</pre>,
          table: ({ children }) => <div tabIndex={0} role="region" aria-label="Repository table" className="max-w-full overflow-x-auto"><table>{children}</table></div>,
        }}
      >
        {markdown}
      </Markdown>
    </div>
  )
}
