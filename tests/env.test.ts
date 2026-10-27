import { afterEach, expect, it, vi } from "vitest"

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

it.each([
  [undefined, "https://zaber.tech"],
  ["", "https://zaber.tech"],
  ["   ", "https://zaber.tech"],
  ["zaber.tech", "https://zaber.tech"],
  [" zaber.tech/ ", "https://zaber.tech"],
  ["https://zaber.tech/", "https://zaber.tech"],
  ["http://localhost:3000/", "http://localhost:3000"],
  ["//zaber.tech/", "https://zaber.tech"],
])("normalizes NEXT_PUBLIC_SITE_URL %j to %s", async (configured, expected) => {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", configured)
  const { siteUrl } = await import("@/lib/env")
  expect(siteUrl).toBe(expected)
  expect(new URL(siteUrl).origin).toBe(expected)
})

it.each(["not a valid domain", "ftp://zaber.tech"])("explains invalid site URL %j", async (configured) => {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", configured)
  await expect(import("@/lib/env")).rejects.toThrow("NEXT_PUBLIC_SITE_URL")
})
