import { describe, expect, it } from "vitest"

import { hashPassword, verifyPassword } from "@/lib/auth/password"
import { rateLimit } from "@/lib/auth/rate-limit"
import { createToken, SESSION_TTL_SECONDS, verifyToken } from "@/lib/auth/token"

const SECRET = "x".repeat(40)

describe("password hashing", () => {
  it("verifies the right password and rejects others", async () => {
    const hash = await hashPassword("correct horse battery")
    expect(hash).not.toContain("correct")
    expect(hash).not.toContain("$")
    expect(await verifyPassword("correct horse battery", hash)).toBe(true)
    expect(await verifyPassword("correct horse batterY", hash)).toBe(false)
  })

  it("rejects malformed or weak-parameter hashes", async () => {
    expect(await verifyPassword("a", "")).toBe(false)
    expect(await verifyPassword("a", "scrypt:1024:8:1:AAAA:AAAA")).toBe(false)
    expect(await verifyPassword("a", "plaintext")).toBe(false)
  })
})

describe("session token", () => {
  it("round-trips", () => {
    const t = createToken(SECRET)
    expect(verifyToken(t, SECRET)?.sub).toBe("admin")
  })

  it("rejects a forged signature, another secret and a tampered payload", () => {
    const t = createToken(SECRET)
    const [body] = t.split(".")
    expect(verifyToken(`${body}.AAAA`, SECRET)).toBeNull()
    expect(verifyToken(t, "y".repeat(40))).toBeNull()
    const forged = Buffer.from(JSON.stringify({ sub: "admin", iat: 0, exp: 9e9, v: 1 })).toString("base64url")
    expect(verifyToken(`${forged}.${t.split(".")[1]}`, SECRET)).toBeNull()
  })

  it("expires", () => {
    const t = createToken(SECRET, 0)
    expect(verifyToken(t, SECRET, (SESSION_TTL_SECONDS + 1) * 1000)).toBeNull()
  })

  it("refuses a short secret", () => {
    expect(verifyToken(createToken("short"), "short")).toBeNull()
  })
})

describe("rate limit", () => {
  it("blocks after the limit within the window and recovers after it", () => {
    const opts = { limit: 3, windowMs: 1000 }
    for (let i = 0; i < 3; i++) expect(rateLimit("k", { ...opts, now: 1000 + i }).ok).toBe(true)
    expect(rateLimit("k", { ...opts, now: 1500 }).ok).toBe(false)
    expect(rateLimit("k", { ...opts, now: 2100 }).ok).toBe(true)
  })
})
