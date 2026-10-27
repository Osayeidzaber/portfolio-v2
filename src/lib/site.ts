import type { NavItem } from "@/components/site/nav"
import type { SiteContent } from "@/lib/content/schema"
import { visible } from "@/lib/content/read"

/** Chapters in reading order; the nav, footer and page all derive from this. */
export function navItems(content: SiteContent): NavItem[] {
  const s = content.sections
  const items: Array<NavItem & { on: boolean }> = [
    { id: "about", label: "About", folio: "01", on: s.about },
    { id: "work", label: "Work", folio: "02", on: s.work },
    { id: "toolkit", label: "Toolkit", folio: "03", on: s.toolkit },
    { id: "ledger", label: "Ledger", folio: "04", on: s.ledger },
    { id: "experience", label: "Experience", folio: "05", on: s.experience && visible(content.experience).length > 0 },
    { id: "recognition", label: "Recognition", folio: "06", on: s.achievements && visible(content.achievements).length > 0 },
    { id: "play", label: "Tools", folio: "07", on: s.playground },
    { id: "contact", label: "Contact", folio: "08", on: s.contact },
  ]
  return items.filter((i) => i.on).map((i) => ({ id: i.id, label: i.label, folio: i.folio }))
}
