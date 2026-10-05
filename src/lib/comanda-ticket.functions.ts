import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { exigirPermissao, tenantIdDoMembro } from "@/lib/tenant";
import {
  clientePodeInformarPix,
  etapaDoPagamento,
  estadoDoTicket,
  prefixoDeCodigo,
  type DadosDoTicket,
  type EstadoDoTicket,
  type MotivoDeEncerramento,
} from "@/lib/comanda-ticket";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Limite por IP para a leitura pública do ticket (mesmos contadores do webhook-guard). */
async function limitarLeituraPublica() {
  const { ipDaChamada, consumirLimite, BALDE_SEM_IP } = await import("@/lib/webhook-guard.server");
  let ip: string | null = null;
  try {
    ip = ipDaChamada(getRequest());
  } catch {
    ip = null;
  }
  const ok = await consumirLimite(`pub:ticket|ip:${ip ?? BALDE_SEM_IP}`, ip ? 30 : 300);
  if (!ok) throw new Error("Muitas tentativas em pouco tempo. Aguarde um minuto e tente de novo.");
}

function dataHora(iso: string, fuso: string) {
  const d = new Date(iso);
  const data = new Intl.DateTimeFormat("pt-BR", {
    timeZone: fuso,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
  const horario = new Intl.DateTimeFormat("pt-BR", {
    timeZone: fuso,
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
  return { data, horario };
}

const SELECAO =
  "id, codigo, status, forma_escolhida, motivo_encerramento, subtotal_centavos, desconto_centavos, total_centavos, criado_em, clientes(nome, telefone), agendamentos(inicio, forma_pagamento), pagamentos(forma_pagamento, status, estornado_em, criado_em)";

function ultimoPagamento(lista: any[] | null | undefined) {
  return [...(lista ?? [])].sort((a, b) => (a.criado_em < b.criado_em ? 1 : -1))[0] ?? null;
}

/** Monta o ticket a partir da comanda já carregada (mesma regra para painel e público). */
function montarTicket(comanda: any, itens: any[] | null, tenant: any, config: any): DadosDoTicket {
  const fuso = tenant?.fuso || "America/Sao_Paulo";
  const quando = dataHora(comanda.agendamentos?.inicio ?? comanda.criado_em, fuso);
  const pagamento = ultimoPagamento(comanda.pagamentos);
  const confirmado = pagamento?.status === "confirmado" ? pagamento : null;
  const forma =
    confirmado?.forma_pagamento ??
    comanda.forma_escolhida ??
    pagamento?.forma_pagamento ??
    comanda.agendamentos?.forma_pagamento ??
    null;
  const pixChave = config?.pix_ativo && config.pix_chave ? config.pix_chave : null;
  const mapa = (tipo: string) =>
    ((itens ?? []) as any[])
      .filter((i) => i.tipo === tipo)
      .map((i) => ({
        quantidade: i.quantidade,
        descricao: i.descricao,
        totalCentavos: i.valor_total_centavos,
      }));
  return {
    id: comanda.id,
    codigo: comanda.codigo ?? comanda.id.slice(0, 8).toUpperCase(),
    negocio: { nome: tenant?.nome?.trim() || null, logoUrl: tenant?.logo_url || null },
    data: quando.data,
    horario: quando.horario,
    cliente: {
      nome: comanda.clientes?.nome ?? "Cliente",
      telefone: comanda.clientes?.telefone ?? null,
    },
    servicos: mapa("servico"),
    produtos: mapa("produto"),
    subtotalCentavos: comanda.subtotal_centavos,
    descontoCentavos: comanda.desconto_centavos,
    totalCentavos: comanda.total_centavos,
    forma,
    estado: estadoDoTicket(comanda.status, pagamento),
    pixChave,
    etapaPagamento: etapaDoPagamento(comanda.status),
    podeInformarPix: clientePodeInformarPix(comanda.status, forma, pixChave),
    pixWhatsapp: config?.pix_whatsapp || null,
  };
}

async function carregarTicket(db: any, comandaId: string, tenantId: string) {
  const [{ data: c }, { data: itens }, { data: tenant }, { data: config }] = await Promise.all([
    db.from("comandas").select(SELECAO).eq("id", comandaId).eq("tenant_id", tenantId).maybeSingle(),
    db
      .from("comanda_itens")
      .select("tipo, descricao, quantidade, valor_total_centavos")
      .eq("comanda_id", comandaId)
      .order("criado_em"),
    db.from("tenants").select("nome, logo_url, fuso").eq("id", tenantId).maybeSingle(),
    db
      .from("configuracoes_financeiras")
      .select("pix_ativo, pix_chave, pix_whatsapp")
      .eq("tenant_id", tenantId)
      .maybeSingle(),
  ]);
  if (!c) return null;
  return montarTicket(c, itens, tenant, config);
}

/** Comanda pronta para o ticket. Só membros do próprio negócio; nunca cruza negócios. */
export const getTicketComanda = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ comandaId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<DadosDoTicket> => {
    const tenantId = await tenantIdDoMembro(context);
    const ticket = await carregarTicket(await admin(), data.comandaId, tenantId);
    if (!ticket) throw new Error("Comanda não encontrada.");
    return ticket;
  });

/**
 * Ticket pelo agendamento, para a tela pública de confirmação.
 * Sem login: quem tem o link da confirmação já vê serviço, profissional e valor;
 * a comanda nasce com o agendamento; antigos sem comanda são completados aqui.
 */
export const getTicketPublicoDoAgendamento = createServerFn({ method: "GET" })
  .validator((input: unknown) => z.object({ agendamentoId: z.string().uuid() }).parse(input))
  .handler(async ({ data }): Promise<DadosDoTicket | null> => {
    await limitarLeituraPublica();
    const db = await admin();
    const { data: comanda } = await db
      .from("comandas")
      .select("id, tenant_id")
      .eq("agendamento_id", data.agendamentoId)
      .order("criado_em", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (comanda) return carregarTicket(db, comanda.id, comanda.tenant_id);
    // Agendamento antigo sem comanda: a mesma função do banco cria (só se ainda estiver ativo).
    const { data: criada } = await db.rpc(
      "garantir_comanda" as never,
      {
        _agendamento_id: data.agendamentoId,
      } as never,
    );
    if (!criada) return null;
    const { data: nova } = await db
      .from("comandas")
      .select("id, tenant_id")
      .eq("id", criada as unknown as string)
      .maybeSingle();
    return nova ? carregarTicket(db, nova.id, nova.tenant_id) : null;
  });

/**
 * Cliente informa que pagou o Pix na confirmação pública.
 * Nunca confirma pagamento: só move a MESMA comanda para "aguardando confirmação"
 * (idempotente, validado no banco: comanda do agendamento, Pix, status). A equipe confirma depois.
 */
export const informarPagamentoPix = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.object({ agendamentoId: z.string().uuid() }).parse(input))
  .handler(async ({ data }): Promise<{ ok: boolean; status?: string; motivo?: string }> => {
    await limitarLeituraPublica();
    const db = await admin();
    const { data: r, error } = await db.rpc(
      "informar_pagamento_pix_cliente" as never,
      { _agendamento_id: data.agendamentoId } as never,
    );
    if (error) throw new Error("Não foi possível registrar agora. Tente de novo.");
    const res = (r ?? {}) as { ok?: boolean; status?: string; motivo?: string };
    if (!res.ok) {
      const motivo = res.motivo ?? "";
      throw new Error(
        motivo === "nao_pix" || motivo === "sem_pix"
          ? "Esta comanda não está aguardando Pix."
          : "Esta comanda não está aguardando pagamento.",
      );
    }
    return { ok: true, status: res.status ?? "aguardando_confirmacao_pix" };
  });

/** Comanda do agendamento para a equipe; garante a existência (fonte única no banco). */
export const getComandaDoAgendamento = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ agendamentoId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<{ comandaId: string | null }> => {
    const tenantId = await tenantIdDoMembro(context);
    const db = await admin();
    const { data: ag } = await db
      .from("agendamentos")
      .select("id")
      .eq("id", data.agendamentoId)
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (!ag) throw new Error("Agendamento não encontrado.");
    const { data: existente } = await db
      .from("comandas")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("agendamento_id", ag.id)
      .maybeSingle();
    if (existente) return { comandaId: existente.id };
    const { data: criada } = await db.rpc(
      "garantir_comanda" as never,
      {
        _agendamento_id: ag.id,
        _ator: context.userId,
      } as never,
    );
    return { comandaId: (criada as unknown as string | null) ?? null };
  });

export type ResultadoDaBusca = {
  id: string;
  codigo: string;
  cliente: string;
  quando: string;
  totalCentavos: number;
  forma: string | null;
  estado: EstadoDoTicket;
  motivo: MotivoDeEncerramento | null;
};

/** Busca por código (ou parte), data dd/mm/aaaa, nome ou telefone do cliente. */
export const buscarComandas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        termo: z.string().trim().max(60),
        estado: z.enum(["todos", "pago", "pendente", "cancelado"]).default("todos"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<ResultadoDaBusca[]> => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "visualizar_financeiro");
    const db = await admin();
    const { data: tenant } = await db
      .from("tenants")
      .select("fuso")
      .eq("id", tenantId)
      .maybeSingle();
    const fuso = tenant?.fuso || "America/Sao_Paulo";
    let q = db.from("comandas").select(SELECAO).eq("tenant_id", tenantId);
    const termo = data.termo;
    const prefixo = termo ? prefixoDeCodigo(termo) : null;
    if (prefixo) q = q.ilike("codigo", `${prefixo}%`);
    else if (termo.length >= 2) {
      const digitos = termo.replace(/\D/g, "");
      const seguro = termo.replace(/[%,()]/g, " ");
      const filtro =
        digitos.length >= 4
          ? `nome.ilike.%${seguro}%,telefone.ilike.%${digitos}%`
          : `nome.ilike.%${seguro}%`;
      const { data: clientes } = await db
        .from("clientes")
        .select("id")
        .eq("tenant_id", tenantId)
        .or(filtro)
        .limit(50);
      const ids = (clientes ?? []).map((c: any) => c.id);
      if (!ids.length) return [];
      q = q.in("cliente_id", ids);
    }
    const { data: lista } = await q.order("criado_em", { ascending: false }).limit(40);
    return ((lista ?? []) as any[])
      .map((c) => {
        const pagamento = ultimoPagamento(c.pagamentos);
        const { data: dia, horario } = dataHora(c.agendamentos?.inicio ?? c.criado_em, fuso);
        return {
          id: c.id,
          codigo: c.codigo ?? c.id.slice(0, 8),
          cliente: c.clientes?.nome ?? "Cliente",
          quando: `${dia} · ${horario}`,
          totalCentavos: c.total_centavos,
          forma: pagamento?.forma_pagamento ?? c.agendamentos?.forma_pagamento ?? null,
          estado: estadoDoTicket(c.status, pagamento),
          motivo: (c.motivo_encerramento ?? null) as MotivoDeEncerramento | null,
        };
      })
      .filter((r) => data.estado === "todos" || r.estado === data.estado);
  });
