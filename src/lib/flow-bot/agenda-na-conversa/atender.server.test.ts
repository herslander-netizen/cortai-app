import { beforeEach, describe, expect, it, vi } from "vitest";

import type { EstadoDaAgenda } from "./conduzir";
import { MOTIVO_DEVOLVIDA, MOTIVO_EM_EXECUCAO, etapaPodeGravar } from "./trava";

/**
 * Trava por mensagem com banco falso: o índice único do rastro (conversa + mensagem) é simulado por
 * `reservadas`. O que importa: a reserva acontece ANTES de conduzir e só uma entrega executa.
 */
type Linha = Record<string, unknown>;
const banco = {
  reservadas: new Set<string>(),
  ordem: [] as string[],
  rastro: [] as Linha[],
  atualizados: [] as { tabela: string; linha: Linha }[],
  falhaAoReservar: false,
};

function consulta(tabela: string) {
  const q = {
    select: () => q,
    eq: () => q,
    maybeSingle: async () =>
      tabela === "conversas_whatsapp"
        ? { data: { modo_humano: false, modo_humano_ate: null }, error: null }
        : { data: null, error: null },
    insert: (linha: Linha) => ({
      select: () => ({
        single: async () => {
          if (tabela !== "flow_bot_rastro") return { data: { id: "x" }, error: null };
          banco.ordem.push(`rastro:${String(linha["motivo"])}`);
          if (banco.falhaAoReservar)
            return { data: null, error: { code: "08006", message: "fora" } };
          const chave = String(linha["mensagem_externa_id"]);
          if (banco.reservadas.has(chave))
            return { data: null, error: { code: "23505", message: "duplicada" } };
          banco.reservadas.add(chave);
          banco.rastro.push(linha);
          return { data: { id: `rastro-${banco.rastro.length}` }, error: null };
        },
      }),
    }),
    update: (linha: Linha) => {
      banco.atualizados.push({ tabela, linha });
      const u = {
        eq: () => u,
        select: async () => ({ data: [{ id: "c1" }], error: null }),
        then: (ok: (v: { error: null }) => unknown) => Promise.resolve({ error: null }).then(ok),
      };
      return u;
    },
  };
  return q;
}

const conduzir = vi.fn();
const enviar = vi.fn(async (_e: Linha) => undefined);
const ocorrencias = vi.fn(async (_o: Linha) => undefined);

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: { from: (tabela: string) => consulta(tabela) },
}));
vi.mock("./conduzir", () => ({
  conduzir: (...args: unknown[]) => conduzir(...args),
  estadoValido: (bruto: unknown) => bruto ?? null,
}));
vi.mock("./portas.server", () => ({ portasDoNegocio: async () => ({}) }));
vi.mock("@/lib/whatsapp/aprendizado.server", () => ({ registrarOcorrencia: ocorrencias }));
vi.mock("@/lib/whatsapp/fluxo.server", () => ({ enviarPelaBarbearia: enviar }));

const { atenderAgendaNaConversa } = await import("./atender.server");

function entrada(etapa: EstadoDaAgenda["etapa"] | null, id: string | null = "msg-1") {
  return {
    tenantId: "t1",
    conversaId: "c1",
    conexaoId: "x1",
    sessaoId: "s1",
    telefone: "5500000000001",
    texto: "sim",
    mensagemExternaId: id,
    conversa: { contexto: etapa ? { agenda: { etapa } } : {} },
    agora: Date.parse("2026-11-14T15:00:00Z"),
  };
}

const atualizacoesDoRastro = () =>
  banco.atualizados.filter((a) => a.tabela === "flow_bot_rastro").map((a) => a.linha);

beforeEach(() => {
  banco.reservadas.clear();
  banco.ordem = [];
  banco.rastro = [];
  banco.atualizados = [];
  banco.falhaAoReservar = false;
  conduzir.mockReset();
  conduzir.mockImplementation(async () => {
    banco.ordem.push("conduzir");
    return { textos: ["Agendado."], estado: null };
  });
  enviar.mockClear();
  ocorrencias.mockClear();
});

describe("trava por mensagem do agendamento na conversa", () => {
  it("só as etapas que gravam pedem trava", () => {
    expect(etapaPodeGravar("confirmar")).toBe(true);
    expect(etapaPodeGravar("minutos")).toBe(true);
    expect(etapaPodeGravar("servico")).toBe(false);
    expect(etapaPodeGravar(null)).toBe(false);
  });

  it('o "sim" reserva a mensagem ANTES de conduzir e depois guarda o resultado na mesma linha', async () => {
    expect(await atenderAgendaNaConversa(entrada("confirmar"))).toBe(true);
    expect(banco.ordem).toEqual([`rastro:${MOTIVO_EM_EXECUCAO}`, "conduzir"]);
    expect(banco.rastro).toHaveLength(1);
    expect(atualizacoesDoRastro()).toEqual([
      { motivo: "agenda:confirmar->fim", respostas: ["Agendado."] },
      { enviado: true },
    ]);
    expect(enviar).toHaveBeenCalledTimes(1);
  });

  it('segunda entrega do mesmo "sim" na janela da corrida: só uma executa e só uma responde', async () => {
    // A leitura prévia do rastro devolve "nada" nas duas (a janela em que o SELECT antigo deixava
    // as duas passarem); quem barra a segunda é o índice único, antes de conduzir.
    const a = await atenderAgendaNaConversa(entrada("confirmar"));
    const b = await atenderAgendaNaConversa(entrada("confirmar"));
    expect([a, b]).toEqual([true, true]);
    expect(conduzir).toHaveBeenCalledTimes(1);
    expect(enviar).toHaveBeenCalledTimes(1);
  });

  it("não conseguiu reservar: falha fechada, sem executar nem responder", async () => {
    banco.falhaAoReservar = true;
    expect(await atenderAgendaNaConversa(entrada("confirmar"))).toBe(true);
    expect(conduzir).not.toHaveBeenCalled();
    expect(enviar).not.toHaveBeenCalled();
  });

  it("reservou e a conversa saiu do fluxo sem gravar: devolve a linha para o bot assumir", async () => {
    conduzir.mockResolvedValue(null);
    expect(await atenderAgendaNaConversa(entrada("confirmar"))).toBeNull();
    expect(atualizacoesDoRastro()).toEqual([{ motivo: MOTIVO_DEVOLVIDA }]);
    conduzir.mockResolvedValue({ textos: [], estado: null });
    expect(await atenderAgendaNaConversa(entrada("minutos", "msg-2"))).toBeNull();
    expect(atualizacoesDoRastro().at(-1)).toEqual({ motivo: MOTIVO_DEVOLVIDA });
  });

  it("queda no meio da ação reservada: ninguém responde por cima e a equipe é avisada", async () => {
    conduzir.mockRejectedValue(new Error("banco caiu"));
    expect(await atenderAgendaNaConversa(entrada("confirmar"))).toBe(true);
    expect(enviar).not.toHaveBeenCalled();
    expect(ocorrencias).toHaveBeenCalledWith(expect.objectContaining({ motivo: "erro" }));
    expect(atualizacoesDoRastro()).toEqual([]);
  });

  it("etapa que não grava segue como antes: rastro só depois de conduzir", async () => {
    conduzir.mockImplementation(async () => {
      banco.ordem.push("conduzir");
      return { textos: ["Qual horário?"], estado: { etapa: "horario" } };
    });
    expect(await atenderAgendaNaConversa(entrada("servico"))).toBe(true);
    expect(banco.ordem).toEqual(["conduzir", "rastro:agenda:servico->horario"]);
    expect(enviar).toHaveBeenCalledTimes(1);
  });
});
