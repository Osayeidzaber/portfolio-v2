import { defineConfig, devices } from "@playwright/test"

/*
 * Browser tests against a production build. Run `pnpm build` first, then `pnpm test:e2e`.
 * Set E2E_ADMIN_PASSWORD to also exercise the signed-in admin.
 */
const port = Number(process.env.E2E_PORT || 3100)

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${port}`,
    launchOptions: { args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] },
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `pnpm start -p ${port}`,
    port,
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
