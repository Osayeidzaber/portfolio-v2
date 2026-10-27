import { expect, test } from "@playwright/test"

test.describe.configure({ mode: "serial" })

test("admin pages redirect signed-out visitors", async ({ page }) => {
  for (const path of ["/admin", "/admin/preview"]) {
    await page.goto(path)
    await expect(page).toHaveURL(/\/admin\/login$/)
  }
})

test("a forged session cookie is rejected", async ({ page, context, baseURL }) => {
  const forged = Buffer.from(JSON.stringify({ sub: "admin", iat: 0, exp: 9_999_999_999, v: 1 })).toString("base64url")
  await context.addCookies([{ name: "oz_session", value: `${forged}.not-a-signature`, url: baseURL! }])
  await page.goto("/admin")
  await expect(page).toHaveURL(/\/admin\/login$/)
})

test("wrong password is refused with a clear message", async ({ page }) => {
  await page.goto("/admin/login")
  await page.fill("#password", "definitely-not-the-password")
  await page.click("button[type=submit]")
  await expect(page.locator("#login-error")).toBeVisible()
})

test("mutation endpoints refuse unauthenticated calls", async ({ request }) => {
  expect((await request.post("/api/github/webhook", { headers: { "x-github-event": "push" }, data: "{}" })).status()).toBeGreaterThanOrEqual(401)
  expect((await request.post("/api/revalidate")).status()).toBe(401)
  expect((await request.get("/api/thumb/not-a-project")).status()).toBe(404)
  expect((await request.get("/media/..%2F..%2F.env.local")).status()).toBeGreaterThanOrEqual(400)
})

test("security headers are set", async ({ request }) => {
  const res = await request.get("/")
  const h = res.headers()
  expect(h["content-security-policy"]).toContain("frame-ancestors 'none'")
  expect(h["x-content-type-options"]).toBe("nosniff")
  expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin")
})

test("no secrets in client bundles", async ({ page }) => {
  const bodies: string[] = []
  page.on("response", async (r) => {
    if (r.url().includes("/_next/static/") && r.url().endsWith(".js")) bodies.push(await r.text().catch(() => ""))
  })
  await page.goto("/", { waitUntil: "networkidle" })
  await page.goto("/admin/login", { waitUntil: "networkidle" })
  const all = bodies.join("\n")
  for (const name of ["ADMIN_PASSWORD_HASH", "SESSION_SECRET", "GITHUB_CONTENT_TOKEN", "GITHUB_WEBHOOK_SECRET", "github_pat_", "scrypt:"]) {
    expect(all, name).not.toContain(name)
  }
})

test("signed-in admin can load the studio and sign out", async ({ page }) => {
  const password = process.env.E2E_ADMIN_PASSWORD
  test.skip(!password, "set E2E_ADMIN_PASSWORD to run")
  await page.goto("/admin/login")
  await page.fill("#password", password!)
  await page.click("button[type=submit]")
  await expect(page.getByText("New on GitHub")).toBeVisible({ timeout: 30_000 })
  const cookie = (await page.context().cookies()).find((c) => c.name === "oz_session")
  expect(cookie?.httpOnly).toBe(true)
  expect(cookie?.sameSite).toBe("Strict")
  await page.getByRole("button", { name: "Profile & about" }).click()
  await page.getByLabel("Professional title").fill("")
  await expect(page.getByText("This can't be empty")).toBeVisible()
  await page.locator("form button:has-text('Sign out')").last().evaluate((b: HTMLButtonElement) => b.click())
  await expect(page).toHaveURL(/\/admin\/login$/)
})
