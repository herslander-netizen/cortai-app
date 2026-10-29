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
