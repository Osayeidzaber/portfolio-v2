import { randomBytes, scrypt, timingSafeEqual } from "node:crypto"

/*
 * Password hashes are stored as `scrypt:N:r:p:<salt b64>:<hash b64>` in the
 * ADMIN_PASSWORD_HASH env var (no `$`, which dotenv would try to expand).
 * Produce one with `pnpm hash-password`.
 */

const KEYLEN = 64

function derive(password: string, salt: Buffer, N: number, r: number, p: number): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(password.normalize("NFKC"), salt, KEYLEN, { N, r, p, maxmem: 256 * N * r }, (err, key) =>
      err ? reject(err) : resolve(key),
    ),
  )
}

export async function hashPassword(password: string): Promise<string> {
  const N = 2 ** 15
  const r = 8
  const p = 1
  const salt = randomBytes(16)
  const key = await derive(password, salt, N, r, p)
  return `scrypt:${N}:${r}:${p}:${salt.toString("base64")}:${key.toString("base64")}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split(":")
  if (parts.length !== 6 || parts[0] !== "scrypt") return false
  const [, n, r, p, saltB64, hashB64] = parts
  const N = Number(n)
  const R = Number(r)
  const P = Number(p)
  if (!Number.isInteger(N) || N < 2 ** 14 || N > 2 ** 20 || !R || !P) return false
  const expected = Buffer.from(hashB64, "base64")
  if (expected.length !== KEYLEN) return false
  try {
    const actual = await derive(password, Buffer.from(saltB64, "base64"), N, R, P)
    return timingSafeEqual(actual, expected)
  } catch {
    return false
  }
}
