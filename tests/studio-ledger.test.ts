import { describe, expect, it } from "vitest"
import site from "../content/site.json"
import { siteContentSchema } from "@/lib/content/schema"
import { draftFromInvoice, invoiceCsv, ledgerSummary } from "@/lib/studio/ledger"
import { studioProjects } from "@/lib/studio/portfolio"
import { emptyStudio, saveInvoice } from "@/lib/studio/schema"

function invoice() {
  const data = emptyStudio()
  return saveInvoice(data, { title: "Preview services", client: { name: "Preview Client", email: "preview@example.com", company: "", address: "" }, currency: "BDT", issueDate: "2026-10-01", dueDate: "2026-10-20", items: [{ description: "Design", quantity: 2, unitPrice: 10000 }], discount: 1000, taxBasisPoints: 500, notes: "Preview only" }, "aaaabbbb-cccc-4000-8000-111122223333", "2026-10-01T12:00:00.000Z")
}
describe("invoice ledger tools", () => {
  it("excludes drafts and void records, keeps currencies separate, and distinguishes due today", () => {
    const row = invoice()
    const rows = [row, { ...row, status: "void" as const }, { ...row, status: "issued" as const }, { ...row, status: "issued" as const, dueDate: "2026-10-28" }, { ...row, status: "paid" as const }, { ...row, status: "paid" as const, currency: "USD" as const }]
    expect(ledgerSummary(rows, "2026-10-28", "BDT")).toEqual({ outstanding: 39900, overdue: 19950, paid: 19950, overdueCount: 1 })
    expect(ledgerSummary(rows, "2026-10-28", "USD")).toEqual({ outstanding: 0, overdue: 0, paid: 19950, overdueCount: 0 })
  })
  it("creates independent draft input without invoice identity, email or payment history", () => {
    const row = { ...invoice(), status: "paid" as const, paidAt: "2026-10-22T12:00:00.000Z", emailAttempt: { key: "aaaabbbb-cccc-4000-8000-111122223333", startedAt: "2026-10-01T12:00:00.000Z" } }
    const draft = draftFromInvoice(row, "2026-10-28")
    expect(draft).toMatchObject({ issueDate: "2026-10-28", dueDate: "2026-10-28", title: row.title })
    expect(draft).not.toHaveProperty("id")
    expect(draft).not.toHaveProperty("number")
    expect(draft).not.toHaveProperty("paidAt")
    expect(draft).not.toHaveProperty("emailAttempt")
    draft.items[0].description = "Changed"
    draft.client.name = "Changed"
    expect(row.items[0].description).toBe("Design")
    expect(row.client.name).toBe("Preview Client")
  })
  it("quotes CSV fields, preserves exact amounts and neutralizes spreadsheet formula input", () => {
    const row = invoice()
    row.title = '=HYPERLINK("https://example.com")'
    row.client.company = "  +SUM(1,2)"
    const csv = invoiceCsv([row])
    expect(csv).toContain('"200.00","10.00","9.50","199.50"')
    expect(csv).toContain('"\'=HYPERLINK(""https://example.com"")"')
    expect(csv).toContain('"\'  +SUM(1,2)"')
    expect(invoiceCsv([]).split("\r\n")).toHaveLength(1)
  })
})
describe("studio portfolio curation", () => {
  it("preserves legacy selection and lets the owner include, exclude and reorder projects", () => {
    const content = siteContentSchema.parse(site)
    expect(studioProjects(content.projects)).toHaveLength(4)
    content.projects[0].studio = false
    const arz = content.projects.find((project) => project.slug === "arz")!
    arz.studio = true
    content.projects = [arz, ...content.projects.filter((project) => project !== arz)]
    expect(studioProjects(content.projects)[0].slug).toBe("arz")
    expect(studioProjects(content.projects).some((project) => project.slug === "corso-velle")).toBe(false)
    arz.hidden = true
    expect(studioProjects(content.projects).some((project) => project.slug === "arz")).toBe(false)
  })
})
