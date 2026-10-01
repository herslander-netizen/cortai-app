import { describe, expect, it, vi } from "vitest";

import { acharValidador, ENTRADAS, exigirFormaDoAtendente } from "./ia/entradas-da-api";
import { rotearConexaoMeta, type ConexaoMeta } from "./whatsapp/roteamento-meta";
import { concluirSubstituicao } from "./substituicao.server";
import { horariosDisponiveis, motivoForaDoHorario } from "./disponibilidade";
import {
  FUSOS_DA_BARBEARIA,
  horarioDoDia,
  normalizarFuso,
  type HorarioDeFuncionamento,
} from "./horarios";

const motivoForaDoHorarioWrapper = (iso: string, dur: number, h: HorarioDeFuncionamento[]) =>
  motivoForaDoHorario(Date.parse(iso), dur, h, "America/Sao_Paulo");

describe("sem horário cadastrado", () => {
  it("dia sem linha é FECHADO", () => {
    expect(horarioDoDia("2026-10-01", []).fechado).toBe(true);
    expect(horarioDoDia("2026-10-01", null).fechado).toBe(true);
  });
  it("não oferece horários", () => {
    const r = horariosDisponiveis({
      dia: "2026-10-01",
      servico: { id: "s", duracao_min: 30 },
      profissionais: [{ id: "a" }],
      escolhido: "qualquer",
      horarios: [],
      fuso: "America/Sao_Paulo",
      ocupados: [],
      regras: { antecedenciaMin: 0, intervaloEntreMin: 0 },
      agora: Date.parse("2026-09-30T00:00:00Z"),
    });
    expect(r).toEqual({ fechado: true, opcoes: [] });
  });
  it("fecha depois da meia-noite", () => {
    const horarios = [{ diaSemana: 4, fechado: false, abre: "20:00", fecha: "02:00" }];
    const r = horariosDisponiveis({
      dia: "2026-10-01",
      servico: { id: "s", duracao_min: 30 },
      profissionais: [{ id: "a" }],
      escolhido: "a",
      horarios,
      fuso: "America/Sao_Paulo",
      ocupados: [],
      regras: { antecedenciaMin: 0, intervaloEntreMin: 0 },
      agora: Date.parse("2026-09-30T00:00:00Z"),
    });
    expect(r.opcoes.at(-1)?.iso).toBe("2026-10-02T04:30:00.000Z"); // 01:30 do dia 2 em Brasília
    expect(motivoForaDoHorarioWrapper("2026-10-02T04:30:00.000Z", 30, horarios)).toBeNull();
    expect(motivoForaDoHorarioWrapper("2026-10-02T05:00:00.000Z", 30, horarios)).not.toBeNull();
  });
});

describe("fusos", () => {
  it("inclui Campo Grande e Maceió, sem rótulo duplicado", () => {
    expect(normalizarFuso("America/Campo_Grande")).toBe("America/Campo_Grande");
    expect(normalizarFuso("America/Maceio")).toBe("America/Maceio");
    const rotulos = FUSOS_DA_BARBEARIA.map((f) => f.rotulo);
    expect(new Set(rotulos).size).toBe(rotulos.length);
    expect(rotulos.filter((r) => r.includes("Mato Grosso (")).length).toBe(1);
  });
});

describe("roteamento do webhook da Meta", () => {
  const a: ConexaoMeta = { id: "1", tenant_id: "ta", sessao_id: "sa", meta_phone_number_id: "111" };
  const b: ConexaoMeta = { id: "2", tenant_id: "tb", sessao_id: "sb", meta_phone_number_id: "222" };
  it("escolhe pelo phone_number_id", () => {
    const r = rotearConexaoMeta([a, b], "222");
    expect(r.tipo === "ok" && r.conexao.tenant_id).toBe("tb");
  });
  it("número desconhecido vira erro", () => {
    expect(rotearConexaoMeta([a, b], "999").tipo).toBe("erro");
  });
  it("sem identificador: várias conexões viram número compartilhado, nunca descarte", () => {
    expect(rotearConexaoMeta([a], null).tipo).toBe("ok");
    const r = rotearConexaoMeta([a, b], null);
    expect(r.tipo === "ok" && r.compartilhada).toBe(true);
  });
  it("aprende o número na conexão única ainda sem número", () => {
    const r = rotearConexaoMeta([{ ...a, meta_phone_number_id: null }], "111");
    expect(r.tipo === "ok" && r.aprenderIds).toEqual(["1"]);
  });
});

describe("API do atendente", () => {
  const base = {
    clienteId: "00000000-0000-4000-8000-000000000001",
    profissionalId: "00000000-0000-4000-8000-000000000002",
    servicoId: "00000000-0000-4000-8000-000000000003",
    inicio: "2026-10-01T12:00:00-03:00",
  };
  it("fiado e crédito são recusados", () => {
    expect(ENTRADAS.criar_agendamento.safeParse({ ...base, formaPagamento: "fiado" }).success).toBe(
      false,
    );
    expect(
      ENTRADAS.criar_agendamento.safeParse({ ...base, formaPagamento: "credito" }).success,
    ).toBe(false);
    expect(ENTRADAS.criar_agendamento.safeParse({ ...base, formaPagamento: "pix" }).success).toBe(
      true,
    );
    expect(() => exigirFormaDoAtendente("fiado")).toThrow();
    expect(exigirFormaDoAtendente("balcao")).toBe("balcao");
  });
  it("ação desconhecida não é encontrada (inclui nomes do protótipo)", () => {
    expect(acharValidador("nao_existe")).toBeNull();
    expect(acharValidador("constructor")).toBeNull();
    expect(acharValidador("__proto__")).toBeNull();
    expect(acharValidador("toString")).toBeNull();
    expect(acharValidador("listar_servicos")).not.toBeNull();
  });
});

describe("rollback da substituição", () => {
  it("sucesso cancela só o antigo", async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null });
    await concluirSubstituicao({ rpc }, { novoId: "novo", antigoId: "antigo" });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("cancelar_agendamento", { _agendamento_id: "antigo" });
  });
  it("falha ao cancelar o antigo desfaz o novo e avisa", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({ error: { message: "agendamento ja encerrado" } })
      .mockResolvedValueOnce({ error: null });
    await expect(
      concluirSubstituicao({ rpc }, { novoId: "novo", antigoId: "antigo" }),
    ).rejects.toThrow(/anterior continua marcado/);
    expect(rpc).toHaveBeenLastCalledWith("cancelar_agendamento", { _agendamento_id: "novo" });
  });
});
