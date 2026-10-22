import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("tema do aplicativo no carregamento", () => {
  it("só aplica a identidade da sessão depois que a sessão chega (sem piscar em Padrão)", () => {
    const fonte = readFileSync("src/components/layout/ManagementDrawer.tsx", "utf8");
    expect(fonte).toContain("if (sessao) aplicarIdentidade(identidadeValida(sessao.identidadeApp));");
    expect(fonte).not.toContain("aplicarIdentidade(identidadeValida(sessao?.identidadeApp))");
  });
});
