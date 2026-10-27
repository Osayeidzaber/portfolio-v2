import { createHmac, timingSafeEqual } from "node:crypto"

/*
 * Stateless session token: base64url(JSON payload) + "." + base64url(HMAC-SHA256).
 * Pure functions (secret passed in) so the proxy, server actions and tests share them.
 */

export const SESSION_COOKIE = "oz_session"
export const SESSION_TTL_SECONDS = 8 * 60 * 60

export type SessionPayload = { sub: "admin"; iat: number; exp: number; v: 1 }

const b64url = (buf: Buffer) => buf.toString("base64url")
const sign = (data: string, secret: string) => b64url(createHmac("sha256", secret).update(data).digest())

export function createToken(secret: string, now = Date.now()): string {
  const iat = Math.floor(now / 1000)
  const payload: SessionPayload = { sub: "admin", iat, exp: iat + SESSION_TTL_SECONDS, v: 1 }
  const body = b64url(Buffer.from(JSON.stringify(payload)))
  return `${body}.${sign(body, secret)}`
}

export function verifyToken(token: string | undefined, secret: string, now = Date.now()): SessionPayload | null {
  if (!token || secret.length < 32) return null
  const [body, sig] = token.split(".")
  if (!body || !sig) return null
  const expected = Buffer.from(sign(body, secret))
  const given = Buffer.from(sig)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload
    if (payload.sub !== "admin" || payload.v !== 1) return null
    if (payload.exp * 1000 <= now) return null
    return payload
  } catch {
    return null
  }
}
