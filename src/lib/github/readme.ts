/**
 * Turns a README into a few paragraphs of plain prose for a case-study page.
 * Strips HTML, badges, images, code, tables and headings — we only want the words
 * the author wrote, rendered as text (never as HTML, so nothing can inject markup).
 */
export function readmeExcerpt(markdown: string, maxChars = 900): string {
  if (!markdown) return ""
  const text = markdown
    .replace(/```[\s\S]*?```/g, "\n")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[!\[[^\]]*\]\([^)]*\)\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter((block) => block && !/^(#|\||[-*_]{3,}|>\s*$|[-*+]\s|\d+\.\s)/.test(block))
    .map((block) =>
      block
        .replace(/[*_`~]/g, "")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter((block) => block.length > 40 && !/create-next-app|npm run dev|localhost:3000/i.test(block))

  let out = ""
  for (const block of text) {
    if ((out + block).length > maxChars) break
    out += (out ? "\n\n" : "") + block
  }
  return out
}
