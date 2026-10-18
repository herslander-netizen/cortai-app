import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const tela = readFileSync("src/components/barbeiro/agenda/TelaReagendar.tsx", "utf8");
const ficha = readFileSync("src/components/barbeiro/agenda/PainelAtendimento.tsx", "utf8");
const servidor = readFileSync("src/lib/barbeiro.functions.ts", "utf8");

describe("ficha e Reagendar como no Figaro", () => {
  it("a ficha tem o rodapé Reagendar com a seta das outras ações", () => {
    expect(ficha).toContain("agenda-ficha-reagendar");
    expect(ficha).toContain('aria-label={maisAcoes ? "Fechar outras ações" : "Outras ações"}');
    expect(ficha).toContain("Cancelar agendamento");
    expect(ficha).toContain("Marcar falta");
    expect(ficha).toContain("<TelaReagendar");
  });

  it("a ficha mantém as ações do atendimento", () => {
    for (const texto of ["Cliente chegou", "Começar", "Finalizar e cobrar", "Notas", "Cobrar"])
      expect(ficha).toContain(texto);
  });

  it("Reagendar tem calendário, disponibilidade, manual e Salvar flutuante", () => {
    expect(tela).toContain("Por disponibilidade");
    expect(tela).toContain('"Manual"');
    expect(tela).toContain("agenda-reagendar-salvar");
    expect(tela).toContain("getHorariosParaRemarcar");
    expect(tela).toContain("disabled={d < hoje}");
  });

  it("a leitura de horários usa o motor único e não grava nada", () => {
    const fn = servidor.slice(servidor.indexOf("export const getHorariosParaRemarcar"));
    const corpo = fn.slice(0, fn.indexOf("export const getContagemDoMes"));
    expect(corpo).toContain("horariosDisponiveis(");
    expect(corpo).toContain('exigirPermissao(context, tenant.id, "agendamento_manual")');
    expect(corpo).toContain('.neq("id", atual.id)');
    expect(corpo).not.toMatch(/\.(update|insert|delete)\(/);
  });
});
