import "regenerator-runtime/runtime.js"
import fontkit from "@pdf-lib/fontkit"
import { PDFDocument, rgb, type PDFFont } from "pdf-lib"
import { loadPdfFont, type PdfFontLoader } from "./pdf-fonts"
import { displayDate, invoiceTotals, money, type Invoice } from "./schema"
import { OZ_MONOGRAM_PATH } from "./brand"

/** A payment receipt built on the device, using the saved payment and invoice snapshot. */
export async function receiptPdf(invoice: Invoice, loadFont: PdfFontLoader = loadPdfFont): Promise<Uint8Array> {
  if (invoice.status !== "paid") throw new Error("Record full payment before creating a receipt.")
  const doc = await PDFDocument.create()
  doc.registerFontkit(fontkit)
  doc.setTitle(`Receipt ${invoice.number} — ${invoice.business.name}`)
  doc.setAuthor(invoice.business.name)
  doc.setCreationDate(new Date(invoice.paidAt || invoice.createdAt)); doc.setModificationDate(new Date(invoice.paidAt || invoice.createdAt))
  const [body, bold, serif, bengali, fallback] = await Promise.all(["BricolageGrotesque-Regular.ttf", "BricolageGrotesque-Bold.ttf", "InstrumentSerif-Italic.ttf", "NotoSansBengali-Regular.ttf", "NotoSans-Regular.ttf"].map(async (name) => doc.embedFont(await loadFont(name), { subset: true })))
  const faces = new Map([body, bold, serif, bengali, fallback].map((face) => [face, new Set(face.getCharacterSet())]))
  const dark = !["editorial", "ledger", "signature"].includes(invoice.design || "signature")
  const fg = dark ? rgb(.95, .95, .95) : rgb(.04, .04, .04)
  const bg = dark ? rgb(0, 0, 0) : rgb(1, 1, 1)
  const muted = dark ? rgb(.72, .72, .72) : rgb(.36, .36, .36)
  const rule = dark ? rgb(.25, .25, .25) : rgb(.8, .8, .8)
  const W = 595.28, H = 841.89, left = 44, right = 551.28
  let page = doc.addPage([W, H]), y = 0
  function runs(value: string, preferred: PDFFont) {
    const result: Array<{ text: string; face: PDFFont }> = []
    for (const character of value.replace(/[\r\n\t]/g, " ")) {
      const code = character.codePointAt(0)!
      const face = faces.get(preferred)!.has(code) ? preferred : faces.get(bengali)!.has(code) ? bengali : fallback
      if (!faces.get(face)!.has(code)) throw new Error("The receipt supports Latin and Bengali text. An additional font is needed for this character.")
      const last = result[result.length - 1]
      if (last?.face === face) last.text += character
      else result.push({ text: character, face })
    }
    return result
  }
  const measure = (value: string, size: number, face = body) => runs(value, face).reduce((sum, run) => sum + run.face.widthOfTextAtSize(run.text, size), 0)
  function text(value: string, x: number, top: number, size = 10, face = body, color = fg) {
    for (const run of runs(value, face)) { page.drawText(run.text, { x, y: H - top - size, size, font: run.face, color }); x += run.face.widthOfTextAtSize(run.text, size) }
  }
  function wrap(value: string, width: number, size = 10, face = body) {
    const lines: string[] = []
    for (const paragraph of value.split("\n")) {
      let line = ""
      for (const character of paragraph) { if (line && measure(line + character, size, face) > width) { lines.push(line); line = "" } line += character }
      lines.push(line)
    }
    return lines
  }
  function background() {
    page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: bg })
    page.drawSvgPath(OZ_MONOGRAM_PATH, { x: left, y: H - 34, scale: .065, color: fg })
    text("S T U D I O / PAYMENT RECEIPT", left + 60, 41, 8, body, muted)
  }
  function ensure(height: number) { if (y + height > 775) { page = doc.addPage([W, H]); background(); y = 95 } }
  function flow(value: string, size = 10, face = body, color = fg) {
    for (const line of wrap(value, right - left, size, face)) { ensure(size * 1.5); text(line, left, y, size, face, color); y += size * 1.5 }
  }
  function label(value: string) { ensure(60); flow(value, 8, bold, muted); y += 9 }
  background()
  text("Receipt.", left, 100, 68, serif)
  text(`INVOICE ${invoice.number}`, left, 186, Math.min(10, (right - left) / measure(`INVOICE ${invoice.number}`, 1)), body, muted)
  const total = money(invoiceTotals(invoice).total, invoice.currency)
  page.drawRectangle({ x: left, y: H - 315, width: right - left, height: 93, color: fg })
  text("PAID IN FULL", left + 18, 239, 8, bold, bg)
  text(total, left + 18, 263, Math.min(34, (right - left - 36) / measure(total, 1, bold)), bold, bg)
  y = 345
  label("RECEIVED FROM")
  flow([invoice.client.name, invoice.client.company, invoice.client.email].filter(Boolean).join("\n"), 11)
  y += 22; label("FOR THE WORK")
  flow(invoice.title, 16, bold)
  y += 22; label("PAYMENT RECORD")
  flow(invoice.payment ? `Payment date: ${displayDate(invoice.payment.date)}` : invoice.paidAt ? `Full payment recorded: ${displayDate(invoice.paidAt)}` : "Full payment recorded. Payment date was not supplied.")
  flow(`Method: ${invoice.payment?.method || "Not recorded"}`)
  flow(`Reference: ${invoice.payment?.reference || "Not recorded"}`)
  y += 22; label("ISSUED BY")
  flow([invoice.business.name, invoice.business.email, invoice.business.address].filter(Boolean).join("\n"), 10, body, muted)
  y += 22; flow("Thank you. This receipt records full payment against the invoice above.", 10, body, muted)
  for (const [index, sheet] of doc.getPages().entries()) {
    page = sheet
    page.drawLine({ start: { x: left, y: 45 }, end: { x: right, y: 45 }, color: rule, thickness: .5 })
    const footer = invoice.styling?.footer || `${invoice.business.name} / RECEIPT ${invoice.number}`
    text(footer, left, 810, Math.min(7, (right - left - 65) / measure(footer, 1)), body, muted)
    text(`${index + 1} / ${doc.getPageCount()}`, right - 35, 810, 7, body, muted)
  }
  return doc.save()
}
