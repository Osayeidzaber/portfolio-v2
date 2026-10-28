import { readFile } from "node:fs/promises"
import { describe, expect, it } from "vitest"
import { PDFDocument } from "pdf-lib"
import { receiptPdf } from "@/lib/studio/receipt-pdf"
import { emptyStudio, saveInvoice } from "@/lib/studio/schema"

const loadFont = async (name: string) => new Uint8Array(await readFile(`public/oz-studio/fonts/${name}`))
describe("browser payment receipts", () => {
  it("refuses unpaid invoices and produces a branded paid record with embedded typefaces", async () => {
    const data = emptyStudio()
    const saved = saveInvoice(data, { title: "Preview work", currency: "BDT", issueDate: "2026-10-01", dueDate: "2026-10-15", client: { name: "Preview Client / জাবের", email: "preview@example.com", company: "", address: "" }, items: [{ description: "Service", quantity: 1, unitPrice: 100000 }], discount: 0, taxBasisPoints: 0, notes: "" }, "aaaabbbb-cccc-4000-8000-111122223333", "2026-10-01T10:00:00.000Z")
    await expect(receiptPdf(saved, loadFont)).rejects.toThrow("Record full payment")
    saved.status = "paid"; saved.paidAt = "2026-10-02T10:00:00.000Z"
    saved.payment = { date: "2026-10-02", method: "bKash", reference: "TEST-REFERENCE" }
    saved.styling = { showRates: false, footer: "Preview receipt / জাবের" }
    const bytes = await receiptPdf(saved, loadFont)
    const doc = await PDFDocument.load(bytes)
    expect(doc.getTitle()).toBe("Receipt OZ-0001 — OZ Studio")
    expect(doc.getPageCount()).toBe(1)
    expect(bytes.length).toBeGreaterThan(5000)
  })
})
