import "server-only"
import "regenerator-runtime/runtime.js"

import { readFile } from "node:fs/promises"
import { join } from "node:path"
import fontkit from "@pdf-lib/fontkit"
import { PDFDocument, rgb, type PDFFont } from "pdf-lib"

import { displayDate, invoiceTotals, money, type Invoice } from "./schema"
import { OZ_MONOGRAM_PATH } from "./brand"
import { designedInvoicePdf } from "./pdf-layouts"

/** Printable invoice, generated server-side; no private invoice has a public URL. */
export async function invoicePdf(invoice: Invoice): Promise<Uint8Array> {
  // Preserve existing invoices without a design field as the original composition.
  if (invoice.design && invoice.design !== "signature") return designedInvoicePdf(invoice, invoice.design)
  const document = await PDFDocument.create()
  const stamp = new Date(invoice.createdAt)
  document.setCreationDate(stamp)
  document.setModificationDate(stamp)
  document.setTitle(`${invoice.number} — ${invoice.business.name}`)
  document.setAuthor(invoice.business.name)
  document.registerFontkit(fontkit)
  const fontDirectory = join(process.cwd(), "public/oz-studio/fonts")
  const fallback = await document.embedFont(await readFile(join(fontDirectory, "NotoSans-Regular.ttf")), { subset: true })
  const regular = await document.embedFont(await readFile(join(fontDirectory, "BricolageGrotesque-Regular.ttf")), { subset: true })
  const bold = await document.embedFont(await readFile(join(fontDirectory, "BricolageGrotesque-Bold.ttf")), { subset: true })
  const bengali = await document.embedFont(await readFile(join(fontDirectory, "NotoSansBengali-Regular.ttf")), { subset: true })
  const serif = await document.embedFont(await readFile(join(fontDirectory, "InstrumentSerif-Italic.ttf")), { subset: true })
  const mono = await document.embedFont(await readFile(join(fontDirectory, "JetBrainsMono-Regular.ttf")), { subset: true })
  const supported = new Map([regular, bold, bengali, serif, mono, fallback].map((font) => [font, new Set(font.getCharacterSet())]))
  let page = document.addPage([595.28, 841.89])
  let y = 786
  const ink = rgb(0.04, 0.04, 0.04)
  const grey = rgb(0.36, 0.36, 0.36)
  const runs = (value: string, strong = false, face?: PDFFont): Array<{ text: string; font: PDFFont }> => {
    const result: Array<{ text: string; font: PDFFont }> = []
    for (const character of value) {
      const preferred = /[\u0980-\u09ff\u200c\u200d]/.test(character) ? bengali : face ?? (strong ? bold : regular)
      const font = supported.get(preferred)!.has(character.codePointAt(0)!) ? preferred : fallback
      const previous = result[result.length - 1]
      if (previous?.font === font) previous.text += character
      else result.push({ text: character, font })
    }
    return result
  }
  const widthOf = (value: string, size: number, face?: PDFFont) => runs(value, false, face).reduce((width, run) => width + run.font.widthOfTextAtSize(run.text, size), 0)
  const safe = (value: string) => {
    const result = value.replace(/[\r\n\t]+/g, " ")
    for (const run of runs(result)) {
      if (Array.from(run.text).some((character) => !supported.get(run.font)!.has(character.codePointAt(0)!))) throw new Error("Some characters need an additional PDF font. Supported scripts include Latin and Bengali.")
    }
    return result
  }
  const nextPage = () => { page = document.addPage([595.28, 841.89]); y = 786 }
  const line = (value: string, size = 10, strong = false, x = 48) => {
    if (y < 60) nextPage()
    let offset = x
    for (const run of runs(safe(value), strong)) {
      page.drawText(run.text, { x: offset, y, size, font: run.font, color: ink })
      offset += run.font.widthOfTextAtSize(run.text, size)
    }
    y -= size + 7
  }
  const wrapLines = (value: string, width = 480, size = 10, face?: PDFFont): string[] => {
    const result: string[] = []
    for (const original of value.split("\n")) {
      let buffer = ""
      for (const word of safe(original).split(" ")) {
        if (widthOf(`${buffer} ${word}`.trim(), size, face) > width && buffer) { result.push(buffer); buffer = "" }
        // Long unbroken URLs and account references also wrap within the printable width.
        for (const character of (buffer ? ` ${word}` : word)) {
          if (widthOf(buffer + character, size, face) > width) { result.push(buffer); buffer = "" }
          buffer += character
        }
      }
      result.push(buffer)
    }
    return result
  }
  const paragraph = (value: string, width = 480, size = 10) => { for (const text of wrapLines(value, width, size)) line(text, size) }
  const paint = (value: string, x: number, baseline: number, size: number, strong = false, color = ink, face?: PDFFont) => {
    let offset = x
    for (const run of runs(safe(value), strong, face || (size <= 9 ? mono : undefined))) {
      page.drawText(run.text, { x: offset, y: baseline, size, font: run.font, color })
      offset += run.font.widthOfTextAtSize(run.text, size)
    }
  }
  const white = rgb(1, 1, 1)
  const mist = rgb(0.74, 0.74, 0.74)
  const right = (value: string, baseline: number, size = 10, strong = false, color = ink) => {
    const width = runs(value, strong).reduce((sum, run) => sum + run.font.widthOfTextAtSize(run.text, size), 0)
    paint(value, 547 - width, baseline, size, strong, color)
  }
  const label = invoice.status === "draft" ? "DRAFT / NOT YET ISSUED" : invoice.status === "void" ? "VOID / DO NOT PAY" : invoice.status === "paid" ? "PAID / THANK YOU" : "INVOICE / ISSUED"

  // A full-width ink masthead, using the owner's original vector mark.
  page.drawRectangle({ x: 0, y: 620, width: 595.28, height: 222, color: rgb(0, 0, 0) })
  page.drawSvgPath(OZ_MONOGRAM_PATH, { x: 48, y: 796, scale: 0.083, color: white })
  paint("S T U D I O", 52, 750, 7, false, mist)
  paint("OZ STUDIO", 137, 783, 24, true, white)
  paint("INDEPENDENT DESIGN & DEVELOPMENT", 138, 760, 6.8, false, mist)
  right(label, 803, 7, true, mist)
  const numberSize = Math.min(11, 185 / bold.widthOfTextAtSize(invoice.number, 1))
  right(invoice.number, 784, numberSize, true, white)
  page.drawLine({ start: { x: 48, y: 729 }, end: { x: 547, y: 729 }, color: rgb(0.24, 0.24, 0.24), thickness: 0.5 })
  let titleSize = 32
  while (wrapLines(invoice.title, 499, titleSize, serif).length > 2 && titleSize > 12) titleSize--
  for (const [index, text] of wrapLines(invoice.title, 499, titleSize, serif).entries()) paint(text, 48, 696 - index * (titleSize + 7), titleSize, false, white, serif)

  paint("ISSUED", 48, 586, 7.5, true, grey)
  paint(displayDate(invoice.issueDate), 48, 566, 11)
  paint("DUE DATE", 230, 586, 7.5, true, grey)
  paint(displayDate(invoice.dueDate), 230, 566, 11)
  right(invoice.currency + " / SERVICES", 566, 8, true, grey)
  page.drawLine({ start: { x: 48, y: 546 }, end: { x: 547, y: 546 }, color: rgb(0.82, 0.82, 0.82), thickness: 0.5 })

  const billing = `${invoice.client.name}${invoice.client.company ? `\n${invoice.client.company}` : ""}\n${invoice.client.email}${invoice.client.address ? `\n${invoice.client.address}` : ""}`
  const business = `${invoice.business.name}\n${invoice.business.email}${invoice.business.address ? `\n${invoice.business.address}` : ""}`
  const billingLines = wrapLines(billing, 230, 10)
  const businessLines = wrapLines(business, 222, 10)
  if (Math.max(billingLines.length, businessLines.length) > 18) {
    y = 516; line("BILL TO", 8, true); paragraph(billing, 499, 10)
    y -= 18; line("FROM THE STUDIO", 8, true); paragraph(business, 499, 10); y -= 35
  } else {
    paint("BILL TO", 48, 516, 8, true, grey)
    paint("FROM THE STUDIO", 325, 516, 8, true, grey)
    for (const [index, text] of billingLines.entries()) paint(text, 48, 493 - index * 17, 10, index === 0)
    for (const [index, text] of businessLines.entries()) paint(text, 325, 493 - index * 17, 10, index === 0)
    y = 493 - Math.max(billingLines.length, businessLines.length) * 17 - 35
  }

  const tableHeader = () => {
    paint("SERVICE / DESCRIPTION", 48, y, 8, true, grey)
    right("AMOUNT", y, 8, true, grey)
    page.drawLine({ start: { x: 48, y: y - 12 }, end: { x: 547, y: y - 12 }, thickness: 0.7, color: ink })
    y -= 39
  }
  if (y < 180) nextPage()
  tableHeader()
  for (const [index, item] of invoice.items.entries()) {
    const description = wrapLines(item.description, 304, 10.5)
    if (y - (description.length * 18 + 47) < 65) { nextPage(); tableHeader() }
    const rowTop = y
    paint(String(index + 1).padStart(2, "0"), 48, rowTop, 8, false, grey)
    for (const [lineIndex, text] of description.entries()) paint(text, 78, rowTop - lineIndex * 18, 10.5)
    right(money(item.quantity * item.unitPrice, invoice.currency), rowTop, 10.5, true)
    y -= description.length * 18
    paint(`${item.quantity} × ${money(item.unitPrice, invoice.currency)}`, 78, y - 1, 8.5, false, grey)
    page.drawLine({ start: { x: 48, y: y - 21 }, end: { x: 547, y: y - 21 }, thickness: 0.5, color: rgb(0.82, 0.82, 0.82) })
    y -= 37
  }

  const totals = invoiceTotals(invoice)
  if (y < 230) nextPage()
  y -= 4
  const summaryTop = y
  const summary = [["Subtotal", totals.subtotal], ["Discount", totals.discount], [`Tax (${invoice.taxBasisPoints / 100}%)`, totals.tax]] as const
  for (const [label, amount] of summary) { paint(label, 325, y, 9, false, grey); right(money(amount, invoice.currency), y, 9); y -= 20 }
  y -= 5
  page.drawRectangle({ x: 313, y: y - 76, width: 234, height: 78, color: rgb(0, 0, 0) })
  paint(invoice.status === "paid" ? "TOTAL PAID" : invoice.status === "void" ? "VOID INVOICE" : "TOTAL DUE", 330, y - 17, 7.5, true, mist)
  const total = money(totals.total, invoice.currency)
  const totalSize = Math.min(24, 198 / bold.widthOfTextAtSize(total, 1))
  paint(total, 330, y - 53, totalSize, true, white)
  const payment = invoice.business.paymentInstructions || "Add your payment instructions before issuing this invoice."
  const paymentLines = wrapLines(payment, 235, 9.5)
  const noteLines = invoice.notes ? wrapLines(invoice.notes, 235, 9.5) : []
  const detailsHeight = 23 + paymentLines.length * 16.5 + (noteLines.length ? 35 + noteLines.length * 16.5 : 0)
  if (summaryTop - detailsHeight > 65) {
    let baseline = summaryTop
    paint("PAYMENT DETAILS", 48, baseline, 8, true, grey); baseline -= 23
    for (const text of paymentLines) { paint(text, 48, baseline, 9.5); baseline -= 16.5 }
    if (noteLines.length) {
      baseline -= 18; paint("A NOTE FROM THE STUDIO", 48, baseline, 8, true, grey); baseline -= 22
      for (const text of noteLines) { paint(text, 48, baseline, 9.5); baseline -= 16.5 }
    }
  } else {
    y -= 110
    if (y < 150) nextPage()
    paint("PAYMENT DETAILS", 48, y, 8, true, grey); y -= 23
    paragraph(payment, 499, 9.5)
    if (invoice.notes) { y -= 18; if (y < 95) nextPage(); paint("A NOTE FROM THE STUDIO", 48, y, 8, true, grey); y -= 22; paragraph(invoice.notes, 499, 9.5) }
  }

  for (const [index, sheet] of document.getPages().entries()) {
    sheet.drawLine({ start: { x: 48, y: 47 }, end: { x: 547, y: 47 }, color: rgb(0.8, 0.8, 0.8), thickness: 0.5 })
    sheet.drawText("OZ STUDIO  /  " + invoice.number, { x: 48, y: 29, size: 7.5, font: mono, color: grey })
    const folio = `${String(index + 1).padStart(2, "0")} / ${String(document.getPageCount()).padStart(2, "0")}`
    sheet.drawText(folio, { x: 547 - mono.widthOfTextAtSize(folio, 7.5), y: 29, size: 7.5, font: mono, color: grey })
  }
  return document.save()
}
