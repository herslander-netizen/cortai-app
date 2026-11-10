import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

/** Fluidez da troca lista ↔ linha do tempo (vídeo do dono, 06/11/2026). */
const troca = readFileSync("src/components/barbeiro/agenda/TrocaDeVisualizacao.tsx", "utf8");
const operacional = readFileSync("src/components/barbeiro/AgendaOperacional.tsx", "utf8");

describe("troca de visualização da Agenda", () => {
  it("nunca deixa as duas visualizações na tela ao mesmo tempo", () => {
    expect(troca).not.toContain('mode="popLayout"');
    expect(troca).toContain('mode="wait"');
    // Não precisa sair instantaneamente: mode="wait" continua garantindo exclusividade.
    expect(troca).toContain("duration: TEMPO.botaoSai");
    expect(troca).toContain("duration: TEMPO.conteudoEntra");
  });

  it("a faixa da semana abre e fecha só com transform/opacity (sem animar altura)", () => {
    const recolhe = troca.slice(troca.indexOf("export function RecolheNaLista"));
    expect(recolhe).not.toMatch(/height/);
  });

  it("o calendário do mês fecha ao trocar de visualização", () => {
    const inicio = operacional.indexOf("function alterarVisualizacao");
    const fim = operacional.indexOf("function alternarModoDiscreto", inicio);
    const funcao = operacional.slice(inicio, fim);
    expect(funcao).toContain("if (segura !== visualizacao) setCalAberto(false);");
  });
});
