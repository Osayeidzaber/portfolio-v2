import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

const chapters = ["top", "about", "work", "toolkit", "ledger", "experience", "play", "contact"]

test("Minecraft inventory opens all ten tools and calculates useful results", async ({ page }) => {
  await page.goto("/")
  await page.locator("#play").scrollIntoViewIfNeeded()
  const output = page.getByLabel("Crafted output", { exact: true })
  await expect(output).toHaveValue(/Nether: X 16, Z -32/)
  await page.getByLabel("Z coordinate", { exact: true }).fill("-257")
  await expect(output).toHaveValue(/Block position: 16, -33/)
  const toolNames = ["Minecraft Gradient Generator", "Stack Calculator", "Minecraft Time Converter", "Minecraft Color Code Picker", "Minecraft Server MOTD Preview", "Chunk Coordinate Calculator", "Portal Link Calculator", "XP Level Calculator", "Minecraft Item Name Formatter"]
  for (const name of toolNames) {
    await page.getByRole("button", { name, exact: true }).click()
    await expect(page.getByRole("heading", { name, exact: true })).toBeVisible()
    await expect(output).not.toHaveValue("")
  }
  await page.getByRole("button", { name: "Stack Calculator", exact: true }).click()
  await page.getByLabel("Item quantity").fill("130")
  await expect(output).toHaveValue(/2 full stacks \+ 2 items/)
  await page.getByRole("button", { name: "XP Level Calculator", exact: true }).click()
  await expect(output).toHaveValue(/1395 XP/)
  await page.getByLabel("Starting level").fill("40")
  await expect(page.getByRole("alert")).toContainText("target level")
  await page.getByRole("button", { name: "Minecraft Color Code Picker", exact: true }).click()
  await page.getByLabel("Edition", { exact: true }).selectOption("bedrock")
  await page.getByRole("button", { name: "Emerald §q", exact: true }).click()
  await expect(output).toHaveValue(/^§q/)
  const colorsAxe = await new AxeBuilder({ page }).include(".mc-workbench").withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()
  expect(colorsAxe.violations.map((violation) => violation.id)).toEqual([])
  await expect(page.getByRole("button", { name: /Enter the lab/ })).toHaveAttribute("aria-expanded", "false")
  await expect(page.getByRole("region", { name: "Corso Velle showcase" })).toHaveCount(1)
})

test("case-study client navigation resolves URL data inside the streaming boundary", async ({ page }) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.goto("/")
  await page.locator("nav[aria-label='All projects']").getByRole("link", { name: /ARZ/ }).click()
  await expect(page).toHaveURL(/\/work\/arz$/)
  await expect(page.locator("h1")).toHaveText("ARZ")
  expect(errors).toEqual([])
})

test("portrait hero keeps the name near the top without horizontal overflow", async ({ page }) => {
  for (const viewport of [{ width: 375, height: 812 }, { width: 1024, height: 1800 }]) {
    await page.setViewportSize(viewport)
    await page.goto("/")
    const heading = await page.locator("h1").boundingBox()
    expect(heading!.y).toBeLessThan(350)
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0)
  }
})

test("home renders every chapter without errors or sideways scroll", async ({ page }) => {
  const errors: string[] = []
  page.on("pageerror", (e) => errors.push(e.message))
  await page.goto("/", { waitUntil: "networkidle" })
  for (const id of chapters) await expect(page.locator(`#${id}`)).toHaveCount(1)
  await expect(page.locator("h1")).toContainText("Osayeed")
  for (const id of chapters) {
    await page.locator(`#${id}`).scrollIntoViewIfNeeded()
    await page.waitForTimeout(300)
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBe(0)
  expect(errors).toEqual([])
})

test("skip link is the first tab stop", async ({ page, isMobile }) => {
  test.skip(isMobile, "keyboard flow")
  await page.goto("/")
  await page.keyboard.press("Tab")
  await expect(page.locator(":focus")).toHaveText("Skip to content")
})

test("works without WebGL and with reduced motion", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce" })
  await ctx.addInitScript(() => {
    const orig = HTMLCanvasElement.prototype.getContext
    // Simulate a device without WebGL; 2D canvas keeps working.
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
      if (type.startsWith("webgl")) return null
      return (orig as (...a: unknown[]) => unknown).call(this, type, ...rest)
    } as typeof orig
  })
  const page = await ctx.newPage()
  const errors: string[] = []
  page.on("pageerror", (e) => errors.push(e.message))
  await page.goto("/", { waitUntil: "networkidle" })
  await page.locator("#work").scrollIntoViewIfNeeded()
  // The carousel falls back to a plain strip of images.
  await expect(page.locator("#work button[aria-pressed]").first()).toBeVisible()
  expect(errors).toEqual([])
  await ctx.close()
})

test("case study page, filter and 404", async ({ page }) => {
  await page.goto("/work/tajwater")
  await expect(page.locator("h1")).toHaveText("TajWater")
  await expect(page.getByRole("link", { name: /Visit live site/ })).toHaveAttribute("href", /^https:\/\//)
  await page.goto("/")
  await page.locator("#work").scrollIntoViewIfNeeded()
  await page.getByRole("button", { name: "Shopify", exact: true }).click()
  await expect(page.locator("nav[aria-label='All projects'] li")).not.toHaveCount(0)
  // Unknown slugs: a 404 when caught before streaming starts, otherwise Next keeps the
  // 200 and injects noindex (documented in not-found.md). Either way: not-found UI, not indexed.
  const res = await page.goto("/work/does-not-exist")
  await expect(page.locator("h1")).toContainText("Not")
  if (res?.status() !== 404) {
    await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(1)
  }
})

test("metadata, sitemap and robots", async ({ page, request }) => {
  await page.goto("/")
  await expect(page).toHaveTitle(/Osayeed Zaber/)
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1)
  const sitemap = await (await request.get("/sitemap.xml")).text()
  expect(sitemap).toContain("/work/tajwater")
  const robots = await (await request.get("/robots.txt")).text()
  expect(robots).toContain("Disallow: /admin")
})

for (const path of ["/", "/work/tajwater", "/admin/login"]) {
  test(`no WCAG 2.1 AA violations on ${path}`, async ({ page }) => {
    await page.goto(path, { waitUntil: "networkidle" })
    await page.waitForTimeout(1500)
    const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()
    expect(result.violations.map((v) => `${v.id}: ${v.nodes[0]?.target}`)).toEqual([])
  })
}
