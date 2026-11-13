import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";

test("confirmação Figaroo: hierarquia, dados e tela sem rolagem lateral", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "Horário garantido" })).toBeVisible();
  await expect(page.getByText("Hidratação profunda")).toBeVisible();
  await expect(page.getByText("sábado, 14 de novembro")).toBeVisible();
  await expect(page.getByText("14:00")).toBeVisible();
  await expect(page.getByText("R$ 95,00")).toBeVisible();
  await expect(page.getByRole("link", { name: "Adicionar à agenda" })).toHaveAttribute("href", /calendar.google/);
  await expect(page.locator(".confirmacao-extras")).toBeVisible();
  const widths = await page.evaluate(() => ({ document: document.documentElement.scrollWidth, viewport: document.documentElement.clientWidth }));
  expect(widths.document).toBeLessThanOrEqual(widths.viewport + 1);

  await page.getByRole("button", { name: "Mais formas de guardar e enviar" }).click();
  await expect(page.getByRole("button", { name: "Baixar arquivo .ics" })).toBeVisible();
  await page.getByRole("button", { name: "Gerenciar agendamento" }).click();
  await expect(page.getByRole("button", { name: "Alterar agendamento" })).toBeVisible();
  await page.getByRole("button", { name: "Alterar agendamento" }).click();
  await expect(page.getByTestId("gestao")).toHaveText("alterar");

  await page.getByTestId("tema").click();
  await expect(page.getByRole("heading", { name: "Horário garantido" })).toBeVisible();
  const widthsLight = await page.evaluate(() => ({ document: document.documentElement.scrollWidth, viewport: document.documentElement.clientWidth }));
  expect(widthsLight.document).toBeLessThanOrEqual(widthsLight.viewport + 1);

  await mkdir("test-results/confirmacao/screenshots", { recursive: true });
  await page.screenshot({ path: `test-results/confirmacao/screenshots/${testInfo.project.name}-claro.png`, fullPage: true });
  await page.getByTestId("tema").click();
  await page.screenshot({ path: `test-results/confirmacao/screenshots/${testInfo.project.name}-escuro.png`, fullPage: true });
  expect(errors).toEqual([]);
});

test("cancelamento preserva ação de refazer sem confundir com agendamento ativo", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await page.getByTestId("cancelar-fake").click();
  await expect(page.getByRole("heading", { name: "Agendamento cancelado" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Adicionar à agenda" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Escolher outro horário" })).toBeVisible();
});

test("redução de movimento e foco continuam operacionais", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.locator(".confirmacao-visto")).toBeVisible();
  const movimento = await page.locator(".confirmacao-visto").evaluate((node) => getComputedStyle(node).animationName);
  expect(movimento).toBe("none");
  await page.getByRole("button", { name: "Gerenciar agendamento" }).click();
  await expect(page.getByRole("button", { name: "Cancelar agendamento" })).toBeVisible();
});
