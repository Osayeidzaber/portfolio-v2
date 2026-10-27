import { createHmac, timingSafeEqual } from "node:crypto"

/** Verifies GitHub's `X-Hub-Signature-256` header against the raw request body. */
export function verifyGithubSignature(rawBody: string, header: string | null, secret: string): boolean {
  if (!secret || !header?.startsWith("sha256=")) return false
  const expected = Buffer.from(`sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`)
  const given = Buffer.from(header)
  return expected.length === given.length && timingSafeEqual(expected, given)
}

/** Events that can change what the site shows. */
export const RELEVANT_EVENTS = new Set([
  "push",
  "repository",
  "create",
  "delete",
  "release",
  "public",
  "star",
  "fork",
  "ping",
])
