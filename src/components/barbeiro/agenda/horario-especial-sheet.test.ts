import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const fonte = readFileSync("src/components/barbeiro/agenda/HorarioEspecialSheet.tsx", "utf8");

describe("HorarioEspecialSheet", () => {
  it("valida o horário com a mesma regra do servidor", () => {
    // Uma expressão própria com `\\d` recusava qualquer horário e deixava o botão de salvar sempre travado.
    expect(fonte).toContain("horarioEspecialValido(abre, fecha)");
    expect(fonte).not.toMatch(/\/\^\(\[01\]\\\\d/);
  });

  it("pede confirmação antes de remover", () => {
    expect(fonte).toContain("Remover este horário especial?");
    expect(fonte).toContain("Esta ação não pode ser desfeita");
  });
});
