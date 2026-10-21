import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { itensDoDiaADiaNoMenuMovel } from "./navegacao-barbeiro";

describe("navegação móvel", () => {
  it("leva os antigos atalhos para Dia a dia e mantém a Agenda primeiro", () => {
    const itens = itensDoDiaADiaNoMenuMovel([
      "criar_agendamento",
      "visualizar_clientes",
      "visualizar_financeiro",
    ]);
    expect(itens[0]?.to).toBe("/barbeiro");
    expect(itens.map((item) => item.to)).toEqual(
      expect.arrayContaining([
        "/barbeiro",
        "/barbeiro/clientes",
        "/barbeiro/caixa",
        "/barbeiro/fila",
      ]),
    );
  });

  it("não renderiza mais a barra inferior", () => {
    const fonte = readFileSync("src/components/layout/NavegacaoEquipe.tsx", "utf8");
    expect(fonte).not.toContain("equipe-barra");
  });

  it("mantém o drawer operacional e move itens secundários para Ajustes", () => {
    const drawer = readFileSync("src/components/layout/ManagementDrawer.tsx", "utf8");
    const ajustes = readFileSync("src/components/layout/DrawerAjustes.tsx", "utf8");
    expect(drawer).not.toContain('titulo: "Sistema"');
    expect(drawer).not.toContain("ModeMenuItem");
    expect(drawer).toContain("DrawerDestaques");
    expect(drawer).toContain("saudacao.titulo");
    expect(ajustes).toContain("Conta e negócio");
    expect(ajustes).toContain("Plano");
    expect(ajustes).toContain("Aparência do aplicativo");
    expect(ajustes).toContain("Sua Página");
    expect(ajustes).toContain('to: "/barbeiro/sua-pagina"');
    const pagina = readFileSync("src/routes/barbeiro.sua-pagina.tsx", "utf8");
    const layoutTema = readFileSync("src/routes/barbeiro.marca.layout-tema.tsx", "utf8");
    expect(pagina).toContain('to="/barbeiro/marca/layout-tema"');
    expect(layoutTema).toContain('title="Layout & Tema"');
    expect(layoutTema).toContain('to: "/barbeiro/marca"');
    const secoes = readFileSync("src/components/marca/editor/SecaoConteudo.tsx", "utf8");
    const editorSecao = readFileSync("src/routes/barbeiro.marca.secao.$secao.tsx", "utf8");
    expect(secoes).toContain('to="/barbeiro/marca/secao/$secao"');
    expect(editorSecao).toContain('title={`Editar ${NOMES_SECOES[secao]}`}');
    expect(ajustes).not.toContain('hash={item.label === "Avisos e notificações" ? "avisos" : undefined}');
    expect(ajustes).toContain("Avisos e notificações");
    expect(ajustes).toContain("Ajuda e suporte");
    expect(ajustes).toContain("Sair da conta");
  });

  it("promove Agenda ao primeiro destaque fora dos grupos", () => {
    const destaques = readFileSync("src/components/layout/DrawerDestaques.tsx", "utf8");
    const drawer = readFileSync("src/components/layout/ManagementDrawer.tsx", "utf8");
    expect(destaques).toContain('to="/barbeiro"');
    expect(destaques).toContain("Agenda");
    expect(drawer).toContain('item.to !== "/barbeiro"');
  });
});
