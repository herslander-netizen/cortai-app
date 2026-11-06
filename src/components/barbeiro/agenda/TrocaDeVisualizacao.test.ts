import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

/** Fluidez da troca lista ↔ linha do tempo (vídeo do dono, 06/11/2026). */
const troca = readFileSync("src/components/barbeiro/agenda/TrocaDeVisualizacao.tsx", "utf8");
const operacional = readFileSync("src/components/barbeiro/AgendaOperacional.tsx", "utf8");

describe("troca de visualização da Agenda", () => {
  it("nunca deixa as duas visualizações na tela ao mesmo tempo", () => {
    expect(troca).not.toContain('mode="popLayout"');
    expect(troca).toContain('mode="wait"');
    expect(troca).toContain("exit={{ opacity: 1, transition: { duration: 0 } }}");
  });

  it("a faixa da semana abre e fecha só com transform/opacity (sem animar altura)", () => {
    const recolhe = troca.slice(troca.indexOf("export function RecolheNaLista"));
    expect(recolhe).not.toMatch(/height/);
  });

  it("o calendário do mês fecha ao trocar de visualização", () => {
    const funcao = operacional.slice(operacional.indexOf("function alterarVisualizacao"));
    expect(funcao.slice(0, 700)).toContain("if (segura !== visualizacao) setCalAberto(false);");
  });
});
