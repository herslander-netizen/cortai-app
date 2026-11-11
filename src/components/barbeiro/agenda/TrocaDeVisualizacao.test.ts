import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

/** Fluidez da troca lista ↔ linha do tempo (vídeo do dono, 06/11/2026). */
const troca = readFileSync("src/components/barbeiro/agenda/TrocaDeVisualizacao.tsx", "utf8");
const operacional = readFileSync("src/components/barbeiro/AgendaOperacional.tsx", "utf8");

describe("troca de visualização da Agenda", () => {
  it("mantém as duas animações simultâneas, como no Flow oficial", () => {
    expect(troca).toContain('mode="popLayout"');
    expect(troca).not.toContain('mode="wait"');
    expect(troca).toContain("duration: 0.28, ease: SUAVE");
  });

  it("recolhe e expande a altura da semana sem prender a navegação", () => {
    const recolhe = troca.slice(troca.indexOf("export function RecolheNaLista"));
    expect(recolhe).toContain('height: 0, opacity: 0, overflow: "hidden"');
    expect(recolhe).toContain('height: "auto", opacity: 1');
    expect(recolhe).toContain('transitionEnd: { overflow: "visible" }');
  });

  it("o calendário do mês fecha ao trocar de visualização", () => {
    const inicio = operacional.indexOf("function alterarVisualizacao");
    const fim = operacional.indexOf("function alternarModoDiscreto", inicio);
    const funcao = operacional.slice(inicio, fim);
    expect(funcao).toContain("if (segura !== visualizacao) setCalAberto(false);");
  });
});
