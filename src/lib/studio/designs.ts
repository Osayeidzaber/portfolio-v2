export const invoiceDesignIds = ["noir", "monolith", "outline", "atelier", "editorial", "ledger", "signature"] as const
export type InvoiceDesign = (typeof invoiceDesignIds)[number]

export const invoiceDesigns: Array<{ id: InvoiceDesign; name: string; mood: string; description: string; dark: boolean }> = [
  { id: "noir", name: "Noir", mood: "DARK / EDITORIAL", description: "A black sheet, oversized serif title and precise, quiet details.", dark: true },
  { id: "monolith", name: "Monolith", mood: "DARK / GRAPHIC", description: "Massive grotesque lettering, strong rules and an inverted total.", dark: true },
  { id: "outline", name: "Outline", mood: "DARK / ARCHITECTURAL", description: "Fine frames, gridded information and a restrained technical finish.", dark: true },
  { id: "atelier", name: "Atelier", mood: "DARK / FOLIO", description: "An asymmetric folio rail with a narrow, carefully typeset body.", dark: true },
  { id: "editorial", name: "Editorial", mood: "PAPER / EXPRESSIVE", description: "White paper, an expansive serif headline and generous breathing room.", dark: false },
  { id: "ledger", name: "Ledger", mood: "PAPER / PRECISE", description: "A compact four-column service table and understated typography.", dark: false },
  { id: "signature", name: "Original", mood: "PAPER / CLASSIC", description: "The original black masthead and white-body studio invoice.", dark: false },
]

export function invoiceDesignName(design?: InvoiceDesign) {
  return invoiceDesigns.find((item) => item.id === (design || "signature"))!.name
}
