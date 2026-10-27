import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

const chapters = ["top", "about", "work", "toolkit", "ledger", "experience", "play", "contact"]

test("hero CTA remains native and the portrait keeps its original colors", async ({ page }) => {
  await page.goto("/")
  const cta = page.locator('#top a[href="#work"]')
  await expect(cta).toBeVisible()
  await expect(cta.locator("canvas")).toHaveCount(0)
  await expect(page.locator('#about img[alt^="Portrait of"]')).toHaveCSS("filter", "none")
})

test("primary nav indicator stays active through the intermediate chapters", async ({ page, isMobile }) => {
  test.skip(isMobile, "desktop compact header indicator")
  await page.goto("/", { waitUntil: "networkidle" })
  for (const [id, label] of [["work", "Work"], ["toolkit", "Work"], ["ledger", "Ledger"], ["experience", "Ledger"], ["play", "Tools"]]) {
    await page.locator(`#${id}`).evaluate((element) => window.scrollTo({ top: element.getBoundingClientRect().top + scrollY - 110, behavior: "instant" }))
    await expect(page.getByRole("navigation", { name: "Primary", exact: true }).getByRole("link", { name: label, exact: true })).toHaveAttribute("aria-current", "true")
  }
})

test("carousel responds to keys and preserves its selection after scrolling away", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" })
  await page.locator("#about").scrollIntoViewIfNeeded()
  await page.locator("[data-carousel-stage]").scrollIntoViewIfNeeded()
  const gallery = page.getByRole("region", { name: "Image carousel", exact: true })
  await expect(gallery.locator("canvas")).toHaveCount(1)
  const title = page.locator("#work article h3")
  const original = await title.textContent()
  await gallery.focus()
  await gallery.press("ArrowRight")
  await expect(title).not.toHaveText(original!)
  await page.waitForTimeout(700)
  const selected = await title.textContent()
  await page.locator("#contact").scrollIntoViewIfNeeded()
  await page.locator("[data-carousel-stage]").scrollIntoViewIfNeeded()
  await expect(title).toHaveText(selected!)
  await expect(gallery.locator("canvas")).toHaveCount(1)
})

test("standalone Minecraft inventory opens its tools and calculates useful results", async ({ page }) => {
  await page.goto("/minecraft")
  await page.locator("#tools").scrollIntoViewIfNeeded()
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
  await expect(page.locator(".mc-workbench").getByRole("alert")).toContainText("target level")
  await page.getByRole("button", { name: "Minecraft Color Code Picker", exact: true }).click()
  await page.getByLabel("Edition", { exact: true }).selectOption("bedrock")
  await page.getByRole("button", { name: "Emerald §q", exact: true }).click()
  await expect(output).toHaveValue(/^§q/)
  const colorsAxe = await new AxeBuilder({ page }).include(".mc-workbench").withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()
  expect(colorsAxe.violations.map((violation) => violation.id)).toEqual([])
  await expect(page.getByRole("navigation", { name: "Primary", exact: true })).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0)
})

test("Minecraft launcher is a stable separate-page link with the owner's domain and email", async ({ page, request }) => {
  await page.goto("/")
  const card = page.locator(".mc-launch-card")
  await card.scrollIntoViewIfNeeded()
  await expect(card).toHaveCSS("display", "grid")
  const cardBox = await card.boundingBox(), buttonBox = await card.locator(".mc-button").boundingBox()
  expect(buttonBox!.x).toBeGreaterThanOrEqual(cardBox!.x)
  expect(buttonBox!.x + buttonBox!.width).toBeLessThanOrEqual(cardBox!.x + cardBox!.width + 1)
  await expect(page.locator('a[href="mailto:mail@zaber.tech"]').first()).toHaveText("mail@zaber.tech")
  await expect(page.locator('a[href="mailto:osayeedjaber18@gmail.com"]').first()).toBeAttached()
  await card.click()
  await expect(page).toHaveURL(/\/minecraft$/)
  await expect(page.getByRole("heading", { level: 1 })).toContainText("CRAFTING")
  await expect(page.locator(".mc-page-header")).toHaveCSS("display", "flex")
  await expect(page.locator(".mc-hero-scene")).toHaveCSS("position", "absolute")
  await expect(page.locator('link[rel="canonical"]').first()).toHaveAttribute("href", "https://zaber.tech/minecraft")
  expect(await (await request.get("/sitemap.xml")).text()).toContain("https://zaber.tech/minecraft")
})

test("LuckPerms ranks accept RGB gradients and tool links survive reloading", async ({ page }) => {
  await page.goto("/minecraft#ranks")
  await expect(page.getByRole("heading", { name: "LuckPerms Rank Builder", exact: true })).toBeVisible()
  await page.getByLabel("Rank group name").fill("champion")
  await page.getByText("Design a gradient prefix", { exact: true }).click()
  await page.getByLabel("Gradient text", { exact: true }).fill("[CHAMP] ")
  await page.getByRole("button", { name: "Add stop +", exact: true }).click()
  await page.getByRole("button", { name: "Use as rank prefix", exact: false }).click()
  const commands = page.getByLabel("LuckPerms commands", { exact: true })
  await expect(commands).toHaveValue(/group champion meta setprefix 100 "&#/)
  await page.getByLabel("Permission nodes (one per line)").fill("example.use\n-example.admin")
  await expect(commands).toHaveValue(/permission set example.admin false/)
  await page.getByRole("button", { name: "LuckPerms Rank Ladder", exact: true }).click()
  await expect(page).toHaveURL(/#tracks$/)
  await expect(commands).toHaveValue(/track ranks append mvp/)
  await page.reload()
  await expect(page.getByRole("heading", { name: "LuckPerms Rank Ladder", exact: true })).toBeVisible()
  await page.getByRole("button", { name: "LuckPerms Meta Editor", exact: true }).click()
  await expect(commands).toHaveValue(/meta set max-homes "5"/)
})

test("case-study client navigation resolves URL data inside the streaming boundary", async ({ page }) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.goto("/")
  await page.locator("nav[aria-label='All projects']").getByRole("link", { name: /ARZ/ }).click()
  await expect(page).toHaveURL(/\/work\/arz$/)
  await expect(page.getByRole("heading", { name: "ARZ", level: 1, exact: true })).toBeVisible()
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
    await expect(page.locator('meta[name="robots"][content*="noindex"]')).not.toHaveCount(0)
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

for (const path of ["/", "/minecraft", "/work/tajwater", "/admin/login"]) {
  test(`no WCAG 2.1 AA violations on ${path}`, async ({ page }) => {
    await page.goto(path, { waitUntil: "networkidle" })
    await page.waitForTimeout(1500)
    const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()
    expect(result.violations.map((v) => `${v.id}: ${v.nodes[0]?.target}`)).toEqual([])
  })
}
