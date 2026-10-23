import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { MENSAGEM_DE_COMPARTILHAR } from "./DrawerDestaques";

const fonte = readFileSync(resolve(__dirname, "DrawerDestaques.tsx"), "utf8");

describe("cartão Sua Página do menu lateral (Figaro: onOpenSuaPagina)", () => {
  it("abre o Personalizar Página e fecha o menu, não a página pública", () => {
    expect(fonte).toMatch(/to="\/barbeiro\/marca"\s+onClick=\{fechar\}/);
    expect(fonte).not.toContain('to="/b/$slug"');
  });

  it("compartilha o link da página com a mensagem do Figaro, sem abrir nada", () => {
    expect(MENSAGEM_DE_COMPARTILHAR).toBe("Dê uma olhada na nossa página!");
    expect(fonte).toMatch(
      /navigator\.share\(\{[^}]*text: MENSAGEM_DE_COMPARTILHAR[^}]*url[^}]*\}\)/,
    );
    expect(fonte).toContain("/b/${slug}");
  });
});
