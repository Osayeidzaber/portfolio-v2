import { isAuthenticated } from "@/lib/auth/session"
import { invoicePdf } from "@/lib/studio/pdf"
import { readStudio } from "@/lib/studio/store"

export async function GET(request: Request, context: RouteContext<"/api/studio/invoices/[id]/pdf">) {
  if (!(await isAuthenticated())) return new Response("Unauthorized", { status: 401, headers: { "Cache-Control": "private, no-store" } })
  try {
    const { id } = await context.params
    const { data } = await readStudio()
    const invoice = data.invoices.find((item) => item.id === id)
    if (!invoice) return new Response("Invoice not found", { status: 404, headers: { "Cache-Control": "private, no-store" } })
    const bytes = await invoicePdf(invoice)
    const disposition = new URL(request.url).searchParams.has("download") ? "attachment" : "inline"
    const filename = invoice.number.replace(/[^A-Za-z0-9-]/g, "-")
    return new Response(Buffer.from(bytes), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `${disposition}; filename="${filename}.pdf"`, "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow", "Content-Security-Policy": "default-src 'none'; frame-ancestors 'self'", "X-Frame-Options": "SAMEORIGIN" } })
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Could not export invoice." }, { status: 400, headers: { "Cache-Control": "private, no-store" } }) }
}
