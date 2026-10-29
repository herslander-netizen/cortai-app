/**
 * Camada de AÇÕES DE DOMÍNIO para a IA.
 *
 * O cérebro Flow IA (`src/lib/brain`) nunca fala com o banco: usa estas funções. Cada ação:
 * - recebe um `tenantId` já verificado pelo servidor (nunca vindo do corpo da
 *   requisição do agente);
 * - filtra tudo por `tenant_id`, de forma que um agente jamais opere em outra
 *   barbearia;
 * - reutiliza as regras de negócio que já existem no banco (`criar_agendamento`,
 *   `cancelar_agendamento`), sem duplicar regra nenhuma;
 * - devolve só o necessário para conversar com o cliente (LGPD).
 */

import { exigirFormaDoAtendente } from "./entradas-da-api";
import { somarDias } from "@/lib/horarios";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Contexto de execução do agente: só o servidor produz este objeto. */
export type ContextoDoAgente = {
  tenantId: string;
  /** Identificador do agente na plataforma de IA, usado em auditoria. */
  externalAgentId: string | null;
  /** Definido só quando a ação vem da Flow IA: origem a gravar em novos agendamentos. */
  origemCortai?: "whatsapp" | "manual";
};

/** Marca a participação da Flow IA; `origem` só é escrita em agendamentos criados. */
async function marcarAssistencia(
  ctx: ContextoDoAgente,
  agendamentoId: string | undefined,
  origem?: string | null,
) {
  if (!ctx.origemCortai || !agendamentoId) return;
  const db = await admin();
  const patch: { assistido_por_cortai: true; origem?: string } = { assistido_por_cortai: true };
  if (origem) patch.origem = origem;
  const { error } = await db
    .from("agendamentos")
    .update(patch as never)
    .eq("id", agendamentoId)
    .eq("tenant_id", ctx.tenantId);
  if (error) console.error("[cortai] falha ao marcar assistência", agendamentoId, error.message);
}

async function registrarAuditoria(
  ctx: ContextoDoAgente,
  acao: string,
  alvo: string,
  detalhes: object,
) {
  const db = await admin();
  await db.from("auditoria_da_barbearia").insert({
    tenant_id: ctx.tenantId,
    ator_user_id: null,
    acao: `cortai.${acao}`,
    alvo,
    detalhes: { ...detalhes, agente: ctx.externalAgentId },
  });
}

export async function listarServicos(ctx: ContextoDoAgente) {
  const db = await admin();
  const { data, error } = await db
    .from("servicos")
    .select("id, nome, categoria, duracao_min, preco_centavos")
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

/** Dados públicos da barbearia — o que o atendente pode contar ao cliente. */
export async function consultarBarbearia(ctx: ContextoDoAgente) {
  const db = await admin();
  const [{ data: tenant }, { data: horarios }] = await Promise.all([
    db
      .from("tenants")
      .select("nome, slug, whatsapp, endereco")
      .eq("id", ctx.tenantId)
      .maybeSingle(),
    db
      .from("horarios_de_funcionamento")
      .select("dia_semana, fechado, abre, fecha")
      .eq("tenant_id", ctx.tenantId)
      .order("dia_semana"),
  ]);
  return {
    nome: tenant?.nome ?? null,
    slug: tenant?.slug ?? null,
    whatsapp: tenant?.whatsapp ?? null,
    endereco: tenant?.endereco ?? null,
    horarios: horarios ?? [],
  };
}

/**
 * Disponibilidade REAL: grade montada a partir do horário de funcionamento da
 * barbearia (hora de parede no fuso da barbearia) menos os agendamentos ativos.
 * O atendente só pode oferecer o que sai daqui — nunca um horário inventado.
 */
export async function consultarDisponibilidade(
  ctx: ContextoDoAgente,
  input: { dia: string; profissionalId?: string | null; servicoId?: string | null },
) {
  const db = await admin();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dia))
    throw new Error("Dia inválido. Use o formato AAAA-MM-DD.");
  const { horariosDisponiveis } = await import("@/lib/disponibilidade");
  const {
    intervalosPersonalizadosPorData,
    regrasDaBarbearia,
    STATUS_QUE_OCUPAM,
  } = await import("@/lib/agenda-regras.server");
  const regras = await regrasDaBarbearia(db, ctx.tenantId);
  const intervalosPorData = await intervalosPersonalizadosPorData(
    db,
    ctx.tenantId,
    somarDias(input.dia, -1),
    input.dia,
  );
  const inicioJanela = new Date(`${input.dia}T00:00:00Z`);
  inicioJanela.setUTCDate(inicioJanela.getUTCDate() - 1);
  const fimJanela = new Date(`${input.dia}T00:00:00Z`);
  fimJanela.setUTCDate(fimJanela.getUTCDate() + 2);

  let consulta = db
    .from("agendamentos")
    .select("id, profissional_id, inicio, fim")
    .eq("tenant_id", ctx.tenantId)
    .in("status", [...STATUS_QUE_OCUPAM])
    .lt("inicio", fimJanela.toISOString())
    .gt("fim", inicioJanela.toISOString());
  if (input.profissionalId) consulta = consulta.eq("profissional_id", input.profissionalId);

  const [{ data: ocupados, error }, { data: expediente }, profissionais, servico] =
    await Promise.all([
      consulta.order("inicio"),
      Promise.resolve({ data: regras.horarios }),
      listarProfissionais(ctx),
      input.servicoId
        ? db
            .from("servicos")
            .select("id, duracao_min, profissional_ids")
            .eq("tenant_id", ctx.tenantId)
            .eq("id", input.servicoId)
            .maybeSingle()
            .then((r) => r.data)
        : Promise.resolve(null),
    ]);
  if (error) throw new Error(error.message);

  const equipe = input.profissionalId
    ? profissionais.filter((p) => p.id === input.profissionalId)
    : profissionais;
  if (input.profissionalId && equipe.length === 0) {
    throw new Error("Profissional não encontrado neste negócio.");
  }

  const servicoDoMotor = servico ?? { id: "consulta", duracao_min: 30, profissional_ids: null };
  const disponibilidade = horariosDisponiveis({
    dia: input.dia,
    servico: servicoDoMotor,
    profissionais: equipe,
    escolhido: input.profissionalId ?? "qualquer",
    horarios: expediente,
    fuso: regras.fuso,
    ocupados: [
      ...(ocupados ?? []),
      ...(await (
        await import("@/lib/ocupacoes-extras.server")
      ).ocupacoesExtras(db, {
        tenantId: ctx.tenantId,
        fuso: regras.fuso,
        desde: inicioJanela,
        ate: fimJanela,
      })),
    ],
    regras: {
      antecedenciaMin: regras.antecedenciaMin,
      intervaloEntreMin: regras.intervaloEntreMin,
    },
    passoMin: regras.passoMin,
    intervalosPorData,
  });
  return {
    dia: input.dia,
    fechado: disponibilidade.fechado,
    duracaoMin: servicoDoMotor.duracao_min,
    ocupados: ocupados ?? [],
    livres: disponibilidade.opcoes.map((opcao) => ({
      profissionalId: opcao.profId,
      inicio: opcao.iso,
    })),
  };
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
  // Ficha antiga (arquivada) do mesmo telefone: reaproveitar em vez de duplicar.
  const { data: arquivado } = await db
    .from("clientes")
    .select("id, nome, telefone, opt_in_whatsapp")
    .eq("tenant_id", ctx.tenantId)
    .eq("telefone", input.telefone)
    .not("arquivado_em", "is", null)
    .maybeSingle();
  if (arquivado) {
    await db
      .from("clientes")
      .update({ arquivado_em: null, nome: input.nome })
      .eq("id", arquivado.id);
    return { ...arquivado, nome: input.nome };
  }
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
    .select("id, tenant_id, servico_id, profissional_id, cliente_id, forma_pagamento, origem")
    .eq("id", agendamentoId)
    .eq("tenant_id", ctx.tenantId)
    .maybeSingle();
  if (!data) throw new Error("Agendamento não encontrado neste negócio.");
  return data;
}

/** Avisa o cliente pelo WhatsApp Operacional V1. Nunca afeta o agendamento. */
async function avisar(
  agendamentoId: string | undefined,
  tipo: "confirmacao_agendamento" | "cancelamento" | "remarcacao",
) {
  if (!agendamentoId) return;
  try {
    const { notificarAgendamento } = await import("@/lib/whatsapp/notificacoes.server");
    await notificarAgendamento(agendamentoId, tipo);
  } catch {
    /* o agendamento já está salvo; a falha fica registrada no envio */
  }
}

export async function criarAgendamento(
  ctx: ContextoDoAgente,
  input: {
    clienteId: string | null;
    profissionalId: string;
    servicoId: string;
    inicio: string;
    formaPagamento: "credito" | "pix" | "balcao" | "fiado";
    /** Quando `false`, o aviso fica por conta de quem chamou (ex.: remarcação). */
    avisarCliente?: boolean;
    ignorarId?: string | null;
    /** Remarcação: o novo agendamento herda a origem do original. */
    origemHerdada?: string | null;
  },
) {
  const db = await admin();
  // Cliente, profissional e serviço precisam ser desta barbearia.
  const cliente = input.clienteId
    ? (
        await db
          .from("clientes")
          .select("id")
          .eq("id", input.clienteId)
          .eq("tenant_id", ctx.tenantId)
          .maybeSingle()
      ).data
    : null;
  const [{ data: profissional }, { data: servico }] = await Promise.all([
    db
      .from("profissionais")
      .select("id")
      .eq("id", input.profissionalId)
      .eq("tenant_id", ctx.tenantId)
      .eq("ativo", true)
      .maybeSingle(),
    db
      .from("servicos")
      .select("id, duracao_min, profissional_ids")
      .eq("id", input.servicoId)
      .eq("tenant_id", ctx.tenantId)
      .eq("ativo", true)
      .maybeSingle(),
  ]);
  if (input.clienteId && !cliente) throw new Error("Cliente não encontrado neste negócio.");
  if (!input.clienteId && input.formaPagamento !== "balcao")
    throw new Error("Sem cliente, o pagamento deve ser definido depois do atendimento.");
  if (!profissional) throw new Error("Profissional não encontrado neste negócio.");
  if (!servico) throw new Error("Serviço não encontrado neste negócio.");

  const inicio = new Date(input.inicio);
  if (Number.isNaN(inicio.getTime())) throw new Error("Horário inválido.");
  const { validarAgendamento } = await import("@/lib/agenda-regras.server");
  const conflito = await validarAgendamento(db, {
    tenantId: ctx.tenantId,
    servico,
    profissionalId: input.profissionalId,
    inicio,
    clienteId: input.clienteId,
    ...(input.ignorarId !== undefined ? { ignorarId: input.ignorarId } : {}),
  });
  if (conflito) {
    throw new Error(`O cliente já tem um horário às ${conflito.hora} nesse dia.`);
  }

  const { data, error } = await db.rpc("criar_agendamento", {
    _tenant_id: ctx.tenantId,
    _cliente_id: input.clienteId,
    _profissional_id: input.profissionalId,
    _servico_id: input.servicoId,
    _inicio: input.inicio,
    _forma_pagamento: input.formaPagamento,
    _validar_regras: true,
  });
  if (error)
    throw new Error(
      error.message.includes("horario ja ocupado")
        ? "Esse horário acabou de ser reservado, escolha outro"
        : error.message,
    );
  const resultado = data as { agendamento_id?: string };
  await marcarAssistencia(ctx, resultado.agendamento_id, input.origemHerdada ?? ctx.origemCortai);
  await registrarAuditoria(ctx, "agendamento_criado", resultado.agendamento_id ?? "-", {
    inicio: input.inicio,
  });
  if (input.clienteId && input.avisarCliente !== false)
    await avisar(resultado.agendamento_id, "confirmacao_agendamento");
  return data;
}

/**
 * Remarcar: cria o novo horário ANTES de cancelar o antigo, para o cliente
 * nunca ficar sem horário se a criação falhar. Quando o próprio agendamento
 * atual atrapalha o novo horário, cancela primeiro e recria — e, se ainda
 * assim falhar, devolve o horário original.
 */
export async function remarcarAgendamento(
  ctx: ContextoDoAgente,
  input: { agendamentoId: string; novoInicio: string; profissionalId?: string | null },
) {
  const atual = await exigirAgendamentoDoTenant(ctx, input.agendamentoId);
  const db = await admin();
  const dados = {
    clienteId: atual.cliente_id,
    profissionalId: (input.profissionalId ?? atual.profissional_id) as string,
    servicoId: atual.servico_id as string,
    formaPagamento: (atual.cliente_id ? atual.forma_pagamento ?? "balcao" : "balcao") as "credito" | "pix" | "balcao" | "fiado",
    avisarCliente: false,
    origemHerdada: (atual as { origem?: string | null }).origem ?? null,
  };

  let novo: unknown;
  try {
    novo = await criarAgendamento(ctx, {
      ...dados,
      inicio: input.novoInicio,
      ignorarId: atual.id,
    });
    const { error } = await db.rpc("cancelar_agendamento", { _agendamento_id: atual.id });
    if (error) throw new Error(error.message);
  } catch (primeiroErro) {
    if (novo) throw primeiroErro;
    // O horário pode estar ocupado pelo próprio agendamento atual.
    const { data: original } = await db
      .from("agendamentos")
      .select("inicio")
      .eq("id", atual.id)
      .maybeSingle();
    const { error } = await db.rpc("cancelar_agendamento", { _agendamento_id: atual.id });
    if (error) throw primeiroErro;
    try {
      novo = await criarAgendamento(ctx, { ...dados, inicio: input.novoInicio });
    } catch (segundoErro) {
      if (original?.inicio) {
        await criarAgendamento(ctx, { ...dados, inicio: original.inicio }).catch(() => undefined);
      }
      throw segundoErro;
    }
  }

  await marcarAssistencia(ctx, atual.id);
  await registrarAuditoria(ctx, "agendamento_remarcado", atual.id, {
    novo_inicio: input.novoInicio,
  });
  await avisar((novo as { agendamento_id?: string })?.agendamento_id, "remarcacao");
  return novo;
}

export async function cancelarAgendamento(ctx: ContextoDoAgente, input: { agendamentoId: string }) {
  const atual = await exigirAgendamentoDoTenant(ctx, input.agendamentoId);
  const db = await admin();
  const { data, error } = await db.rpc("cancelar_agendamento", { _agendamento_id: atual.id });
  if (error) throw new Error(error.message);
  await marcarAssistencia(ctx, atual.id);
  await registrarAuditoria(ctx, "agendamento_cancelado", atual.id, {});
  await avisar(atual.id, "cancelamento");
  return data;
}

/** Agendamentos futuros de um cliente — base para remarcar ou cancelar. */
export async function listarAgendamentosDoCliente(
  ctx: ContextoDoAgente,
  input: { clienteId: string },
) {
  const db = await admin();
  const { data, error } = await db
    .from("agendamentos")
    .select("id, inicio, fim, status, servico_id, profissional_id")
    .eq("tenant_id", ctx.tenantId)
    .eq("cliente_id", input.clienteId)
    .not("status", "in", "(cancelado,falta)")
    .gte("inicio", new Date().toISOString())
    .order("inicio");
  if (error) throw new Error(error.message);
  return data ?? [];
}

/* ---------------- Memória, histórico e informações da barbearia ----------- */

/** Detalhes de um serviço específico (preço, duração) — nunca estimados. */
export async function consultarServico(ctx: ContextoDoAgente, input: { servicoId: string }) {
  const db = await admin();
  const { data } = await db
    .from("servicos")
    .select("id, nome, duracao_min, preco_centavos, ativo")
    .eq("tenant_id", ctx.tenantId)
    .eq("id", input.servicoId)
    .maybeSingle();
  if (!data) throw new Error("Serviço não encontrado neste negócio.");
  return data;
}

/** Horários de funcionamento da barbearia. */
export async function consultarHorariosDeFuncionamento(ctx: ContextoDoAgente) {
  const db = await admin();
  const { data } = await db
    .from("horarios_de_funcionamento")
    .select("dia_semana, fechado, abre, fecha")
    .eq("tenant_id", ctx.tenantId)
    .order("dia_semana");
  return data ?? [];
}

/**
 * Informações oficiais cadastradas pela barbearia (endereço, estacionamento,
 * formas de pagamento, políticas). É a única fonte de FAQ do atendente.
 */
export async function consultarInformacoes(ctx: ContextoDoAgente) {
  const db = await admin();
  const { data } = await db
    .from("informacoes_da_barbearia")
    .select("pergunta, resposta")
    .eq("tenant_id", ctx.tenantId)
    .eq("ativo", true)
    .order("ordem");
  return data ?? [];
}

/**
 * Memória do cliente: histórico real de atendimentos + preferências que a
 * própria pessoa informou. Sempre dentro da mesma barbearia.
 */
export async function historicoDoCliente(ctx: ContextoDoAgente, input: { clienteId: string }) {
  const db = await admin();
  const { data: cliente } = await db
    .from("clientes")
    .select("id, nome")
    .eq("tenant_id", ctx.tenantId)
    .eq("id", input.clienteId)
    .maybeSingle();
  if (!cliente) throw new Error("Cliente não encontrado neste negócio.");

  const [{ data: passados }, servicos, profissionais, { data: memoria }] = await Promise.all([
    db
      .from("agendamentos")
      .select("id, inicio, status, servico_id, profissional_id")
      .eq("tenant_id", ctx.tenantId)
      .eq("cliente_id", input.clienteId)
      .order("inicio", { ascending: false })
      .limit(12),
    listarServicos(ctx),
    listarProfissionais(ctx),
    db
      .from("memoria_do_cliente")
      .select("chave, valor")
      .eq("tenant_id", ctx.tenantId)
      .eq("cliente_id", input.clienteId),
  ]);

  const nomeServico = new Map(servicos.map((s: { id: string; nome: string }) => [s.id, s.nome]));
  const nomeProfissional = new Map(
    profissionais.map((p: { id: string; nome: string }) => [p.id, p.nome]),
  );
  const concluidos = (passados ?? []).filter(
    (a) => a.status !== "cancelado" && a.status !== "nao_compareceu" && a.status !== "remarcado",
  );

  const contar = (lista: (string | null)[]) => {
    const mapa = new Map<string, number>();
    for (const item of lista) if (item) mapa.set(item, (mapa.get(item) ?? 0) + 1);
    return [...mapa.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  };

  const servicoPreferidoId = contar(concluidos.map((a) => a.servico_id));
  const profissionalPreferidoId = contar(concluidos.map((a) => a.profissional_id));

  const datas = concluidos.map((a) => new Date(a.inicio).getTime()).sort((a, b) => b - a);
  let intervaloMedioDias: number | null = null;
  if (datas.length >= 2) {
    let soma = 0;
    for (let i = 0; i < datas.length - 1; i += 1) soma += (datas[i]! - datas[i + 1]!) / 86_400_000;
    intervaloMedioDias = Math.round(soma / (datas.length - 1));
  }

  return {
    clienteId: cliente.id,
    nome: cliente.nome,
    visitas: concluidos.length,
    ultimaVisita: concluidos[0]?.inicio ?? null,
    intervaloMedioDias,
    servicoPreferido: servicoPreferidoId
      ? { id: servicoPreferidoId, nome: nomeServico.get(servicoPreferidoId) ?? null }
      : null,
    profissionalPreferido: profissionalPreferidoId
      ? { id: profissionalPreferidoId, nome: nomeProfissional.get(profissionalPreferidoId) ?? null }
      : null,
    ultimos: concluidos.slice(0, 5).map((a) => ({
      inicio: a.inicio,
      servico: a.servico_id ? (nomeServico.get(a.servico_id) ?? null) : null,
      profissional: a.profissional_id ? (nomeProfissional.get(a.profissional_id) ?? null) : null,
    })),
    preferencias: memoria ?? [],
  };
}

/**
 * Guarda uma preferência que a PESSOA informou (nunca uma dedução). Fica
 * amarrada à barbearia — nenhuma outra enxerga.
 */
export async function salvarPreferenciaDoCliente(
  ctx: ContextoDoAgente,
  input: { clienteId: string; chave: string; valor: string },
) {
  const chave = input.chave.trim().slice(0, 60);
  const valor = input.valor.trim().slice(0, 300);
  if (!chave || !valor) throw new Error("Preferência incompleta.");
  const db = await admin();
  const { data: cliente } = await db
    .from("clientes")
    .select("id")
    .eq("tenant_id", ctx.tenantId)
    .eq("id", input.clienteId)
    .maybeSingle();
  if (!cliente) throw new Error("Cliente não encontrado neste negócio.");
  const { error } = await db
    .from("memoria_do_cliente")
    .upsert(
      { tenant_id: ctx.tenantId, cliente_id: input.clienteId, chave, valor, origem: "conversa" },
      { onConflict: "tenant_id,cliente_id,chave" },
    );
  if (error) throw new Error(error.message);
  return { chave, valor };
}

/** Confirma a presença em um agendamento existente. */
export async function confirmarAgendamento(
  ctx: ContextoDoAgente,
  input: { agendamentoId: string },
) {
  const atual = await exigirAgendamentoDoTenant(ctx, input.agendamentoId);
  const db = await admin();
  const { data: linha } = await db
    .from("agendamentos")
    .select("status")
    .eq("id", atual.id)
    .maybeSingle();
  if (linha?.status === "cancelado" || linha?.status === "nao_compareceu") {
    throw new Error("Este agendamento não está mais ativo.");
  }
  const { error } = await db.from("agendamentos").update({ status: "agendado" }).eq("id", atual.id);
  if (error) throw new Error(error.message);
  await registrarAuditoria(ctx, "agendamento_confirmado", atual.id, {});
  return { agendamentoId: atual.id, status: "agendado" };
}

/** Cadastra serviços já conferidos pela equipe através do cérebro Flow IA. */
export async function cadastrarServicos(
  ctx: ContextoDoAgente,
  input: {
    servicos: { nome: string; duracaoMin: number; precoCentavos: number }[];
  },
) {
  const servicos = input.servicos
    .map((s) => ({
      nome: s.nome.trim().slice(0, 60),
      duracaoMin: Math.round(s.duracaoMin),
      precoCentavos: Math.round(s.precoCentavos),
    }))
    .filter((s) => s.nome.length >= 2);
  if (!servicos.length) throw new Error("Nenhum serviço para cadastrar.");
  if (servicos.length > 40) throw new Error("O limite é de 40 serviços por vez.");
  if (servicos.some((s) => s.duracaoMin < 5 || s.duracaoMin > 480))
    throw new Error("A duração dos serviços deve ficar entre 5 e 480 minutos.");
  if (servicos.some((s) => s.precoCentavos < 0 || s.precoCentavos > 10_000_000))
    throw new Error("O preço dos serviços está fora do limite permitido.");

  const db = await admin();
  const { error } = await db.from("servicos").insert(
    servicos.map((s, i) => ({
      tenant_id: ctx.tenantId,
      nome: s.nome,
      duracao_min: s.duracaoMin,
      preco_centavos: s.precoCentavos,
      ordem: i,
    })),
  );
  if (error) throw new Error(error.message);
  await registrarAuditoria(ctx, "servicos_cadastrados", String(servicos.length), {});
  return { total: servicos.length };
}

/** Salva os sete dias de funcionamento já conferidos pela equipe. */
export async function definirHorarios(
  ctx: ContextoDoAgente,
  input: {
    horarios: { diaSemana: number; fechado: boolean; abre: string; fecha: string }[];
  },
) {
  const horarios = input.horarios.slice(0, 7).map((h) => ({
    diaSemana: Math.round(h.diaSemana),
    fechado: Boolean(h.fechado),
    abre: h.abre,
    fecha: h.fecha,
  }));
  if (!horarios.length) throw new Error("Nenhum horário para salvar.");
  if (horarios.some((h) => h.diaSemana < 0 || h.diaSemana > 6))
    throw new Error("O dia da semana deve ficar entre 0 e 6.");
  if (horarios.some((h) => !/^\d{2}:\d{2}$/.test(h.abre) || !/^\d{2}:\d{2}$/.test(h.fecha)))
    throw new Error("Os horários precisam estar no formato HH:MM.");

  const db = await admin();
  const { error } = await db.from("horarios_de_funcionamento").upsert(
    horarios.map((h) => ({
      tenant_id: ctx.tenantId,
      dia_semana: h.diaSemana,
      fechado: h.fechado,
      abre: `${h.abre}:00`,
      fecha: `${h.fecha}:00`,
    })),
    { onConflict: "tenant_id,dia_semana" },
  );
  if (error) throw new Error(error.message);
  await registrarAuditoria(ctx, "horarios_definidos", String(horarios.length), {});
  return { total: horarios.length };
}

/** Ações de domínio usadas pelo cérebro Flow IA e pela API legada. */
export const ACOES_DO_AGENTE = {
  consultar_barbearia: consultarBarbearia,
  consultar_disponibilidade: consultarDisponibilidade,
  listar_servicos: listarServicos,
  listar_profissionais: listarProfissionais,
  consultar_cliente: consultarCliente,
  registrar_cliente: registrarCliente,
  listar_agendamentos_do_cliente: listarAgendamentosDoCliente,
  consultar_servico: consultarServico,
  consultar_horarios: consultarHorariosDeFuncionamento,
  consultar_informacoes: consultarInformacoes,
  historico_do_cliente: historicoDoCliente,
  salvar_preferencia_do_cliente: salvarPreferenciaDoCliente,
  confirmar_agendamento: confirmarAgendamento,
  cadastrar_servicos: cadastrarServicos,
  definir_horarios: definirHorarios,
  // O atendente nunca marca fiado nem crédito: confere aqui também, não só no schema da rota.
  criar_agendamento: (ctx: ContextoDoAgente, input: Parameters<typeof criarAgendamento>[1]) =>
    criarAgendamento(ctx, {
      ...input,
      formaPagamento: exigirFormaDoAtendente(input.formaPagamento),
      avisarCliente: true,
    }),
  remarcar_agendamento: remarcarAgendamento,
  cancelar_agendamento: cancelarAgendamento,
} as const;

export type AcaoDoAgente = keyof typeof ACOES_DO_AGENTE;
