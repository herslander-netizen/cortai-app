import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: ["**/confirmacao.pw.ts"],
  timeout: 40_000,
  expect: { timeout: 10_000 },
  retries: 0,
  workers: 1,
  reporter: [["list"], ["html", { outputFolder: "test-results/confirmacao/report", open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:4174",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "android-360", use: { ...devices["Pixel 5"], viewport: { width: 360, height: 780 }, deviceScaleFactor: 3 } },
    { name: "android-390", use: { ...devices["Pixel 5"], viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 } },
    { name: "desktop-1280", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
  ],
  webServer: {
    cwd: fileURLToPath(new URL("../../", import.meta.url)),
    command: "bunx vite --config tests/confirmacao-browser/vite.config.ts",
    url: "http://127.0.0.1:4174",
    timeout: 120_000,
    reuseExistingServer: false,
  },
});
