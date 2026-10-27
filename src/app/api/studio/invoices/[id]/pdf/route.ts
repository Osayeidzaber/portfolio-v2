import { isAuthenticated } from "@/lib/auth/session"

/** Old PDF URLs remain private; invoice PDFs are now built entirely in the browser. */
export async function GET() {
  const headers = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" }
  if (!(await isAuthenticated())) return new Response("Unauthorized", { status: 401, headers })
  return new Response("Open the invoice desk to generate and download this PDF in your browser.", { status: 410, headers })
}
