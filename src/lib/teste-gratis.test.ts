import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { PLANOS_COMERCIAIS } from "@/lib/planos-comerciais";
import {
  DIAS_DE_TESTE,
  datasDoNovoTeste,
  deveRebaixar,
  diasRestantesDoTeste,
  faixaDoLimite,
  planoEfetivo,
  precoAnual,
} from "@/lib/teste-gratis";

const agora = new Date("2026-10-02T12:00:00Z");

describe("teste grátis", () => {
  it("dura 45 dias para qualquer plano", () => {
    const { inicio, fim } = datasDoNovoTeste(agora);
    expect(DIAS_DE_TESTE).toBe(45);
    expect(diasRestantesDoTeste(fim, new Date(inicio))).toBe(45);
  });

  it("libera o Studio durante o teste", () => {
    const { fim } = datasDoNovoTeste(agora);
    expect(planoEfetivo({ status: "teste", testeFim: fim, plano: "essencial" }, agora)).toBe(
      "studio",
    );
  });

  it("rebaixa para o Essencial quando o teste vence", () => {
    const vencido = { status: "teste", testeFim: "2026-10-01T00:00:00Z", plano: "essencial" };
    expect(deveRebaixar(vencido, agora)).toBe(true);
    expect(planoEfetivo(vencido, agora)).toBe("essencial");
  });

  it("avisa em 80% e pausa em 100% da cota", () => {
    expect(faixaDoLimite(479)).toBe("livre");
    expect(faixaDoLimite(480)).toBe("aviso");
    expect(faixaDoLimite(600)).toBe("pausado");
  });

  it("anual tem 20% de desconto", () => {
    expect(precoAnual(3990)).toBe(38304);
  });

  it("vitrine tem 3 planos e não cobra por profissional", () => {
    expect(PLANOS_COMERCIAIS.map((p) => p.chave)).toEqual(["essencial", "conecta", "studio"]);
    const tabela = readFileSync("src/components/planos/TabelaDePlanos.tsx", "utf8");
    const textos = readFileSync("src/lib/apresentacao-conteudo.ts", "utf8");
    expect(tabela + textos).not.toMatch(/por profissional\/mês|mensais por profissional/);
  });
});
