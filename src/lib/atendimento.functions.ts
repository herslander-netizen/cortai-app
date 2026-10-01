import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { exigirRecurso } from "@/lib/planos";
import { tenantIdDoMembro, exigirPermissao, type ContextoAutenticado } from "@/lib/tenant";

/**
 * Atendimento sem horário e fila de chegada.
 * A fila de chegada usa a mesma tabela da lista de espera, mas só as entradas
 * sem janela preferida (a janela identifica a lista de encaixe).
 * Nunca bloqueia atendimento por plano ou por sobreposição de horário.
 */

async function base(context: ContextoAutenticado) {
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const tenantId = await tenantIdDoMembro(context);
  const { data: meu } = await db
    .from("profissionais")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("user_id", context.userId)
    .eq("ativo", true)
    .maybeSingle();
  return { db, tenantId, meuProfissionalId: meu?.id ?? null };
}

type Db = Awaited<ReturnType<typeof base>>["db"];

async function profissionaisComSituacao(db: Db, tenantId: string) {
  const [profRes, ativosRes] = await Promise.all([
    db
      .from("profissionais")
      .select("id, nome")
      .eq("tenant_id", tenantId)
      .eq("ativo", true)
      .order("nome"),
    db
      .from("agendamentos")
      .select("profissional_id")
      .eq("tenant_id", tenantId)
      .eq("status", "na_cadeira"),
  ]);
  const ocupados = new Set((ativosRes.data ?? []).map((a) => a.profissional_id));
  return (profRes.data ?? []).map((p) => ({ id: p.id, nome: p.nome, livre: !ocupados.has(p.id) }));
}

export type ChegadaItem = {
  id: string;
  clienteId: string | null;
  cliente: string;
  servico: string | null;
  criadoEm: string;
};
export type OperacaoFila = {
  chegada: ChegadaItem[];
  profissionais: { id: string; nome: string; livre: boolean }[];
  meuProfissionalId: string | null;
  /** Configuração "Atendo clientes sem horário marcado". */
  filaDeChegadaAtiva: boolean;
};

export const getOperacaoFila = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<OperacaoFila> => {
    const { db, tenantId, meuProfissionalId } = await base(context);
    await exigirRecurso(db, tenantId, "fila_espera");
    await exigirPermissao(context, tenantId, "agendamento_manual");
    const { filaDeChegadaAtiva } = await import("@/lib/fila-chegada.server");
    const [filaRes, profissionais, ativa] = await Promise.all([
      db
        .from("fila_de_espera")
        .select("id, criado_em, cliente_id, clientes(nome), servicos(nome)")
        .eq("tenant_id", tenantId)
        .in("status", ["aguardando", "avisado"])
        .is("janela_preferida", null)
        .order("posicao")
        .order("criado_em"),
      profissionaisComSituacao(db, tenantId),
      filaDeChegadaAtiva(db, tenantId),
    ]);
    return {
      filaDeChegadaAtiva: ativa,
      chegada: (filaRes.data ?? []).map((f) => ({
        id: f.id,
        clienteId: f.cliente_id ?? null,
        cliente: f.clientes?.nome ?? "Cliente",
        servico: f.servicos?.nome ?? null,
        criadoEm: f.criado_em,
      })),
      profissionais,
      meuProfissionalId,
    };
  });

export type DadosAtendimentoRapido = {
  servicos: { id: string; nome: string; duracao_min: number }[];
  profissionais: { id: string; nome: string; livre: boolean }[];
  meuProfissionalId: string | null;
  servicoPadraoId: string | null;
  recentes: { id: string; nome: string; telefone: string }[];
};

export const getDadosAtendimentoRapido = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DadosAtendimentoRapido> => {
    const { db, tenantId, meuProfissionalId } = await base(context);
    await exigirPermissao(context, tenantId, "agendamento_manual");
    const desde = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    let historico = db
      .from("agendamentos")
      .select("servico_id, cliente_id, clientes(id, nome, telefone, arquivado_em)")
      .eq("tenant_id", tenantId)
      .gte("inicio", desde)
      .order("inicio", { ascending: false })
      .limit(300);
    if (meuProfissionalId) historico = historico.eq("profissional_id", meuProfissionalId);
    const [servRes, profissionais, histRes] = await Promise.all([
      db
        .from("servicos")
        .select("id, nome, duracao_min")
        .eq("tenant_id", tenantId)
        .eq("ativo", true)
        .order("ordem"),
      profissionaisComSituacao(db, tenantId),
      historico,
    ]);
    const servicos = servRes.data ?? [];
    const contagem = new Map<string, number>();
    const recentes: DadosAtendimentoRapido["recentes"] = [];
    const vistos = new Set<string>();
    for (const a of histRes.data ?? []) {
      if (a.servico_id) contagem.set(a.servico_id, (contagem.get(a.servico_id) ?? 0) + 1);
      const c = a.clientes;
      if (
        c &&
        !c.arquivado_em &&
        !vistos.has(c.id) &&
        c.telefone !== "avulso" &&
        recentes.length < 6
      ) {
        vistos.add(c.id);
        recentes.push({ id: c.id, nome: c.nome, telefone: c.telefone });
      }
    }
    const maisFeito = [...contagem.entries()]
      .sort((a, b) => b[1] - a[1])
      .find(([id]) => servicos.some((s) => s.id === id))?.[0];
    return {
      servicos,
      profissionais,
      meuProfissionalId,
      servicoPadraoId: maisFeito ?? servicos[0]?.id ?? null,
      recentes,
    };
  });

async function clienteAvulso(db: Db, tenantId: string) {
  const { data: existente } = await db
    .from("clientes")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("telefone", "avulso")
    .maybeSingle();
  if (existente) return existente.id;
  const { data, error } = await db
    .from("clientes")
    .insert({ tenant_id: tenantId, nome: "Cliente avulso", telefone: "avulso", origem: "balcao" })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

async function abrirNaCadeira(
  db: Db,
  tenantId: string,
  userId: string,
  clienteId: string,
  profissionalId: string,
  servicoId: string | null,
) {
  let duracao = 30;
  let preco = 0;
  if (servicoId) {
    const { data: s } = await db
      .from("servicos")
      .select("duracao_min, preco_centavos")
      .eq("id", servicoId)
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (!s) throw new Error("Serviço não encontrado neste negócio.");
    duracao = s.duracao_min;
    preco = s.preco_centavos;
  }
  const inicio = new Date();
  const { data, error } = await db
    .from("agendamentos")
    .insert({
      tenant_id: tenantId,
      cliente_id: clienteId,
      profissional_id: profissionalId,
      servico_id: servicoId,
      inicio: inicio.toISOString(),
      fim: new Date(inicio.getTime() + duracao * 60_000).toISOString(),
      status: "na_cadeira",
      forma_pagamento: "balcao",
      valor_centavos: preco,
      origem: "manual",
      // Cliente sem horário entrando agora pelo painel: encaixe proposital da equipe.
      encaixe: true,
      status_alterado_por: userId,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

async function profissionalValido(db: Db, tenantId: string, id: string) {
  const { data } = await db
    .from("profissionais")
    .select("id")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (!data) throw new Error("Profissional não encontrado neste negócio.");
  return data.id;
}

/** Cliente sem horário: entra direto Na cadeira. */
export const iniciarAtendimentoAgora = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { clienteId?: string | null; servicoId: string | null; profissionalId: string }) => data,
  )
  .handler(async ({ data, context }) => {
    const { db, tenantId } = await base(context);
    await exigirPermissao(context, tenantId, "agendamento_manual");
    const profissionalId = await profissionalValido(db, tenantId, data.profissionalId);
    let clienteId = data.clienteId ?? null;
    let nome = "Cliente avulso";
    if (clienteId) {
      const { data: c } = await db
        .from("clientes")
        .select("id, nome")
        .eq("id", clienteId)
        .eq("tenant_id", tenantId)
        .maybeSingle();
      if (!c) throw new Error("Cliente não encontrado neste negócio.");
      nome = c.nome;
    } else {
      clienteId = await clienteAvulso(db, tenantId);
    }
    const agendamentoId = await abrirNaCadeira(
      db,
      tenantId,
      context.userId,
      clienteId,
      profissionalId,
      data.servicoId,
    );
    return { agendamentoId, cliente: nome };
  });

/** Chama o próximo da fila de chegada. Padrão: quem chamou; senão o primeiro livre. */
export const chamarProximoDaFila = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { profissionalId?: string | null; filaId?: string | null }) => data ?? {})
  .handler(async ({ data, context }) => {
    const { db, tenantId, meuProfissionalId } = await base(context);
    await exigirRecurso(db, tenantId, "fila_espera");
    await exigirPermissao(context, tenantId, "agendamento_manual");
    let profissionalId = data.profissionalId ?? meuProfissionalId;
    if (profissionalId) profissionalId = await profissionalValido(db, tenantId, profissionalId);
    else {
      const lista = await profissionaisComSituacao(db, tenantId);
      profissionalId = (lista.find((p) => p.livre) ?? lista[0])?.id ?? null;
    }
    if (!profissionalId) throw new Error("Cadastre um profissional para chamar a fila.");

    let q = db
      .from("fila_de_espera")
      .select("id, cliente_id, servico_id, status, clientes(nome)")
      .eq("tenant_id", tenantId)
      .in("status", ["aguardando", "avisado"])
      .is("janela_preferida", null);
    q = data.filaId ? q.eq("id", data.filaId) : q.order("posicao").order("criado_em");
    const { data: linhas } = await q.limit(1);
    const item = linhas?.[0];
    if (!item) throw new Error("A fila está vazia.");

    // Marca antes para que dois aparelhos não chamem a mesma pessoa.
    const { data: marcado } = await db
      .from("fila_de_espera")
      .update({ status: "atendido" })
      .eq("id", item.id)
      .eq("status", item.status)
      .select("id")
      .maybeSingle();
    if (!marcado) throw new Error("Esse cliente já foi chamado em outro aparelho.");

    try {
      let servicoId = item.servico_id;
      if (!servicoId) {
        const { data: s } = await db
          .from("servicos")
          .select("id")
          .eq("tenant_id", tenantId)
          .eq("ativo", true)
          .order("ordem")
          .limit(1)
          .maybeSingle();
        servicoId = s?.id ?? null;
      }
      const agendamentoId = await abrirNaCadeira(
        db,
        tenantId,
        context.userId,
        item.cliente_id,
        profissionalId,
        servicoId,
      );
      return {
        agendamentoId,
        filaId: item.id,
        statusAnterior: item.status,
        cliente: item.clientes?.nome ?? "Cliente",
      };
    } catch (e) {
      await db.from("fila_de_espera").update({ status: item.status }).eq("id", item.id);
      throw e;
    }
  });

/** Desfazer (5 s) de um atendimento aberto agora ou chamado da fila. */
export const desfazerInicioRapido = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { agendamentoId: string; filaId?: string | null }) => data)
  .handler(async ({ data, context }) => {
    const { db, tenantId } = await base(context);
    await exigirPermissao(context, tenantId, "agendamento_manual");
    const parametros = {
      _tenant_id: tenantId,
      _ator_id: context.userId,
      _agendamento_id: data.agendamentoId,
      ...(data.filaId ? { _fila_id: data.filaId } : {}),
    };
    const { error } = await db.rpc("desfazer_inicio_rapido_seguro", parametros);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
