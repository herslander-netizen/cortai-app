import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const ID = "00000000-0000-4000-8000-000000000001";
const RAIZ = "test-results/central/screenshots";
async function abrirConversa(page: import("@playwright/test").Page) {
  await page.getByRole("list", { name: "Conversas encontradas" }).getByRole("button").first().click();
  await expect(page.getByRole("log", { name: "Mensagens da conversa" })).toBeVisible();
}
async function confirmar(page: import("@playwright/test").Page) {
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.getByRole("alertdialog").getByRole("button", { name: "Confirmar" }).click();
  await expect(page.getByRole("alertdialog")).toBeHidden();
}

test("lista e filtros exibem os cinco estados sem corte horizontal", async ({ page }, testInfo) => {
  const erros: string[] = [];
  page.on("pageerror", e => erros.push(e.message));
  await mkdir(RAIZ, { recursive: true });
  await page.goto("/?perfil=gestor", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "Central de Atendimento" })).toBeVisible();
  const lista = page.getByRole("list", { name: "Conversas encontradas" });
  await expect(lista.locator("li")).toHaveCount(5);
  await expect(lista.getByText("Maria Clara de Albuquerque Cardoso da Silva")).toBeVisible();
  await expect(lista.getByText("Gostaria de saber se há horário amanhã", { exact: false })).toBeVisible();

  const filtro = page.getByRole("group", { name: "Filtrar conversas por situação" });
  for (const estado of ["Nova", "IA atendendo", "Aguardando cliente", "Atendimento humano", "Resolvida"]) {
    await filtro.getByRole("button", { name: estado, exact: true }).click();
    await expect(lista.locator("li")).toHaveCount(1);
  }
  await filtro.getByRole("button", { name: "Todas" }).click();
  if (testInfo.project.name === "desktop-1280") {
    // No desktop, os seis filtros ficam acessíveis sem item cortado.
    const largura = await filtro.evaluate(el => ({
      conteudo: el.scrollWidth,
      visivel: el.clientWidth,
    }));
    expect(largura.conteudo).toBeLessThanOrEqual(largura.visivel + 1);
  }
  await page.getByRole("textbox", { name: "Buscar conversa por nome ou final do telefone" }).fill("0055");
  await expect(lista.locator("li")).toHaveCount(1);
  await expect(lista.getByText("Beatriz Andrade")).toBeVisible();
  await page.getByRole("textbox", { name: "Buscar conversa por nome ou final do telefone" }).fill("");

  const medidas = await page.evaluate(() => ({
    largura: document.documentElement.scrollWidth,
    viewport: document.documentElement.clientWidth,
    larguraDoCartao: document.querySelector('[aria-pressed="false"]')?.getBoundingClientRect().width,
  }));
  expect(medidas.largura).toBeLessThanOrEqual(medidas.viewport + 1);
  await page.screenshot({ path: `${RAIZ}/${testInfo.project.name}-lista.png`, fullPage: true });
  expect(erros).toEqual([]);
});

test("detalhe mostra histórico, origem e agenda; voltar funciona em Android", async ({ page }, testInfo) => {
  await mkdir(RAIZ, { recursive: true });
  await page.goto("/?perfil=gestor", { waitUntil: "networkidle" });
  await abrirConversa(page);
  await expect(page.getByText("Corte e hidratação")).toBeVisible();
  await expect(page.getByRole("log", { name: "Mensagens da conversa" }).getByText("Automação do Flow")).toBeVisible();
  await expect(page.getByRole("log", { name: "Mensagens da conversa" }).getByText("Cliente").first()).toBeVisible();
  const cores = await page.getByRole("log", { name: "Mensagens da conversa" })
    .locator(":scope > div > div")
    .evaluateAll(el => el.slice(0, 2).map(node => getComputedStyle(node).backgroundColor));
  // Cliente e automação nunca devem parecer a mesma bolha.
  expect(cores).toHaveLength(2);
  expect(cores[0]).not.toBe(cores[1]);
  await page.screenshot({ path: `${RAIZ}/${testInfo.project.name}-detalhe.png`, fullPage: true });

  if (testInfo.project.name.startsWith("android-")) {
    const voltar = page.getByRole("button", { name: "Voltar às conversas" });
    await expect(voltar).toBeVisible();
    await voltar.click();
    await expect(page.getByRole("list", { name: "Conversas encontradas" })).toBeVisible();
  }
  const largura = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(largura).toBeLessThanOrEqual(1);
});

test("Assumir, Resolver e Liberar IA exigem confirmação e atualizam o estado", async ({ page }, testInfo) => {
  await mkdir(RAIZ, { recursive: true });
  await page.goto("/?perfil=gestor", { waitUntil: "networkidle" });
  await abrirConversa(page);
  await page.getByRole("button", { name: "Assumir", exact: true }).click();
  await expect(page.getByRole("alertdialog")).toContainText("Assumir esta conversa?");
  await confirmar(page);
  await expect(page.locator("header").getByText("Atendimento humano")).toBeVisible();
  await expect.poll(() => page.evaluate((id) => window.__centralQa?.conversa(id)?.estado, ID))
    .toBe("atendimento_humano");

  await page.getByRole("button", { name: "Resolver", exact: true }).click();
  await confirmar(page);
  await expect(page.locator("header").getByText("Resolvida")).toBeVisible();
  await expect.poll(() => page.evaluate((id) => window.__centralQa?.conversa(id)?.estado, ID))
    .toBe("resolvida");
  await page.screenshot({ path: `${RAIZ}/${testInfo.project.name}-resolvida.png`, fullPage: true });

  await page.getByRole("button", { name: "Liberar IA", exact: true }).click();
  await confirmar(page);
  await expect(page.locator("header").getByText("IA atendendo")).toBeVisible();
  await expect.poll(() => page.evaluate((id) => window.__centralQa?.conversa(id)?.estado, ID))
    .toBe("ia_atendendo");
});

test("profissional pode assumir mas não resolver; perfil leitura não pode mudar nada", async ({ page }) => {
  await page.goto("/?perfil=profissional", { waitUntil: "networkidle" });
  await abrirConversa(page);
  await expect(page.getByRole("button", { name: "Assumir", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Resolver", exact: true })).toHaveCount(0);
  await page.goto("/?perfil=leitura", { waitUntil: "networkidle" });
  await abrirConversa(page);
  await expect(page.getByText("Seu acesso é somente para consulta.", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Assumir", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Liberar IA", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Resolver", exact: true })).toHaveCount(0);
});

test("conflito entre dois aparelhos não sobrescreve a conversa", async ({ page }) => {
  await page.goto("/?perfil=gestor", { waitUntil: "networkidle" });
  await abrirConversa(page);
  await page.getByRole("button", { name: "Assumir", exact: true }).click();
  await page.evaluate((id) => window.__centralQa?.provocarConflito(id), ID);
  await confirmar(page);
  await expect(page.getByRole("alert")).toContainText("A conversa mudou em outro dispositivo");
  await expect.poll(() => page.evaluate((id) => window.__centralQa?.conversa(id)?.estado, ID))
    .toBe("nova");
});
