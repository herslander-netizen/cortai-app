import { describe, expect, it } from "vitest";
import {
  decidirExecucao,
  execucaoDiretaLigada,
  novasEvidencias,
  registrarEvidencia,
  type Evidencias,
} from "./execucao-direta";

const INICIO = "2026-10-12T15:00:00-03:00";
const dono = { canal: "painel", papel: "dono" } as const;
const prof = { canal: "painel", papel: "profissional", profissionalId: "pro-1" } as const;
const dados = { clienteId: "cli-1", servicoId: "srv-1", profissionalId: "pro-1", inicio: INICIO };

/** Evidências completas de um pedido bem resolvido. */
function resolvidas(): Evidencias {
  const ev = novasEvidencias();
  registrarEvidencia(
    ev,
    "buscar_cliente_por_nome",
    { nome: "Leandro" },
    { clientes: [{ id: "cli-1" }] },
  );
  registrarEvidencia(ev, "listar_servicos", {}, [{ id: "srv-1", nome: "Corte" }]);
  registrarEvidencia(
    ev,
    "consultar_disponibilidade",
    { servicoId: "srv-1", dia: "2026-10-12" },
    {
      livres: [{ profissionalId: "pro-1", inicio: INICIO }],
    },
  );
  return ev;
}
const decidir = (over: Partial<Parameters<typeof decidirExecucao>[0]> = {}) =>
  decidirExecucao({
    acao: "criar_agendamento",
    dados,
    ctx: dono,
    evidencias: resolvidas(),
    ligada: true,
    ...over,
  });

describe("execução direta — quando pode dispensar a confirmação", () => {
  it("tudo provado por consultas oficiais deste turno → direta", () => {
    expect(decidir()).toEqual({ direta: true });
  });

  it("compara o horário pelo instante, não pelo texto (fusos equivalentes)", () => {
    expect(decidir({ dados: { ...dados, inicio: "2026-10-12T18:00:00Z" } })).toEqual({
      direta: true,
    });
  });

  it("profissional agenda sempre para si, mesmo que o modelo mande outro id", () => {
    expect(decidir({ ctx: prof, dados: { ...dados, profissionalId: "outro" } })).toEqual({
      direta: true,
    });
  });

  it("dono precisa indicar o profissional", () => {
    const r = decidir({ dados: { ...dados, profissionalId: null } });
    expect(r.direta).toBe(false);
  });
});

describe("execução direta — tudo o que a impede (cai na confirmação)", () => {
  it.each([
    ["interruptor desligado", { ligada: false }],
    ["canal WhatsApp", { ctx: { canal: "whatsapp", papel: "dono" } }],
    ["canal site", { ctx: { canal: "site", papel: null } }],
    ["cliente no WhatsApp", { ctx: { canal: "whatsapp", papel: "cliente" } }],
    ["painel sem papel", { ctx: { canal: "painel", papel: null } }],
    ["ação que sempre confirma", { acao: "cancelar_agendamento" }],
    ["ação desconhecida", { acao: "qualquer_coisa" }],
  ] as const)("%s", (_nome, over) => {
    expect(decidir(over as never).direta).toBe(false);
  });

  it("cliente nunca consultado (id vindo do nada)", () => {
    expect(decidir({ evidencias: novasEvidencias() }).direta).toBe(false);
    expect(decidir({ dados: { ...dados, clienteId: "cli-inventado" } }).direta).toBe(false);
  });

  it("busca por nome com mais de um candidato nunca resolve o cliente", () => {
    const ev = novasEvidencias();
    registrarEvidencia(
      ev,
      "buscar_cliente_por_nome",
      { nome: "Leandro" },
      {
        clientes: [{ id: "cli-1" }, { id: "cli-2" }],
      },
    );
    registrarEvidencia(ev, "listar_servicos", {}, [{ id: "srv-1" }]);
    registrarEvidencia(
      ev,
      "consultar_disponibilidade",
      { servicoId: "srv-1" },
      {
        livres: [{ profissionalId: "pro-1", inicio: INICIO }],
      },
    );
    expect(ev.buscasAmbiguas).toBe(1);
    expect(decidir({ evidencias: ev }).direta).toBe(false);
  });

  it("serviço fora do catálogo consultado", () => {
    expect(decidir({ dados: { ...dados, servicoId: "srv-9" } }).direta).toBe(false);
  });

  it("horário que não veio da disponibilidade (inclusive 1 minuto de diferença)", () => {
    expect(decidir({ dados: { ...dados, inicio: "2026-10-12T15:01:00-03:00" } }).direta).toBe(
      false,
    );
    expect(decidir({ dados: { ...dados, inicio: "amanhã às 15h" } }).direta).toBe(false);
  });

  it("horário livre de OUTRO profissional não vale", () => {
    expect(decidir({ dados: { ...dados, profissionalId: "pro-2" } }).direta).toBe(false);
  });

  it("disponibilidade consultada para OUTRO serviço não prova nada (duração diferente)", () => {
    const ev = novasEvidencias();
    registrarEvidencia(ev, "buscar_cliente_por_nome", {}, { clientes: [{ id: "cli-1" }] });
    registrarEvidencia(ev, "listar_servicos", {}, [{ id: "srv-1" }, { id: "srv-2" }]);
    registrarEvidencia(
      ev,
      "consultar_disponibilidade",
      { servicoId: "srv-2" },
      {
        livres: [{ profissionalId: "pro-1", inicio: INICIO }],
      },
    );
    expect(decidir({ evidencias: ev }).direta).toBe(false);
    const semServico = novasEvidencias();
    registrarEvidencia(
      semServico,
      "consultar_disponibilidade",
      { servicoId: null },
      {
        livres: [{ profissionalId: "pro-1", inicio: INICIO }],
      },
    );
    expect(semServico.horarios[0]?.servicoId).toBeNull();
  });

  it("evidência é por turno: um novo objeto começa vazio", () => {
    expect(novasEvidencias().clientes.size).toBe(0);
  });
});

describe("interruptor CORTAI_EXECUCAO_DIRETA", () => {
  it("ligado por padrão; false/0/off/nao desligam", () => {
    expect(execucaoDiretaLigada({})).toBe(true);
    expect(execucaoDiretaLigada({ CORTAI_EXECUCAO_DIRETA: "true" })).toBe(true);
    for (const v of ["false", "0", "OFF", " nao "])
      expect(execucaoDiretaLigada({ CORTAI_EXECUCAO_DIRETA: v })).toBe(false);
  });
});

describe("registrarEvidencia ignora lixo", () => {
  it("resultados nulos ou malformados não quebram nem provam nada", () => {
    const ev = novasEvidencias();
    registrarEvidencia(ev, "buscar_cliente_por_nome", {}, null);
    registrarEvidencia(ev, "listar_servicos", {}, "texto");
    registrarEvidencia(
      ev,
      "consultar_disponibilidade",
      {},
      { livres: [{ profissionalId: 1, inicio: "x" }] },
    );
    expect(ev.clientes.size + ev.servicos.size + ev.horarios.length).toBe(0);
  });
});
