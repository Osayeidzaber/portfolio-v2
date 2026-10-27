import { loadPdfFont, type PdfFontLoader } from "./pdf-fonts"
import "regenerator-runtime/runtime.js"

import fontkit from "@pdf-lib/fontkit"
import { PDFDocument, rgb, type PDFFont, type RGB } from "pdf-lib"

import { OZ_MONOGRAM_PATH } from "./brand"
import { invoiceDesignName, type InvoiceDesign } from "./designs"
import { paymentDetails, displayDate, invoiceTotals, money, type Invoice } from "./schema"

const W = 595.28
const H = 841.89

/** Independent compositions share typography, exact accounting data and overflow rules. */
export async function designedInvoicePdf(invoice: Invoice, design: Exclude<InvoiceDesign, "signature">, loadFont: PdfFontLoader = loadPdfFont) {
  const doc = await PDFDocument.create()
  doc.registerFontkit(fontkit)
  const date = new Date(invoice.createdAt)
  doc.setCreationDate(date); doc.setModificationDate(date)
  doc.setTitle(`${invoice.number} — ${invoice.business.name}`)
  doc.setSubject(`OZ Studio / ${invoiceDesignName(design)}`)
  doc.setAuthor(invoice.business.name)
  doc.setCreator("OZ Studio invoice desk")
  const font = async (name: string) => doc.embedFont(await loadFont(name), { subset: true })
  const [body, bold, serif, mono, fallback, bengali] = await Promise.all([
    font("BricolageGrotesque-Regular.ttf"), font("BricolageGrotesque-Bold.ttf"), font("InstrumentSerif-Italic.ttf"),
    font("JetBrainsMono-Regular.ttf"), font("NotoSans-Regular.ttf"), font("NotoSansBengali-Regular.ttf"),
  ])
  const supported = new Map([body, bold, serif, mono, fallback, bengali].map((face) => [face, new Set(face.getCharacterSet())]))
  const dark = !["editorial", "ledger"].includes(design)
  const bg = dark ? rgb(0, 0, 0) : rgb(1, 1, 1)
  const fg = dark ? rgb(.95, .95, .95) : rgb(.025, .025, .025)
  const muted = dark ? rgb(.7, .7, .7) : rgb(.35, .35, .35)
  const rule = dark ? rgb(.24, .24, .24) : rgb(.77, .77, .77)
  const left = design === "atelier" ? 138 : design === "ledger" ? 38 : 44
  const right = W - (design === "ledger" ? 38 : 44)
  const width = right - left
  const compact = design === "ledger"
  let page = doc.addPage([W, H])
  let y = 0

  function runs(value: string, preferred: PDFFont) {
    const result: Array<{ text: string; face: PDFFont }> = []
    for (const character of value.replace(/[\r\n\t]/g, " ")) {
      const code = character.codePointAt(0)!
      const face = supported.get(preferred)!.has(code) ? preferred : supported.get(bengali)!.has(code) ? bengali : fallback
      if (!supported.get(face)!.has(code)) throw new Error("This text requires an additional PDF font. Latin and Bengali scripts are supported.")
      const last = result[result.length - 1]
      if (last?.face === face) last.text += character
      else result.push({ text: character, face })
    }
    return result
  }
  const measure = (value: string, size: number, face = body) => runs(value, face).reduce((sum, run) => sum + run.face.widthOfTextAtSize(run.text, size), 0)
  function text(value: string, x: number, top: number, size = 10, face = body, color = fg, align: "left" | "right" = "left") {
    let offset = align === "right" ? x - measure(value, size, face) : x
    for (const run of runs(value, face)) {
      page.drawText(run.text, { x: offset, y: H - top - size, size, font: run.face, color })
      offset += run.face.widthOfTextAtSize(run.text, size)
    }
  }
  const line = (top: number, x1 = left, x2 = right, color = rule, thickness = .5) => page.drawLine({ start: { x: x1, y: H - top }, end: { x: x2, y: H - top }, color, thickness })
  const rect = (x: number, top: number, w: number, h: number, fill?: RGB, stroke?: RGB) => page.drawRectangle({ x, y: H - top - h, width: w, height: h, ...(fill ? { color: fill } : { opacity: 0 }), ...(stroke ? { borderColor: stroke, borderWidth: .65, borderOpacity: 1 } : {}) })
  function wrap(value: string, maxWidth: number, size = 10, face = body) {
    const result: string[] = []
    for (const original of value.split("\n")) {
      let buffer = ""
      for (const word of original.split(/\s+/)) {
        if (buffer && measure(`${buffer} ${word}`, size, face) > maxWidth) { result.push(buffer); buffer = "" }
        for (const char of (buffer ? ` ${word}` : word)) {
          if (buffer && measure(buffer + char, size, face) > maxWidth) { result.push(buffer); buffer = "" }
          buffer += char
        }
      }
      result.push(buffer)
    }
    return result
  }
  function background() {
    rect(0, 0, W, H, bg)
    if (design === "outline") rect(25, 25, W - 50, H - 50, undefined, rule)
    if (design === "atelier") {
      page.drawLine({ start: { x: 112, y: 0 }, end: { x: 112, y: H }, color: rule, thickness: .6 })
      page.drawSvgPath(OZ_MONOGRAM_PATH, { x: 31, y: H - 44, scale: .075, color: fg })
      text("S T U D I O", 32, 82, 6.6, mono, muted)
      text("0" + String(doc.getPageCount()), 29, 146, 45, serif)
      text("ACCOUNTS", 30, 208, 6.8, mono, muted)
      text("ATELIER", 30, 742, 6.8, mono, muted)
    }
  }
  function brand(top = 37) {
    if (design === "atelier") return
    page.drawSvgPath(OZ_MONOGRAM_PATH, { x: left, y: H - top, scale: .059, color: fg })
    text("S T U D I O", left + 53, top + 7, 8, mono)
  }
  function newPage() {
    page = doc.addPage([W, H]); background(); brand(37)
    text(invoice.number, right, 36, fit(invoice.number, 8, width - 120, mono), mono, muted, "right")
    text("INVOICE / CONTINUED", right, 54, 6.5, mono, muted, "right")
    line(83); y = 106
  }
  function ensure(height: number) { if (y + height > 779) newPage() }
  function flow(value: string, maxWidth = width, size = 10, face = body, color = fg, x = left, leading = size * 1.5) {
    for (const valueLine of wrap(value, maxWidth, size, face)) { ensure(leading); text(valueLine, x, y, size, face, color); y += leading }
  }
  function heading(label: string) { ensure(28); text(label, left, y, 7.4, mono, muted); y += 19 }
  const status = invoice.status === "draft" ? "DRAFT / NOT ISSUED" : invoice.status === "void" ? "VOID / DO NOT PAY" : invoice.status === "paid" ? "PAID IN FULL" : "ISSUED"
  const totals = invoiceTotals(invoice)
  const amount = (value: number) => money(value, invoice.currency)
  const fit = (value: string, size: number, max: number, face: PDFFont) => Math.min(size, max / measure(value, 1, face))
  const totalLabel = invoice.status === "paid" ? "TOTAL PAID" : invoice.status === "void" ? "VOID INVOICE" : "TOTAL DUE"
  background(); brand()
  const badgeWidth = measure(status, 6.5, mono) + 16
  rect(right - badgeWidth, 32, badgeWidth, 17, invoice.status === "paid" ? fg : undefined, invoice.status === "paid" ? undefined : rule)
  text(status, right - 8, 36, 6.5, mono, invoice.status === "paid" ? bg : muted, "right")
  text(invoice.number, right, 56, fit(invoice.number, 9, 210, mono), mono, fg, "right")

  if (design === "noir") {
    line(86)
    text("Invoice.", left - 3, 102, 84, serif)
    text(totalLabel, right, 117, 7.2, mono, muted, "right")
    text(amount(totals.total), right, 140, fit(amount(totals.total), 27, 225, bold), bold, fg, "right")
    y = 198
    flow(invoice.title, width, 22, body, fg, left, 29)
    y += 12
  } else if (design === "monolith") {
    text("INVOICE", left - 5, 91, fit("INVOICE", 92, width + 5, bold), bold)
    rect(left, 190, width, 4, fg)
    y = 210; flow(invoice.title, width, 25, serif, fg, left, 30); y += 12
  } else if (design === "outline") {
    line(89)
    text("Invoice", left, 107, 56, serif)
    text("OZ / BUSINESS DOCUMENT", right, 143, 6.7, mono, muted, "right")
    y = 183; flow(invoice.title, width, 24, body, fg, left, 31); y += 18
  } else if (design === "atelier") {
    text("Invoice.", left - 2, 86, 55, serif)
    y = 169; flow(invoice.title, width, 24, bold, fg, left, 29); y += 12
    line(y); y += 14
  } else if (design === "editorial") {
    rect(0, 0, W, 7, fg)
    text("Invoice.", left - 3, 86, 78, serif)
    line(181, left, right, fg, 1)
    y = 200; flow(invoice.title, width, 24, body, fg, left, 30); y += 14
  } else {
    line(87, left, right, fg, 2)
    y = 109; flow(invoice.title, width, 28, bold, fg, left, 34); y += 20
  }

  // Date metadata has a fixed-height row; long parties fall back to paginated text.
  ensure(57)
  const metadata = [[invoice.status === "draft" ? "INVOICE DATE" : "ISSUED", displayDate(invoice.issueDate)], ["DUE DATE", displayDate(invoice.dueDate)], ["CURRENCY", invoice.currency]]
  const cell = width / 3
  if (design === "outline") rect(left, y - 10, width, 54, undefined, rule)
  metadata.forEach(([label, value], index) => { const x = left + index * cell + (design === "outline" ? 10 : 0); text(label, x, y, 7, mono, muted); text(value, x, y + 17, compact ? 10 : 11, body) })
  y += compact ? 51 : 52
  const gap = 26
  const column = (width - gap) / 2
  const party = (name: string, company: string, email: string, address: string) => [
    ...wrap(name, column, 12, bold).map((value) => ({ value, face: bold, size: 12, height: 17 })),
    ...[company, email, address].filter(Boolean).flatMap((value) => wrap(value, column, 9.5).map((text) => ({ value: text, face: body, size: 9.5, height: 14 }))),
  ]
  const parties = [party(invoice.client.name, invoice.client.company, invoice.client.email, invoice.client.address), party(invoice.business.name, "", invoice.business.email, invoice.business.address)]
  const partyHeight = Math.max(...parties.map((lines) => lines.reduce((h, row) => h + row.height, 0))) + 35
  if (partyHeight <= 210) {
    ensure(partyHeight + 20)
    parties.forEach((lines, index) => {
      const x = left + index * (column + gap)
      text(index ? "FROM THE STUDIO" : "BILL TO", x, y, 7.1, mono, muted)
      let rowY = y + 22
      for (const row of lines) { text(row.value, x, rowY, row.size, row.face); rowY += row.height }
    })
    y += partyHeight + (compact ? 12 : 14)
  } else {
    heading("BILL TO"); flow([invoice.client.name, invoice.client.company, invoice.client.email, invoice.client.address].filter(Boolean).join("\n")); y += 16
    heading("FROM THE STUDIO"); flow([invoice.business.name, invoice.business.email, invoice.business.address].filter(Boolean).join("\n")); y += 20
  }

  const tableHeader = () => {
    text("01 / SERVICES", left, y, 7.3, mono, muted)
    if (compact) { text("QTY", right - 206, y, 7, mono, muted); text("RATE", right - 103, y, 7, mono, muted, "right") }
    text("AMOUNT", right, y, 7.3, mono, muted, "right")
    line(y + 19, left, right, design === "monolith" ? fg : rule, design === "monolith" ? 1.2 : .6)
    y += 32
  }
  ensure(92); tableHeader()
  for (const [index, item] of invoice.items.entries()) {
    const itemWidth = compact ? width - 230 : width - 177
    const size = compact ? 9.5 : 10.5
    const rows = wrap(item.description, itemWidth, size)
    const height = rows.length * 16 + (compact ? 19 : 24)
    if (y + height > 770) { newPage(); tableHeader() }
    const start = y
    if (!compact) text(String(index + 1).padStart(2, "0"), left, y + 2, 6.5, mono, muted)
    rows.forEach((row, i) => text(row, left + (compact ? 0 : 23), start + i * 16, size, body))
    text(amount(item.unitPrice * item.quantity), right, start, fit(amount(item.unitPrice * item.quantity), size, 130, bold), bold, fg, "right")
    if (compact) {
      text(String(item.quantity), right - 206, start, 9, mono, muted)
      text(amount(item.unitPrice), right - 103, start, fit(amount(item.unitPrice), 8.5, 87, mono), mono, muted, "right")
    } else text(`${item.quantity} × ${amount(item.unitPrice)}`, left + 23, start + rows.length * 16 + 2, 7.5, mono, muted)
    y += height; line(y - 10)
  }

  // The complete summary stays together; notes use the remaining space or continue.
  const summaryRows: Array<[string, number]> = [["Subtotal", totals.subtotal]]
  if (totals.discount) summaryRows.push(["Discount", totals.discount])
  if (invoice.taxBasisPoints) summaryRows.push([`Tax (${invoice.taxBasisPoints / 100}%)`, totals.tax])
  ensure(101 + summaryRows.length * 19)
  y += 12
  const summaryY = y
  const summaryX = Math.max(left, right - 218)
  for (const [label, value] of summaryRows) {
    text(label, summaryX, y, 8.5, mono, muted); text(amount(value), right, y, 8.5, mono, fg, "right"); y += 19
  }
  y += 9
  if (design === "monolith") {
    rect(left, y, width, 69, fg)
    text(totalLabel, left + 17, y + 15, 7.5, mono, bg)
    text(amount(totals.total), right - 17, y + 23, fit(amount(totals.total), 29, width - 150, bold), bold, bg, "right")
  } else if (design === "outline") {
    rect(left, y, width, 69, undefined, fg)
    text(totalLabel, left + 14, y + 15, 7, mono, muted)
    text(amount(totals.total), right - 14, y + 24, fit(amount(totals.total), 29, width - 130, serif), serif, fg, "right")
  } else if (design === "noir" || design === "atelier") {
    line(y, left, right, fg)
    text(totalLabel, left, y + 17, 7, mono, muted)
    text(amount(totals.total), right, y + 17, fit(amount(totals.total), design === "noir" ? 38 : 32, width - 100, serif), serif, fg, "right")
  } else {
    line(y, summaryX, right, fg, compact ? 1 : 2)
    text(totalLabel, summaryX, y + 14, 7, mono, muted)
    text(amount(totals.total), right, y + 33, fit(amount(totals.total), compact ? 26 : 31, 218, bold), bold, fg, "right")
  }
  if (summaryX - left > 200 && design === "editorial") {
    text("Made with care.", left, summaryY + 5, 23, serif)
    text("BILLED WITH CLARITY.", left, summaryY + 42, 6.5, mono, muted)
  }
  y += 80
  if (invoice.status === "paid") {
    heading("02 / PAYMENT RECEIVED")
    flow(invoice.paidAt ? `Full payment recorded on ${displayDate(invoice.paidAt)}. Thank you.` : "Full payment recorded. Thank you.", width, 9.5, body, muted)
  } else if (invoice.status === "void") {
    heading("02 / VOID DOCUMENT")
    flow("This invoice has been voided. No payment is requested.", width, 9.5, body, muted)
  } else {
    const instructions = paymentDetails(invoice.business) || "Add payment instructions before issuing this invoice."
    const paymentLines = wrap(instructions, width - 28, 9.5)
    const panelHeight = 43 + paymentLines.length * 14
    // A short payment block stays together; long instructions retain normal pagination.
    if (panelHeight <= 150) {
      ensure(panelHeight + 10)
      rect(left, y, width, panelHeight, dark ? rgb(.045, .045, .045) : rgb(.96, .96, .96), rule)
      text("02 / PAYMENT DETAILS", left + 14, y + 13, 7.1, mono, muted)
      paymentLines.forEach((value, index) => text(value, left + 14, y + 30 + index * 14, 9.5, body, fg))
      y += panelHeight + 10
    } else { heading("02 / PAYMENT DETAILS"); flow(instructions, width, 9.5, body, muted) }
  }
  if (invoice.notes) {
    y += 12
    ensure(19 + Math.min(2, wrap(invoice.notes, width, 9.5).length) * 14.25)
    heading("03 / A NOTE FROM THE STUDIO")
    flow(invoice.notes, width, 9.5, body, muted)
  }

  for (const [index, sheet] of doc.getPages().entries()) {
    page = sheet
    line(800)
    const footer = `${invoice.business.name.toUpperCase()} / ${invoice.number}`
    text(footer, left, 812, fit(footer, 6.5, width - 90, mono), mono, muted)
    text(`${String(index + 1).padStart(2, "0")} — ${String(doc.getPageCount()).padStart(2, "0")}`, right, 812, 6.5, mono, muted, "right")
  }
  return doc.save()
}
