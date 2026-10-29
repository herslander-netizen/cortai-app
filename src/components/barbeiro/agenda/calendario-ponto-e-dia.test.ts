import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const semana = readFileSync("src/components/barbeiro/agenda/SemanaDoTopo.tsx", "utf8");
const operacional = readFileSync("src/components/barbeiro/AgendaOperacional.tsx", "utf8");

describe("calendário da Agenda como na captura do Figaro (dono, 29/10)", () => {
  it("pontinho na cor terciária do tema, 26 px abaixo do centro na semana e 12 px no mês", () => {
    expect(semana).toContain("bg-[var(--figaro-tertiary,var(--rosa))]");
    expect(semana).toContain('"absolute -bottom-[4.5px]"');
    expect(semana).toContain('"absolute bottom-[6px]"');
    expect(semana).not.toContain('"bg-rosa"');
  });

  it("escolher um dia não fecha o calendário", () => {
    const mudarDia = operacional.slice(
      operacional.indexOf("function mudarDia("),
      operacional.indexOf("const { agenda, online, aoVivo }"),
    );
    expect(mudarDia).toContain("setDia(proximo)");
    expect(mudarDia).not.toContain("setCalAberto(false)");
  });
});

describe("cores da tela da Agenda iguais às do Figaro (capturas do dono, 29/10)", () => {
  const css = readFileSync("src/styles.css", "utf8");
  const layout = readFileSync("src/routes/barbeiro.tsx", "utf8");
  it("fundo, texto e topo pelos tokens do Figaro; topo elevado só com rolagem ou mês aberto", () => {
    expect(css).toContain("--background: var(--figaro-background, var(--fundo));");
    expect(css).toContain("--paper: var(--figaro-on-surface, var(--texto));");
    expect(css).toContain("--agenda-topo: var(--figaro-surface-container, var(--ink2));");
    expect(layout).toContain('raiz.dataset["topoElevado"] = ""');
    expect(semana).toContain("text-[var(--figaro-hint,var(--mute))]");
  });
  it("linha da hora, tracejado e pontinhos no mesmo tom discreto", () => {
    expect(css).toContain("--agenda-traco: color-mix(in oklab, var(--figaro-hint, var(--mute2)) 20%, transparent);");
    expect(css).toMatch(/\.agenda-ponto-limite \{\s*background: var\(--agenda-traco/);
  });
});
