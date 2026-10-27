/*
 * Prints a value for ADMIN_PASSWORD_HASH and a fresh SESSION_SECRET.
 *
 *   pnpm hash-password            (prompts, input hidden)
 *   pnpm hash-password -- "pass"  (non-interactive; avoid on shared machines: shell history)
 */
import { randomBytes } from "node:crypto"
import { stdin, stdout } from "node:process"

import { hashPassword } from "../src/lib/auth/password"

async function prompt(question: string): Promise<string> {
  stdout.write(question)
  if (!stdin.isTTY) {
    let data = ""
    for await (const chunk of stdin) data += chunk
    return data.trim()
  }
  stdin.setRawMode(true)
  stdin.resume()
  stdin.setEncoding("utf8")
  return new Promise((resolve) => {
    let value = ""
    const onData = (ch: string) => {
      if (ch === "\r" || ch === "\n" || ch === "\u0004") {
        stdin.setRawMode(false)
        stdin.pause()
        stdin.off("data", onData)
        stdout.write("\n")
        resolve(value)
      } else if (ch === "\u0003") {
        process.exit(130)
      } else if (ch === "\u007f" || ch === "\b") {
        value = value.slice(0, -1)
      } else {
        value += ch
      }
    }
    stdin.on("data", onData)
  })
}

async function main() {
  const password = process.argv.slice(2).find((a) => a !== "--") ?? (await prompt("New admin password: "))
  if (password.length < 12) {
    console.error("Use at least 12 characters.")
    process.exit(1)
  }
  const hash = await hashPassword(password)
  console.log("\nAdd these to .env.local and to Vercel → Settings → Environment Variables:\n")
  console.log(`ADMIN_PASSWORD_HASH=${hash}`)
  console.log(`SESSION_SECRET=${randomBytes(32).toString("base64url")}`)
}

main()
