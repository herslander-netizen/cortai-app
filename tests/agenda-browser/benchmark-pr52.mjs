#!/usr/bin/env node
/**
 * Benchmark A/B no mesmo runner Chromium, usando componentes reais.
 * A base e PR52 diferem SOMENTE no arquivo de transição em src/.
 * Não mede Android físico, login Supabase ou scrollTo da AgendaOperacional.
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const variant = process.env.TEST_VARIANT ?? "unknown";
const round = Number(process.env.TEST_ROUND ?? 1);
const output = process.env.REPORT_OUT ?? "/tmp/agenda-pr52-sample.json";
const baseURL = "http://127.0.0.1:4173";
const widths = [
  { name: "mobile-360", width: 360, height: 780, mobile: true },
  { name: "mobile-390", width: 390, height: 844, mobile: true },
  { name: "desktop-1280", width: 1280, height: 800, mobile: false },
];
const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling"] });
const samples = [];
const issues = [];

function percentile(vals, p) {
  if (!vals.length) return null;
  const sorted = [...vals].sort((a, b) => a - b);
  return Number(sorted[Math.max(0, Math.ceil(sorted.length * p) - 1)].toFixed(1));
}

try {
  for (const viewport of widths) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      isMobile: viewport.mobile,
      hasTouch: viewport.mobile,
      deviceScaleFactor: viewport.mobile ? 3 : 1,
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));

    await page.goto(baseURL, { waitUntil: "networkidle", timeout: 25000 });
    await page.locator('[data-testid="timeline"]').waitFor({ state: "visible" });
    const toggle = page.locator('[data-testid="alternar-visualizacao"]');

    for (const volume of [40, 120]) {
      const actualVolume = await page.locator('[data-testid="volume"]').textContent();
      if (!actualVolume?.includes(String(volume))) {
        await page.locator('[data-testid="volume"]').click();
      }
      const mode = await page.locator('[data-testid="modo-atual"]').textContent();
      if (!mode?.includes("timeline")) {
        await toggle.click();
        await page.waitForTimeout(420);
      }
      // Aquecer dois ciclos, sem utilizá-los no cálculo.
      for (let i = 0; i < 2; i++) {
        await toggle.click();
        await page.waitForTimeout(430);
      }
      await page.evaluate(() => { if (window.__agendaLab) window.__agendaLab.amostras = []; });

      for (let i = 0; i < 8; i++) {
        const dest = i % 2 === 0 ? "lista" : "timeline";
        await toggle.click({ timeout: 12000 });
        await page.waitForFunction(
          (expected) => (window.__agendaLab?.amostras.length ?? 0) >= expected,
          i + 1,
          { timeout: 8000 },
        );
        const visible = await page.locator('[data-testid="modo-atual"]').textContent();
        if (!visible?.includes(dest)) {
          throw new Error("Modo final divergente (" + variant + " " + viewport.name + "): " + visible);
        }
        const panelCount = await page.locator("#agenda-painel-visualizacao").evaluate((p) => p.children.length);
        if (panelCount !== 1) {
          issues.push(variant + " " + viewport.name + " " + volume + " itens: " + panelCount + " painéis após 360ms");
        }
      }

      const raw = await page.evaluate(() => window.__agendaLab?.amostras ?? []);
      if (raw.length !== 8) throw new Error("Número errado de amostras: " + raw.length);
      const record = {
        variant, round, viewport: viewport.name, items: volume, count: raw.length,
        commitP50Ms: percentile(raw.map((x) => x.commitMs), 0.5),
        commitP95Ms: percentile(raw.map((x) => x.commitMs), 0.95),
        firstFrameP50Ms: percentile(raw.map((x) => x.frame1Ms), 0.5),
        firstFrameP95Ms: percentile(raw.map((x) => x.frame1Ms), 0.95),
        secondFrameP50Ms: percentile(raw.map((x) => x.frame2Ms), 0.5),
        secondFrameP95Ms: percentile(raw.map((x) => x.frame2Ms), 0.95),
        worstRafP95Ms: percentile(raw.map((x) => x.rafP95Ms), 0.95),
        worstFrameMs: percentile(raw.map((x) => x.rafMaxMs), 1),
        framesOver50Ms: raw.reduce((s, x) => s + x.rafAcima50Ms, 0),
        totalFrames: raw.reduce((s, x) => s + x.totalRaf, 0),
        frames: raw,
      };
      samples.push(record);
      console.log(
        "MEDICAO " + variant + " round=" + round + " viewport=" + viewport.name +
        " volume=" + volume + " commitP95=" + record.commitP95Ms +
        "ms primeiroRAF_P95=" + record.firstFrameP95Ms +
        "ms segundoRAF_P95=" + record.secondFrameP95Ms +
        "ms intervaloPior=" + record.worstFrameMs +
        "ms quadros>50ms=" + record.framesOver50Ms + "/" + record.totalFrames
      );
    }

    // Dois toques rápidos: visualização final e somente um painel montado.
    await toggle.click();
    await page.waitForTimeout(40);
    await toggle.click();
    await page.waitForTimeout(450);
    const modeAfter = await page.locator('[data-testid="modo-atual"]').textContent();
    const countAfter = await page.locator("#agenda-painel-visualizacao").evaluate((p) => p.children.length);
    if (!modeAfter?.includes("timeline") || countAfter !== 1) {
      issues.push(variant + " " + viewport.name + ": toque rápido modo=" + modeAfter + " paineis=" + countAfter);
    }

    // prefers-reduced-motion: alternância deve permanecer correta.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await toggle.click();
    await page.locator('[data-testid="cartoes"]').waitFor({ state: "visible" });
    await page.waitForTimeout(400);
    const reducedCount = await page.locator("#agenda-painel-visualizacao").evaluate((p) => p.children.length);
    if (reducedCount !== 1) {
      issues.push(variant + " " + viewport.name + ": movimento reduzido " + reducedCount + " paineis");
    }
    if (errors.length) {
      issues.push(variant + " " + viewport.name + ": errors=" + errors.join("; ").slice(0,2000));
    }
    await context.close();
  }
} finally {
  await browser.close();
}
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify({ variant, round, samples, issues }, null, 2) + "\n");
console.log("RELATORIO " + output + ", " + samples.length + " grupos, " + issues.length + " problemas");
if (issues.length) {
  for (const issue of issues) console.error("PROBLEMA: " + issue);
  process.exitCode = 1;
}
