import { NextResponse, type NextRequest } from "next/server"

import { SESSION_COOKIE, verifyToken } from "@/lib/auth/token"

/**
 * Sends signed-out visitors from /admin/* to the login page. This is a convenience, not
 * the security boundary: every admin page and server action verifies the session itself.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (pathname === "/admin/login") return NextResponse.next()
  const ok = verifyToken(request.cookies.get(SESSION_COOKIE)?.value, process.env.SESSION_SECRET || "")
  if (ok) return NextResponse.next()
  const url = request.nextUrl.clone()
  url.pathname = "/admin/login"
  url.search = ""
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ["/admin/:path*"],
}
