import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("leitura da marca com tema desconhecido", () => {
  it("coage o tema da coluna `tenants.tema` em vez de derrubar a Personalizar Página", () => {
    // A demonstração (Bella Rosa) grava "rose-creme", que é tema da página e não está nos 8 temas da marca;
    // sem a coerção o `marcaSchema.parse` lançava e a tela mostrava "Entre como responsável".
    const fonte = readFileSync("src/lib/marca.functions.ts", "utf8");
    expect(fonte).toContain('tema: temaConhecido(row.tema) ? row.tema : "cortai",');
    expect(fonte).not.toMatch(/\n\s+tema: row\.tema,/);
  });
});
