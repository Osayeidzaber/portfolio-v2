import "server-only"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { connection } from "next/server"

import { env } from "@/lib/env"
import { createToken, SESSION_COOKIE, SESSION_TTL_SECONDS, verifyToken } from "./token"

export async function startSession() {
  const jar = await cookies()
  jar.set(SESSION_COOKIE, createToken(env.sessionSecret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  })
}

export async function endSession() {
  const jar = await cookies()
  jar.delete(SESSION_COOKIE)
}

export async function isAuthenticated(): Promise<boolean> {
  // Expiry checks read the clock, so this is always request-time work.
  await connection()
  const jar = await cookies()
  return verifyToken(jar.get(SESSION_COOKIE)?.value, env.sessionSecret) !== null
}

/** Every admin page and server action calls this. The proxy redirect is only a convenience. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAuthenticated())) redirect("/admin/login")
}
