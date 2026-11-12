import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

import {
  encerrarOfertaTransacional,
  reservarOfertaTransacional,
  type DadosReservaDaFila,
  type ExecutarRpcDaFila,
} from "./fila-ofertas-transacional";

const ids = {
  tenant: "11111111-1111-4111-8111-111111111111",
  fila: "22222222-2222-4222-8222-222222222222",
  vaga: "33333333-3333-4333-8333-333333333333",
  prof: "44444444-4444-4444-8444-444444444444",
  servico: "55555555-5555-4555-8555-555555555555",
  oferta: "66666666-6666-4666-8666-666666666666",
};

const reserva: DadosReservaDaFila = {
  tenantId: ids.tenant,
  filaId: ids.fila,
  agendamentoLiberadoId: ids.vaga,
  profissionalId: ids.prof,
  servicoId: ids.servico,
  inicio: "2026-11-13T16:00:00.000Z",
  fim: "2026-11-13T16:30:00.000Z",
  expiraEm: "2026-11-13T15:30:00.000Z",
};

const executar = (data: unknown, error: { message?: string } | null = null) =>
  vi.fn(async () => ({ data, error })) as unknown as ExecutarRpcDaFila;

describe("contrato de transição transacional das ofertas", () => {
  it("reserva uma única entrada/vaga com identificadores e horários explícitos", async () => {
    const rpc = executar({ ok: true, oferta_id: ids.oferta, token: "a".repeat(36) });
    const resultado = await reservarOfertaTransacional(rpc, reserva);
    expect(resultado).toEqual({ ok: true, ofertaId: ids.oferta, token: "a".repeat(36) });
    expect(rpc).toHaveBeenCalledWith("reservar_oferta_da_fila", {
      _tenant_id: ids.tenant,
      _fila_id: ids.fila,
      _agendamento_liberado_id: ids.vaga,
      _profissional_id: ids.prof,
      _servico_id: ids.servico,
      _inicio: reserva.inicio,
      _fim: reserva.fim,
      _expira_em: reserva.expiraEm,
    });
  });

  it("permite recusar elegibilidade na mesma transação sem interpretar como sucesso", async () => {
    const rpc = executar({ ok: false, motivo: "entrada_indisponivel" });
    await expect(reservarOfertaTransacional(rpc, reserva)).resolves.toEqual({
      ok: false, motivo: "entrada_indisponivel",
    });
  });

  it("bloqueia antes do envio IDs e intervalos inválidos", async () => {
    const rpc = executar({ ok: true });
    await expect(reservarOfertaTransacional(rpc, { ...reserva, tenantId: "outro" }))
      .rejects.toThrow("Identificador inválido");
    await expect(reservarOfertaTransacional(rpc, { ...reserva, expiraEm: reserva.inicio }))
      .rejects.toThrow("Intervalo inválido");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("não afirma reserva quando o Supabase falha ou devolve resposta inesperada", async () => {
    await expect(reservarOfertaTransacional(executar(null, { message: "indisponível" }), reserva))
      .rejects.toThrow("Não foi possível reservar");
    await expect(reservarOfertaTransacional(executar({ ok: true, oferta_id: "inválido", token: "abc" }), reserva))
      .rejects.toThrow("Identificador inválido");
    await expect(reservarOfertaTransacional(executar({ ok: true }), reserva))
      .rejects.toThrow("Resposta inválida");
  });

  it("encerra apenas a oferta do tenant com um estado final permitido", async () => {
    const rpc = executar({
      ok: true, liberou_fila: true, agendamento_liberado_id: ids.vaga,
    });
    const resultado = await encerrarOfertaTransacional(rpc, {
      tenantId: ids.tenant, ofertaId: ids.oferta, estado: "recusada",
    });
    expect(resultado).toEqual({
      ok: true, liberouFila: true, agendamentoLiberadoId: ids.vaga,
    });
    expect(rpc).toHaveBeenCalledWith("encerrar_oferta_da_fila", {
      _tenant_id: ids.tenant, _oferta_id: ids.oferta, _novo_status: "recusada",
    });
  });

  it("recusa cancelamento de oferta já aceita e não trata erro de DB como concluído", async () => {
    await expect(encerrarOfertaTransacional(
      executar({ ok: false, motivo: "oferta_inativa" }),
      { tenantId: ids.tenant, ofertaId: ids.oferta, estado: "cancelada" },
    )).resolves.toEqual({ ok: false, motivo: "oferta_inativa" });
    await expect(encerrarOfertaTransacional(
      executar(null, { message: "falhou" }),
      { tenantId: ids.tenant, ofertaId: ids.oferta, estado: "cancelada" },
    )).rejects.toThrow("Não foi possível encerrar");
  });
});

describe("motor da fila — não reintroduzir gravações não atômicas", () => {
  const fonte = readFileSync("src/lib/whatsapp/fila-ofertas.server.ts", "utf8");

  it("reserva uma entrada e cria sua oferta por uma só RPC", () => {
    expect(fonte).toContain("await reservarOfertaTransacional(");
    expect(fonte).not.toMatch(/\.from\("fila_de_espera"\)\s*\.update\(/);
    expect(fonte).not.toMatch(/\.from\("ofertas_da_fila"\)\s*\.insert\(/);
  });

  it("recusa, cancelamento e cron usam o mesmo contrato de encerramento", () => {
    expect(fonte).toContain("export async function recusarOferta(");
    expect(fonte).toContain("export async function cancelarOfertasDaVaga(");
    expect(fonte).toContain("export async function processarListaDeEspera(");
    expect((fonte.match(/await encerrarOfertaTransacional\(/g) ?? []).length).toBeGreaterThanOrEqual(4);
    expect(fonte).not.toContain("liberarFilaDaOferta");
  });

  it("não afirma atendimento enviado enquanto entrega não foi verificada", () => {
    expect(fonte).toContain('entrega === "incerta"');
    expect(fonte).toContain("classificarImpedimentoDeOferta");
    expect(fonte).toContain("Vaga em preparação para a lista de espera");
  });
});

describe("proposta SQL — verificações estruturais antes de uma migração", () => {
  const sql = readFileSync("docs/sql/fila-ofertas-transacionais-proposta-2026-11-12.sql", "utf8");

  it("não contém definições duplicadas na proposta SQL", () => {
    for (const fn of [
      "reservar_oferta_da_fila",
      "encerrar_oferta_da_fila",
      "aceitar_oferta_da_fila",
      "retirar_entrada_da_fila",
      "converter_entrada_da_fila",
    ]) {
      expect(sql.split(`CREATE OR REPLACE FUNCTION public.${fn}(`)).toHaveLength(2);
    }
    expect(sql.split("COMMIT;")).toHaveLength(2);
  });

  it("revalida a janela de horário no banco e não mistura fila de chegada", () => {
    expect(sql).toContain("v_f.janela_preferida IS NULL");
    expect(sql).toContain("nao_e_lista_de_espera");
    expect(sql).toContain("v_inicio_local := _inicio AT TIME ZONE v_fuso");
    expect(sql).toContain("to_char(v_inicio_local, 'YYYY-MM-DD')");
    expect(sql).toContain("to_char(v_inicio_local, 'HH24:MI')");
    expect(sql).toContain("extract(hour FROM v_inicio_local)");
    expect(sql).toContain("janela_incompativel");
  });

  it("relaciona entrada à oferta, com um índice ativo por entrada", () => {
    expect(sql).toContain("oferta_atual_id uuid");
    expect(sql).toContain("ofertas_da_fila_uma_ativa_por_entrada");
    expect(sql).toContain("WHERE status = 'enviada'");
    expect(sql).toContain("FOREIGN KEY (oferta_atual_id)");
    expect(sql).toContain("RAISE EXCEPTION 'Fila tem mais de uma oferta ativa");
    expect(sql).toContain("cliente_indisponivel");
    expect(sql).toContain("profissional_invalido");
    expect(sql).toContain("servico_invalido");
    expect(sql).toContain("array_length(v_s.profissional_ids, 1)");
    expect(sql).toContain("EXCEPTION WHEN unique_violation");
    expect(sql).toContain("Mais de uma oferta ativa por vaga");
    expect(sql).toContain("Oferta ativa sem entrada no mesmo tenant");
    expect(sql).toContain("Oferta ativa sem vaga de origem");
    expect(sql).toContain("id = v_f.cliente_id AND tenant_id = _tenant_id");
  });

  it("cria transições atômicas e mantém o aceite protegido contra tokens antigos", () => {
    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.reservar_oferta_da_fila(");
    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.encerrar_oferta_da_fila(");
    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.aceitar_oferta_da_fila(_token text)");
    expect(sql).toContain("FOR UPDATE");
    expect(sql).toContain("v_f.oferta_atual_id IS DISTINCT FROM v_o.id");
    expect(sql).toContain("AND oferta_atual_id = v_o.id");
    expect(sql).toContain("pg_advisory_xact_lock(hashtextextended('agenda:'");
    expect(sql).toContain("a.status IN ('agendado', 'chegou', 'na_cadeira', 'finalizado')");
    expect(sql).toContain("RETURN jsonb_build_object('ok', false, 'motivo', 'ocupada')");
  });

  it("remove uma entrada e oferta no mesmo commit, preservando a fila de chegada", () => {
    expect(sql).toContain("FUNCTION public.retirar_entrada_da_fila(");
    expect(sql).toContain("v_f.oferta_atual_id IS DISTINCT FROM v_oferta_lida");
    expect(sql).toContain("WHERE id = v_oferta_lida AND tenant_id = _tenant_id FOR UPDATE");
    expect(sql).toContain("status = 'saiu', avisado_em = NULL, oferta_atual_id = NULL");
    expect(sql).toContain("v_f.status = 'avisado' AND v_f.janela_preferida IS NOT NULL");
    expect(sql).toContain("'motivo', 'concorrente'");
  });

  it("impede conversão enquanto existe oferta e grava o atendimento em uma só transação", () => {
    expect(sql).toContain("FUNCTION public.converter_entrada_da_fila(");
    expect(sql).toContain("v_f.oferta_atual_id IS NOT NULL");
    expect(sql).toContain("'motivo', 'oferta_pendente'");
    expect(sql).toContain("v_f.status <> 'aguardando' OR v_f.janela_preferida IS NULL");
    expect(sql).toContain("v_resultado := public.criar_agendamento(");
    expect(sql).toContain("SET origem = 'manual', origem_fila_id = v_f.id");
    expect(sql).toContain("status = 'atendido', avisado_em = NULL, oferta_atual_id = NULL");
  });

  it("restringe RPCs manuais de encerramento e conversão a service_role", () => {
    expect(sql).toContain("REVOKE EXECUTE ON FUNCTION public.retirar_entrada_da_fila(uuid,uuid)");
    expect(sql).toContain("REVOKE EXECUTE ON FUNCTION public.converter_entrada_da_fila(uuid,uuid,uuid,uuid,timestamptz)");
    expect(sql).toContain("GRANT EXECUTE ON FUNCTION public.retirar_entrada_da_fila(uuid,uuid)");
    expect(sql).toContain("GRANT EXECUTE ON FUNCTION public.converter_entrada_da_fila(uuid,uuid,uuid,uuid,timestamptz)");
  });

  it("fecha RPCs privilegiadas para anon e authenticated", () => {
    expect(sql).toContain("SECURITY DEFINER");
    expect(sql).toContain("IF NOT public.chamada_do_servidor()");
    expect(sql).toContain("FROM PUBLIC, anon, authenticated");
    expect(sql).toContain("TO service_role");
  });
});
