/**
 * Camada de AÇÕES DE DOMÍNIO para a IA.
 *
 * A ALVO IA nunca fala com o banco: fala com estas funções. Cada ação:
 * - recebe um `tenantId` já verificado pelo servidor (nunca vindo do corpo da
 *   requisição do agente);
 * - filtra tudo por `tenant_id`, de forma que um agente jamais opere em outra
 *   barbearia;
 * - reutiliza as regras de negócio que já existem no banco (`criar_agendamento`,
 *   `cancelar_agendamento`), sem duplicar regra nenhuma;
 * - devolve só o necessário para conversar com o cliente (LGPD).
 */

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Contexto de execução do agente: só o servidor produz este objeto. */
export type ContextoDoAgente = {
  tenantId: string;
  /** Identificador do agente na plataforma de IA, usado em auditoria. */
  externalAgentId: string | null;
};

async function registrarAuditoria(ctx: ContextoDoAgente, acao: string, alvo: string, detalhes: object) {
  const db = await admin();
  await db.from("auditoria_da_barbearia").insert({
    tenant_id: ctx.tenantId,
    ator_user_id: null,
    acao: `alvo_ia.${acao}`,
    alvo,
    detalhes: { ...detalhes, agente: ctx.externalAgentId },
  });
}

export async function listarServicos(ctx: ContextoDoAgente) {
  const db = await admin();
  const { data, error } = await db
    .from("servicos")
    .select("id, nome, duracao_min, preco_centavos")
    .eq("tenant_id", ctx.tenantId)
    .eq("ativo", true)
    .order("ordem");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listarProfissionais(ctx: ContextoDoAgente) {
  const db = await admin();
  const { data, error } = await db
    .from("profissionais")
    .select("id, nome")
    .eq("tenant_id", ctx.tenantId)
    .eq("ativo", true)
    .order("nome");
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Horários já ocupados no dia — a montagem da grade fica com quem consome. */
export async function consultarDisponibilidade(
  ctx: ContextoDoAgente,
  input: { dia: string; profissionalId?: string | null },
) {
  const db = await admin();
  const de = new Date(`${input.dia}T00:00:00`);
  const ate = new Date(de.getTime() + 24 * 60 * 60 * 1000);
  let consulta = db
    .from("agendamentos")
    .select("id, profissional_id, inicio, fim")
    .eq("tenant_id", ctx.tenantId)
    .not("status", "in", "(cancelado,falta)")
    .gte("inicio", de.toISOString())
    .lt("inicio", ate.toISOString());
  if (input.profissionalId) consulta = consulta.eq("profissional_id", input.profissionalId);
  const { data, error } = await consulta.order("inicio");
  if (error) throw new Error(error.message);
  return { dia: input.dia, ocupados: data ?? [] };
}

/** Busca cliente pelo telefone dentro da própria barbearia. */
export async function consultarCliente(ctx: ContextoDoAgente, input: { telefone: string }) {
  const db = await admin();
  const { data, error } = await db
    .from("clientes")
    .select("id, nome, telefone, opt_in_whatsapp, arquivado_em")
    .eq("tenant_id", ctx.tenantId)
    .eq("telefone", input.telefone)
    .is("arquivado_em", null)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ?? null;
}

/** Cadastra cliente (ou devolve o existente) respeitando o opt-in informado. */
export async function registrarCliente(
  ctx: ContextoDoAgente,
  input: { nome: string; telefone: string; optInWhatsapp: boolean },
) {
  const existente = await consultarCliente(ctx, { telefone: input.telefone });
  if (existente) return existente;
  const db = await admin();
  const { data, error } = await db
    .from("clientes")
    .insert({
      tenant_id: ctx.tenantId,
      nome: input.nome,
      telefone: input.telefone,
      opt_in_whatsapp: input.optInWhatsapp,
      opt_in_em: input.optInWhatsapp ? new Date().toISOString() : null,
      origem: "alvo_ia",
    })
    .select("id, nome, telefone, opt_in_whatsapp")
    .single();
  if (error) throw new Error(error.message);
  await registrarAuditoria(ctx, "cliente_criado", data.id, { telefone: input.telefone });
  return data;
}

async function exigirAgendamentoDoTenant(ctx: ContextoDoAgente, agendamentoId: string) {
  const db = await admin();
  const { data } = await db
    .from("agendamentos")
    .select("id, tenant_id, servico_id, profissional_id, cliente_id, forma_pagamento")
    .eq("id", agendamentoId)
    .eq("tenant_id", ctx.tenantId)
    .maybeSingle();
  if (!data) throw new Error("Agendamento não encontrado nesta barbearia.");
  return data;
}

export async function criarAgendamento(
  ctx: ContextoDoAgente,
  input: {
    clienteId: string;
    profissionalId: string;
    servicoId: string;
    inicio: string;
    formaPagamento: "credito" | "pix" | "balcao" | "fiado";
  },
) {
  const db = await admin();
  const { data, error } = await db.rpc("criar_agendamento", {
    _tenant_id: ctx.tenantId,
    _cliente_id: input.clienteId,
    _profissional_id: input.profissionalId,
    _servico_id: input.servicoId,
    _inicio: input.inicio,
    _forma_pagamento: input.formaPagamento,
  });
  if (error) throw new Error(error.message);
  const resultado = data as { agendamento_id?: string };
  await registrarAuditoria(ctx, "agendamento_criado", resultado.agendamento_id ?? "-", {
    inicio: input.inicio,
  });
  return data;
}

/** Remarcar = cancelar pelas regras atuais e criar de novo com o mesmo serviço. */
export async function remarcarAgendamento(
  ctx: ContextoDoAgente,
  input: { agendamentoId: string; novoInicio: string; profissionalId?: string | null },
) {
  const atual = await exigirAgendamentoDoTenant(ctx, input.agendamentoId);
  const db = await admin();
  const { error } = await db.rpc("cancelar_agendamento", { _agendamento_id: atual.id });
  if (error) throw new Error(error.message);
  const novo = await criarAgendamento(ctx, {
    clienteId: atual.cliente_id,
    profissionalId: (input.profissionalId ?? atual.profissional_id) as string,
    servicoId: atual.servico_id as string,
    inicio: input.novoInicio,
    formaPagamento: (atual.forma_pagamento ?? "balcao") as "credito" | "pix" | "balcao" | "fiado",
  });
  await registrarAuditoria(ctx, "agendamento_remarcado", atual.id, { novo_inicio: input.novoInicio });
  return novo;
}

export async function cancelarAgendamento(ctx: ContextoDoAgente, input: { agendamentoId: string }) {
  const atual = await exigirAgendamentoDoTenant(ctx, input.agendamentoId);
  const db = await admin();
  const { data, error } = await db.rpc("cancelar_agendamento", { _agendamento_id: atual.id });
  if (error) throw new Error(error.message);
  await registrarAuditoria(ctx, "agendamento_cancelado", atual.id, {});
  return data;
}

/** Catálogo de ações que a futura ALVO IA poderá solicitar. */
export const ACOES_DO_AGENTE = {
  consultar_disponibilidade: consultarDisponibilidade,
  listar_servicos: listarServicos,
  listar_profissionais: listarProfissionais,
  consultar_cliente: consultarCliente,
  registrar_cliente: registrarCliente,
  criar_agendamento: criarAgendamento,
  remarcar_agendamento: remarcarAgendamento,
  cancelar_agendamento: cancelarAgendamento,
} as const;

export type AcaoDoAgente = keyof typeof ACOES_DO_AGENTE;
