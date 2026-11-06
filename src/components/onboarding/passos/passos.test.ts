import { readFileSync, readdirSync } from "node:fs";

import { describe, expect, it } from "vitest";

/** Geral visual do Onboarding (dono, 06/11/2026: "algumas coisas estão feias"). */
const PASTA = "src/components/onboarding";
const arquivos = [
  "src/routes/barbeiro.configurar.tsx",
  `${PASTA}/useConfiguracaoInicial.ts`,
  `${PASTA}/useLogoELink.ts`,
  `${PASTA}/EditorDeHorarios.tsx`,
  `${PASTA}/DiaDoHorario.tsx`,
  ...readdirSync(`${PASTA}/passos`)
    .filter((f) => f.endsWith(".tsx"))
    .map((f) => `${PASTA}/passos/${f}`),
];

describe("onboarding no padrão Figaro", () => {
  it("cada arquivo tem até 300 linhas; sem tesoura, sem hora nativa, sem hex", () => {
    for (const f of arquivos) {
      const t = readFileSync(f, "utf8");
      expect(t.split("\n").length, f).toBeLessThanOrEqual(300);
      expect(t, f).not.toMatch(/Scissors|type="time"|#[0-9a-f]{6}\b/i);
    }
    expect(readFileSync(`${PASTA}/BoasVindasDoOnboarding.tsx`, "utf8")).not.toContain("Scissors");
  });

  it("horários com interruptor, chips e relógio; regras com chips e interruptor", () => {
    const dia = readFileSync(`${PASTA}/DiaDoHorario.tsx`, "utf8");
    expect(dia).toContain("<Switch");
    expect(dia).toContain("<Chip");
    expect(readFileSync(`${PASTA}/EditorDeHorarios.tsx`, "utf8")).toContain("<SeletorDeHorario");
    const regras = readFileSync(`${PASTA}/passos/PassoDasRegras.tsx`, "utf8");
    expect(regras).toContain("<Chip");
    expect(regras).toContain("<Switch");
  });

  it("modo de agendamento em opções conectadas e prévia que muda com a escolha", () => {
    const modo = readFileSync(`${PASTA}/passos/PassoDoModo.tsx`, "utf8");
    expect(modo).toContain("<OpcoesConectadas");
    expect(modo).toMatch(/modo === "conversa" \? \(\s*<PreviaDaConversa/);
    expect(modo).toContain("<PreviaTradicional />");
  });

  it("rodapé com voltar redondo e uma pílula principal, sem linha de separação", () => {
    const moldura = readFileSync(`${PASTA}/passos/MolduraDoPasso.tsx`, "utf8");
    expect(moldura).toContain('aria-label="Voltar ao passo anterior"');
    expect(moldura).not.toContain("border-t");
  });
});
