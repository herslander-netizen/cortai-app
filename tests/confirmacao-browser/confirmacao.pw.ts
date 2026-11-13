import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";

test("confirmação essencial: horário, negócio, serviço e opções funcionais", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "Obrigado!" })).toBeVisible();
  await expect(page.getByText("Confirmado!")).toBeVisible();
  await expect(page.getByText("sábado, 14 de novembro")).toBeVisible();
  await expect(page.getByText("14:00 – 15:00")).toBeVisible();
  await expect(page.getByText("Hidratação profunda")).toBeVisible();
  await expect(page.getByText("Bella Rosa Studio de Beleza")).toBeVisible();
  await expect(page.getByText(/R\$\s*95,00/)).toBeVisible();
  await expect(page.locator(".confirmacao-linha")).toHaveCount(3);
  await expect(page.getByRole("link", { name: "Adicionar à agenda" })).toHaveCount(0);
  await expect(page.getByText("Comanda #12112026-2148-1061")).toHaveCount(0);
  await page.getByRole("button", { name: "Mais opções" }).click();
  await expect(page.getByRole("link", { name: "Adicionar à agenda" })).toHaveAttribute("href", /calendar.google/);
  await page.getByRole("button", { name: "Alterar agendamento" }).click();
  await expect(page.getByTestId("gestao")).toHaveText("alterar");
  await page.getByRole("button", { name: "Detalhes e preferências" }).click();
  await expect(page.getByText("Comanda #12112026-2148-1061")).toBeVisible();
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await expect(page.getByTestId("gestao")).toHaveText("fechar");
  expect(errors).toEqual([]);
});

test("todos os estilos usam sua paleta, sem cortes ou rolagem horizontal", async ({ page }, testInfo) => {
  await mkdir("test-results/confirmacao/screenshots", { recursive: true });
  const fundos = new Set<string>();
  const cenarios = [
    ["figaro-rock", "figaro"],
    ["figaro-classico", "figaro"],
    ["feminino-lavanda", "figaro"],
    ["vitrine-rose", "figaro"],
    ["vitrine-clean", "figaro"],
    ["chat-flow", "conversa"],
  ] as const;
  await page.goto("/", { waitUntil: "networkidle" });
  for(const [cenario, visual] of cenarios) {
    await page.getByTestId("tema").selectOption(cenario);
    const wrapper = page.getByTestId("demo");
    await expect(wrapper).toHaveAttribute("data-cenario", cenario);
    await expect(page.locator(".agendamento-confirmacao")).toHaveAttribute("data-visual", visual);
    await expect(page.getByRole("heading", { name: "Obrigado!" })).toBeVisible();
    await expect(page.locator(".confirmacao-linha")).toHaveCount(3);
    const medicao = await page.evaluate(() => {
      const root = document.querySelector<HTMLElement>('[data-testid="demo"]')!;
      const painel = document.querySelector<HTMLElement>(".agendamento-confirmacao")!;
      const vars = getComputedStyle(root);
      const area = getComputedStyle(painel);
      return {
        corPublicada: vars.getPropertyValue("--chat-page").trim(),
        corAplicada: area.backgroundColor,
        largura: document.documentElement.scrollWidth,
        viewport: document.documentElement.clientWidth,
      };
    });
    expect(medicao.corPublicada).toBeTruthy();
    expect(medicao.corAplicada).not.toBe("rgba(0, 0, 0, 0)");
    expect(medicao.largura).toBeLessThanOrEqual(medicao.viewport + 1);
    fundos.add(medicao.corPublicada);
    await page.screenshot({
      path: `test-results/confirmacao/screenshots/${testInfo.project.name}-${cenario}.png`,
      fullPage: true,
    });
  }
  expect(fundos.size).toBeGreaterThanOrEqual(4);
});

test("cancelamento preserva estado e a opção de reservar novamente", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await page.getByTestId("cancelar-fake").click();
  await expect(page.getByRole("heading", { name: "Agendamento cancelado" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Adicionar à agenda" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Escolher outro horário" })).toBeVisible();
  await page.getByRole("button", { name: "Escolher outro horário" }).click();
  await expect(page.getByTestId("gestao")).toHaveText("novo");
});

test("redução de movimento e fechar pelo cabeçalho continuam operacionais", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.locator(".confirmacao-visto")).toBeVisible();
  const movimento = await page.locator(".confirmacao-visto").evaluate((node) => getComputedStyle(node).animationName);
  expect(movimento).toBe("none");
  await page.getByRole("button", { name: "Mais opções" }).click();
  await expect(page.getByRole("button", { name: "Cancelar agendamento" })).toBeVisible();
  await page.getByRole("button", { name: "Fechar confirmação" }).click();
  await expect(page.getByTestId("gestao")).toHaveText("fechar");
});
