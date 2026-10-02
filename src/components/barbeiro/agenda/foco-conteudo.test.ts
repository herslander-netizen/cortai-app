import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("conteúdo protegido do Modo Foco", () => {
  it("não monta sino, Ao vivo, fila ou faturamento", () => {
    const fonte = fs.readFileSync(
      path.resolve(process.cwd(), "src/components/barbeiro/AgendaFocoMobile.tsx"),
      "utf8",
    );
    expect(fonte).not.toContain("<SinoDeAvisos");
    expect(fonte).not.toContain('"Ao vivo"');
    expect(fonte).not.toContain("modo-foco-alertas");
    expect(fonte).not.toContain("resumo.faturado");
  });
});
