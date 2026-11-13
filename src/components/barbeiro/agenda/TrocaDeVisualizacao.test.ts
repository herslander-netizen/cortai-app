import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

/** Fluidez da troca lista ↔ linha do tempo (vídeo do dono, 06/11/2026). */
const troca = readFileSync("src/components/barbeiro/agenda/TrocaDeVisualizacao.tsx", "utf8");
const operacional = readFileSync("src/components/barbeiro/AgendaOperacional.tsx", "utf8");
const estilos = readFileSync("src/components/barbeiro/agenda/TrocaDeVisualizacao.css", "utf8");

describe("troca de visualização da Agenda", () => {
  it("mantém as duas animações simultâneas, como no Flow oficial", () => {
    expect(troca).toContain('mode="popLayout"');
    expect(troca).not.toContain('mode="wait"');
    expect(troca).toContain("duration: 0.28, ease: SUAVE");
  });

  it("usa keyframes nativos para o painel com os mesmos deslocamentos e duração", () => {
    expect(troca).toContain("usePresence()");
    expect(troca).toContain('mode="popLayout"');
    expect(troca).toContain("onAnimationEnd={aoConcluirAnimacao}");
    expect(troca).toContain('evento.animationName === "agenda-visao-sair"');
    expect(troca).toContain("aria-hidden={!presente}");
    expect(troca).toContain("inert={!presente}");
    expect(troca).not.toContain("setEntradaConcluida");
    expect(troca).toContain(": animarEntrada");
    expect(estilos).toContain("translate3d(0, 28px, 0)");
    expect(estilos).toContain("translate3d(0, -20px, 0)");
    expect(estilos).toContain("280ms cubic-bezier(0.22, 1, 0.36, 1)");
    expect(estilos).toContain("prefers-reduced-motion: reduce");
    expect(troca).not.toContain("y: 28");
    expect(troca).not.toContain("y: -20");
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
