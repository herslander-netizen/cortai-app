import { test, expect, type Page } from "@playwright/test";

async function iniciar(page: Page) {
  const erros: string[] = [];
  page.on("pageerror", (e) => erros.push(e.message));
  await page.goto("/");
  await expect(page.getByTestId("laboratorio")).toBeVisible();
  await expect(page.getByTestId("timeline")).toBeVisible();
  return erros;
}

test("Timeline e Cartões trocam imediatamente sem painel vazio, ida e volta", async ({ page }) => {
  const erros = await iniciar(page);
  const toggle = page.getByTestId("alternar-visualizacao");
  await toggle.click();
  await expect(page.getByTestId("modo-atual")).toHaveText("Modo: lista");
  await expect(page.getByTestId("cartoes")).toBeVisible();
  await expect(page.locator("#agenda-painel-visualizacao .agenda-item").first()).toBeVisible();
  await toggle.click();
  await expect(page.getByTestId("modo-atual")).toHaveText("Modo: timeline");
  await expect(page.getByTestId("timeline")).toBeVisible();
  expect(erros).toEqual([]);
});

test("alternância repetida, agenda densa e relatório de latência do navegador", async ({ page }, testInfo) => {
  const erros = await iniciar(page);
  await page.getByTestId("volume").click();
  await expect(page.getByTestId("volume")).toHaveText("120 itens");
  const toggle = page.getByTestId("alternar-visualizacao");
  for (let i = 0; i < 8; i++) {
    await toggle.click();
    await expect(page.getByTestId("modo-atual")).toHaveText(i % 2 === 0 ? "Modo: lista" : "Modo: timeline");
    await expect(page.getByTestId(i % 2 === 0 ? "cartoes" : "timeline")).toBeVisible();
  }
  const metricas = await page.evaluate(() => window.__agendaLab?.latencias ?? []);
  const ordenado = [...metricas].sort((a, b) => a - b);
  const mediana = ordenado[Math.floor(ordenado.length / 2)] ?? NaN;
  const p95 = ordenado[Math.ceil(ordenado.length * 0.95) - 1] ?? NaN;
  console.log(`LATENCIA ${testInfo.project.name}: mediada=${mediana.toFixed(1)}ms p95=${p95.toFixed(1)}ms n=${ordenado.length}`);
  expect(ordenado.length).toBeGreaterThanOrEqual(6);
  // Limite largo anti-travamento, NÃO garantia de 60 FPS nem SLO em Android real.
  expect(p95).toBeLessThan(3000);
  expect(erros).toEqual([]);
});

test("mudança de dia não quebra montagem, troca de modo ou seleção", async ({ page }) => {
  const erros = await iniciar(page);
  await page.getByTestId("dia-seguinte").click();
  await expect(page.getByTestId("dia-atual")).toHaveText("Dia: 2099-10-10");
  await expect(page.getByTestId("timeline")).toBeVisible();
  await page.getByTestId("dia-anterior").click();
  await expect(page.getByTestId("dia-atual")).toHaveText("Dia: 2099-10-09");
  await page.getByTestId("alternar-visualizacao").click();
  await expect(page.getByTestId("cartoes")).toBeVisible();
  await page.locator("#agenda-painel-visualizacao .agenda-item").first().click();
  await expect(page.getByTestId("selecionado")).not.toHaveText("Nenhum cartão selecionado");
  expect(erros).toEqual([]);
});

test("respeita redução de movimento e montagem em tema claro/escuro", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const erros = await iniciar(page);
  for (const tema of ["dark", "light"]) {
    await page.evaluate((t) => {
      document.documentElement.classList.toggle("dark", t === "dark");
    }, tema);
    await page.getByTestId("alternar-visualizacao").click();
    await expect(page.getByTestId("cartoes")).toBeVisible();
    await page.getByTestId("alternar-visualizacao").click();
    await expect(page.getByTestId("timeline")).toBeVisible();
  }
  expect(erros).toEqual([]);
});
