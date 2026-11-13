import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: ["**/agenda.pw.ts"],
  timeout: 40_000,
  expect: { timeout: 10_000 },
  retries: 0,
  workers: 1,
  reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "android-360",
      use: {
        ...devices["Pixel 5"],
        viewport: { width: 360, height: 780 },
        deviceScaleFactor: 3,
      },
    },
    {
      name: "android-390",
      use: {
        ...devices["Pixel 5"],
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 3,
      },
    },
    {
      name: "desktop-1280",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
      },
    },
  ],
  webServer: {
    // O webServer parte da pasta do config Playwright; executar Vite na raiz do repo.
    cwd: fileURLToPath(new URL("../../", import.meta.url)),
    command: "bunx vite --config tests/agenda-browser/vite.config.ts",
    url: "http://127.0.0.1:4173",
    timeout: 120_000,
    reuseExistingServer: false,
  },
});
