import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const ficha = readFileSync("src/routes/barbeiro.equipe_.$userId.tsx", "utf8");
const editor = readFileSync("src/routes/barbeiro.equipe-data.$userId.tsx", "utf8");
const fonte = readFileSync("src/lib/horarios-especiais.functions.ts", "utf8");

describe("Equipe Figaroo — disponibilidade excepcional por data", () => {
  it("abre editor de data separado a partir da ficha do profissional", () => {
    expect(ficha).toContain('to="/barbeiro/equipe-data/$userId"');
    expect(editor).toContain('createFileRoute("/barbeiro/equipe-data/$userId")');
    expect(editor).toContain("getPerfilDoMembroParaEdicao");
  });

  it("grava para o profissional do vínculo real, nunca no negócio todo", () => {
    expect(editor).toContain("data: { dia, profissionalId, abre, fecha }");
    expect(editor).toContain("listarHorariosEspeciaisDoDia");
    expect(editor).toContain("horario.profissionalId === profissionalId");
    expect(fonte).toContain('.eq("tenant_id", tenantId)');
    expect(fonte).toContain("await exigirPermissao(context, tenantId,");
  });

  it("reutiliza o seletor Figaroo, rejeita dias passados e confirma remoção", () => {
    expect(editor).toContain("<SeletorDeHorario");
    expect(editor).not.toContain('type="time"');
    expect(editor).toContain("min={hoje}");
    expect(editor).toContain("horarioEspecialValido(abre, fecha)");
    expect(editor).toContain("const ok = await confirmar({");
    expect(editor).toContain("removerHorarioEspecial");
  });

  it("não grava ao selecionar uma data/horário e preserva a escala", () => {
    expect(editor).toContain("desabilitada: !podeSalvar");
    expect(editor).toContain("onClick: () => salvar.mutate()");
    expect(editor).toContain("A escala semanal continua preservada");
  });
});
