export type PdfFontLoader = (name: string) => Promise<Uint8Array>

const fonts = new Map<string, Promise<Uint8Array>>()

/** Public typefaces only. Invoice data never leaves the browser to make a PDF. */
export const loadPdfFont: PdfFontLoader = (name) => {
  let pending = fonts.get(name)
  if (!pending) {
    pending = fetch(`/oz-studio/fonts/${encodeURIComponent(name)}`, { signal: AbortSignal.timeout(20_000) }).then(async (response) => {
      if (!response.ok) throw new Error("Could not load the invoice typefaces. Check your connection and retry.")
      return new Uint8Array(await response.arrayBuffer())
    }).catch((error) => { fonts.delete(name); throw error })
    fonts.set(name, pending)
  }
  return pending
}
