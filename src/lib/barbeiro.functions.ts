import { createServerFn } from "@tanstack/react-start";
import { inicioDoDiaNoFuso, inicioDoMesNoFuso } from "@/lib/horarios";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { tenantIdDoMembro, exigirPermissao, type ContextoAutenticado } from "@/lib/tenant";
import { exigirRecurso } from "@/lib/planos";
import {
  hojeNoFuso,
  isoNoFusoDaBarbearia,
  slotsDoDia,
  somarDias as somarDiasIso,
} from "@/lib/horarios";
import { motivoForaDoHorario } from "@/lib/disponibilidade";
import { fusoDoTenant } from "@/lib/fuso.server";
import { DURACAO_MAX_MINUTOS, DURACAO_MIN_MINUTOS, TEXTO_DO_MOTIVO } from "@/lib/remarcacao-regras";
import { segmentoValido, type Segmento } from "@/lib/segmentos";
import {
  mapearHorarios,
  passoValido,
  regrasDaBarbearia,
  validarAgendamento,
} from "@/lib/agenda-regras.server";
import { sugestoesDeHorario } from "@/lib/sugestoes-de-horario";
import type { PreferenciasCliente } from "@/lib/preferencias-cliente";
import { expedienteDoProfissional, type Expediente } from "@/lib/expediente";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function tenantPadrao(context: ContextoAutenticado) {
  const db = await admin();
  const tenantId = await tenantIdDoMembro(context);
  const { data: tenant } = await db
    .from("tenants")
    .select("id, nome, segmento")
    .eq("id", tenantId)
    .maybeSingle();
  if (!tenant) throw new Error("Negócio não encontrado");
  return { db, tenant: { ...tenant, segmento: segmentoValido(tenant.segmento) } };
}

/* ---------------------------------- HOJE --------------------------------- */

export type Alerta = { chave: string; numero: number; titulo: string; detalhe: string };

export type PainelHoje = {
  tenant: { id: string; nome: string; segmento: Segmento };
  caixaCentavos: number;
  ocupacaoPct: number;
  ocupacaoDetalhe: string;
  fiadoAbertoCentavos: number;
  assinantes: number;
  receitaFixaCentavos: number;
  emAndamento: {
    id: string;
    cliente: string;
    servico: string;
    profissional: string;
    inicio: string;
    fim: string;
    formaPagamento: string | null;
    valorCentavos: number;
  } | null;
  alertas: Alerta[];
};

export const finalizarAtendimento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { agendamentoId: string }) => data)
  .handler(async ({ data, context }) => {
    const { db, tenant } = await tenantPadrao(context);
    await exigirPermissao(context, tenant.id, "confirmar_pagamento");
    const { error } = await db
      .from("agendamentos")
      .update({ status: "finalizado", status_alterado_por: context.userId })
      .eq("id", data.agendamentoId)
      .eq("tenant_id", tenant.id);
    if (error) throw new Error(error.message);
    const { notificarAgendamento } = await import("@/lib/whatsapp/notificacoes.server");
    void notificarAgendamento(data.agendamentoId, "pos_atendimento").catch(() => undefined);
    void notificarAgendamento(data.agendamentoId, "convite_avaliacao").catch(() => undefined);
    return { ok: true };
  });

/* ------------------------------ AGENDA DO DIA ----------------------------- */

export type AgendaItem = {
  id: string;
  inicio: string;
  fim: string;
  status: string;
  forma_pagamento: string | null;
  valor_centavos: number;
  clienteId: string | null;
  cliente: string;
  telefone: string | null;
  ficha: string | null;
  preferencias?: PreferenciasCliente;
  servico: string;
  /** Categoria do serviço (texto livre). */
  categoria?: string | null;
  /** Posição da categoria entre as do negócio (cor da barra do cartão, como no Figaro). */
  categoriaIndice?: number | null;
  duracaoMin: number;
  profissional: string;
  arrivedAt: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  encaixe?: boolean;
  daListaDeEspera?: boolean;
  origem?: string | null;
  assistidoPorCortai?: boolean;
  /** Agendamento público que usou uma ficha existente sem confirmar o telefone. */
  telefoneNaoConfirmado?: boolean;
  profissionalId?: string | null;
  confirmadoEm?: string | null;
};

export type FilaJanela = {
  id: string;
  cliente: string;
  janelaInicio: number | null;
  janelaFim: number | null;
};

export type AgendaDia = {
  tenant: { id: string; nome: string; segmento: Segmento };
  dia: string;
  itens: AgendaItem[];
  /** Bloqueios por data e fora da escala (mesma fonte do motor). Pode faltar em cache antigo. */
  bloqueios?: { profissional_id: string | null; inicio: string; fim: string }[];
  /** Bloqueios cadastrados no dia, com id e motivo, para a faixa visual da Agenda. */
  bloqueiosDoDia?: {
    id: string;
    profissional_id: string | null;
    inicio: string;
    fim: string;
    motivo: string | null;
  }[];
  /** Ajuste de intervalo específico desta data; ausente significa seguir o horário semanal. */
  intervaloPersonalizado?: { inicio: string; fim: string } | null;
  fila: FilaJanela[];
  horarios: {
    diaSemana: number;
    fechado: boolean;
    abre: string;
    fecha: string;
    intervaloInicio?: string | null;
    intervaloFim?: string | null;
  }[];
  fuso: string;
  /** Passo de horários configurado pelo negócio (minutos). */
  passoMin?: number;
  /** Profissionais ativos do negócio, mesmo sem atendimento no dia. */
  profissionais?: { id: string; nome: string; avatarUrl?: string | null }[];
};

/** Atendimentos do negócio num intervalo (início em [de, ate)), no formato da Agenda. */
async function lerItensDaAgenda(
  db: Awaited<ReturnType<typeof tenantPadrao>>["db"],
  tenantId: string,
  de: Date,
  ate: Date,
): Promise<AgendaItem[]> {
  const categoriasRes = db.from("servicos").select("categoria").eq("tenant_id", tenantId);
  const agRes = await db
    .from("agendamentos")
    .select(
      "id, inicio, fim, status, forma_pagamento, valor_centavos, cliente_id, profissional_id, arrived_at, started_at, finished_at, confirmado_em, encaixe, origem_fila_id, origem, assistido_por_cortai, clientes(nome, telefone, ficha_tecnica, condicoes_especiais, preferencias), servicos(nome, duracao_min, categoria), profissionais(nome)",
    )
    .eq("tenant_id", tenantId)
    .gte("inicio", de.toISOString())
    .lt("inicio", ate.toISOString())
    .order("inicio");
  const { indiceDaCategoria } = await import("@/components/barbeiro/agenda/cartao-figaro");
  const categoriasDoNegocio = ((await categoriasRes).data ?? []).map((c) => c.categoria);
  const itens: AgendaItem[] = (agRes.data ?? []).map((a) => ({
    id: a.id,
    inicio: a.inicio,
    fim: a.fim,
    status: a.status,
    forma_pagamento: a.forma_pagamento,
    valor_centavos: a.valor_centavos,
    clienteId: a.cliente_id ?? null,
    cliente: a.clientes?.nome ?? "Cliente",
    telefone: a.clientes?.telefone ?? null,
    ficha: a.clientes?.condicoes_especiais ?? a.clientes?.ficha_tecnica ?? null,
    preferencias: (a.clientes?.preferencias ?? {}) as PreferenciasCliente,
    servico: a.servicos?.nome ?? "Serviço",
    categoria: (a.servicos as { categoria?: string | null } | null)?.categoria ?? null,
    categoriaIndice: indiceDaCategoria(
      categoriasDoNegocio,
      (a.servicos as { categoria?: string | null } | null)?.categoria,
    ),
    duracaoMin:
      a.servicos?.duracao_min ??
      Math.max(1, Math.round((new Date(a.fim).getTime() - new Date(a.inicio).getTime()) / 60_000)),
    profissional: a.profissionais?.nome ?? "—",
    profissionalId: (a as { profissional_id?: string | null }).profissional_id ?? null,
    arrivedAt: a.arrived_at ?? null,
    startedAt: a.started_at ?? null,
    finishedAt: a.finished_at ?? null,
    confirmadoEm: (a as { confirmado_em?: string | null }).confirmado_em ?? null,
    encaixe: Boolean((a as { encaixe?: boolean | null }).encaixe),
    daListaDeEspera: Boolean((a as { origem_fila_id?: string | null }).origem_fila_id),
    origem: (a as { origem?: string | null }).origem ?? null,
    assistidoPorCortai: Boolean((a as { assistido_por_cortai?: boolean }).assistido_por_cortai),
    telefoneNaoConfirmado: false,
  }));

  // Marca "telefone não confirmado" (migração 0032): leitura à parte, só dos horários que
  // vieram do link, e que nunca derruba a agenda se a coluna ainda não existir.
  const doLink = itens.filter((i) => i.origem === "link_publico").map((i) => i.id);
  if (doLink.length) {
    const { data: marcados, error: erroMarca } = await db
      .from("agendamentos")
      .select("id")
      .in("id", doLink)
      .eq("telefone_nao_confirmado", true);
    if (!erroMarca) {
      const ids = new Set((marcados ?? []).map((m) => m.id));
      for (const i of itens) if (ids.has(i.id)) i.telefoneNaoConfirmado = true;
    }
  }

  return itens;
}

export const getAgendaDia = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: { dia?: string | undefined }) => data ?? {})
  .handler(async ({ data, context }): Promise<AgendaDia> => {
    const { db, tenant } = await tenantPadrao(context);
    const fuso = await fusoDoTenant(tenant.id);
    const diaAlvo = data.dia ?? hojeNoFuso(fuso);
    const de = new Date(isoNoFusoDaBarbearia(diaAlvo, "00:00", fuso));
    const ate = new Date(de.getTime() + 24 * 60 * 60 * 1000);

    const [itens, filaRes, horariosRes, profsRes, tenantRes] = await Promise.all([
      lerItensDaAgenda(db, tenant.id, de, ate),
      db
        .from("fila_de_espera")
        .select("id, janela_preferida, clientes(nome)")
        .eq("tenant_id", tenant.id)
        .order("posicao"),
      db
        .from("horarios_de_funcionamento")
        .select("dia_semana, fechado, abre, fecha, intervalo_inicio, intervalo_fim")
        .eq("tenant_id", tenant.id)
        .order("dia_semana"),
      db
        .from("profissionais")
        .select("id, nome, avatar_url")
        .eq("tenant_id", tenant.id)
        .eq("ativo", true)
        .order("nome"),
      db.from("tenants").select("passo_horarios_min").eq("id", tenant.id).maybeSingle(),
    ]);

    const fila = (filaRes.data ?? []).map((f) => {
      const j = (f.janela_preferida ?? null) as { inicio?: number; fim?: number } | null;
      return {
        id: f.id,
        cliente: f.clientes?.nome ?? "Cliente",
        janelaInicio: typeof j?.inicio === "number" ? j.inicio : null,
        janelaFim: typeof j?.fim === "number" ? j.fim : null,
      };
    });

    const iso = diaAlvo;
    const horarios = (horariosRes.data ?? []).map((h) => ({
      diaSemana: h.dia_semana as number,
      fechado: Boolean(h.fechado),
      abre: String(h.abre).slice(0, 5),
      fecha: String(h.fecha).slice(0, 5),
      intervaloInicio: h.intervalo_inicio ? String(h.intervalo_inicio).slice(0, 5) : null,
      intervaloFim: h.intervalo_fim ? String(h.intervalo_fim).slice(0, 5) : null,
    }));
    const passoMin = passoValido(tenantRes.data?.passo_horarios_min);
    const { intervalosPersonalizadosPorData } = await import("@/lib/agenda-regras.server");
    const intervalosPorData = await intervalosPersonalizadosPorData(db, tenant.id, diaAlvo);
    const ajusteIntervalo = intervalosPorData[diaAlvo];
    const profissionais = (profsRes.data ?? []).map((p) => ({
      id: p.id,
      nome: p.nome,
      avatarUrl: p.avatar_url,
    }));
    const { ocupacoesExtras } = await import("@/lib/ocupacoes-extras.server");
    const bloqueios = (
      await ocupacoesExtras(db, {
        tenantId: tenant.id,
        fuso,
        desde: de,
        ate,
        profissionalIds: profissionais.map((p) => p.id),
      }).catch(() => [])
    ).map((b) => ({ profissional_id: b.profissional_id, inicio: b.inicio, fim: b.fim }));
    // Bloqueios cadastrados (com id e motivo) para a faixa visual da linha do tempo. Leitura à
    // parte: se falhar, a Agenda abre igual, só sem a faixa.
    const bloqueiosDoDia = await db
      .from("bloqueios_de_agenda")
      .select("id, profissional_id, inicio, fim, motivo")
      .eq("tenant_id", tenant.id)
      .lt("inicio", ate.toISOString())
      .gt("fim", de.toISOString())
      .order("inicio")
      .then(({ data: linhas, error }) =>
        error
          ? []
          : (linhas ?? []).map((b) => ({
              id: b.id,
              profissional_id: b.profissional_id,
              inicio: b.inicio,
              fim: b.fim,
              motivo: b.motivo,
            })),
      );
    return {
      tenant,
      dia: iso,
      itens,
      bloqueios,
      bloqueiosDoDia,
      intervaloPersonalizado: ajusteIntervalo
        ? { inicio: ajusteIntervalo.intervaloInicio, fim: ajusteIntervalo.intervaloFim }
        : null,
      fila,
      horarios,
      fuso,
      passoMin,
      profissionais,
    };
  });

/** Máximo de dias numa leitura de período (o modo lista do celular carrega em blocos). */
export const DIAS_MAX_DO_PERIODO = 62;

export type AgendaPeriodo = { de: string; ate: string; fuso: string; itens: AgendaItem[] };

/**
 * Atendimentos de vários dias seguidos, a partir de `de` (dia no fuso do negócio), para o modo
 * lista do celular. Mesma leitura e mesmo acesso da Agenda do dia (`getAgendaDia`).
 */
export const getAgendaPeriodo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: { de?: string | undefined; dias: number }) => {
    if (data.de !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(data.de))
      throw new Error("Dia inválido");
    const dias = Math.trunc(Number(data.dias));
    if (!Number.isFinite(dias) || dias < 1 || dias > DIAS_MAX_DO_PERIODO)
      throw new Error("Período inválido");
    return { de: data.de, dias };
  })
  .handler(async ({ data, context }): Promise<AgendaPeriodo> => {
    const { db, tenant } = await tenantPadrao(context);
    const fuso = await fusoDoTenant(tenant.id);
    const primeiro = data.de ?? hojeNoFuso(fuso);
    const fim = somarDiasIso(primeiro, data.dias);
    const de = new Date(isoNoFusoDaBarbearia(primeiro, "00:00", fuso));
    const ate = new Date(isoNoFusoDaBarbearia(fim, "00:00", fuso));
    const itens = await lerItensDaAgenda(db, tenant.id, de, ate);
    return { de: primeiro, ate: fim, fuso, itens };
  });

export const ESTADOS_ATENDIMENTO = [
  "agendado",
  "chegou",
  "na_cadeira",
  "finalizado",
  "cancelado",
  "remarcado",
  "nao_compareceu",
] as const;
export type EstadoAtendimento = (typeof ESTADOS_ATENDIMENTO)[number];

/** Muda a etapa do atendimento. Horários e quem fez são gravados pelo banco. */
export const mudarEstadoAtendimento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (data: {
      agendamentoId: string;
      estado: EstadoAtendimento;
      estadoAnterior: EstadoAtendimento;
      desfazer?: boolean;
    }) => {
      if (!ESTADOS_ATENDIMENTO.includes(data.estado)) throw new Error("Estado inválido");
      if (!ESTADOS_ATENDIMENTO.includes(data.estadoAnterior))
        throw new Error("Estado anterior inválido");
      return data;
    },
  )
  .handler(async ({ data, context }) => {
    const { db, tenant } = await tenantPadrao(context);
    if (data.estado === "finalizado") {
      throw new Error("Finalize o atendimento pelo fluxo seguro de comanda e pagamento.");
    }
    if (["cancelado", "remarcado", "nao_compareceu"].includes(data.estado)) {
      await exigirPermissao(context, tenant.id, "cancelar_agendamento");
    } else {
      await exigirPermissao(context, tenant.id, "agendamento_manual");
    }
    const mudanca = db
      .from("agendamentos")
      .update({ status: data.estado, status_alterado_por: context.userId })
      .eq("id", data.agendamentoId)
      .eq("tenant_id", tenant.id)
      .eq("status", data.estadoAnterior);
    const mudancaSegura = data.desfazer
      ? mudanca
          .eq("status_alterado_por", context.userId)
          .gte("status_alterado_em", new Date(Date.now() - 5_000).toISOString())
      : mudanca;
    const { data: linha, error } = await mudancaSegura
      .select(
        "id, status, arrived_at, started_at, finished_at, arrived_inferido, started_inferido, finished_inferido, status_alterado_em",
      )
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!linha) {
      throw new Error(
        data.desfazer
          ? "O prazo de 5 segundos para desfazer terminou ou o atendimento já mudou."
          : "O atendimento mudou em outro aparelho. Atualize a agenda e tente novamente.",
      );
    }
    // Lista de espera: vaga liberada vira oferta; cancelamento desfeito anula a oferta.
    try {
      const ofertas = await import("@/lib/whatsapp/fila-ofertas.server");
      if (data.estado === "cancelado" && !data.desfazer)
        await ofertas.ofertarVaga(data.agendamentoId);
      if (data.desfazer && data.estadoAnterior === "cancelado")
        await ofertas.cancelarOfertasDaVaga(data.agendamentoId);
    } catch {
      /* a mudança já está salva; a varredura tenta de novo */
    }
    return linha;
  });

/** Só o necessário para abrir a agenda: quem está na cadeira agora e o próximo. */
export const getAgoraProximo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { db, tenant } = await tenantPadrao(context);
    const agora = new Date();
    const { data } = await db
      .from("agendamentos")
      .select(
        "id, inicio, fim, status, cliente_id, arrived_at, started_at, finished_at, confirmado_em, clientes(nome, telefone, ficha_tecnica, condicoes_especiais, preferencias), servicos(nome, duracao_min), profissionais(nome)",
      )
      .eq("tenant_id", tenant.id)
      .not("status", "in", "(cancelado,nao_compareceu,remarcado,finalizado)")
      .gt("fim", agora.toISOString())
      .lt("inicio", new Date(agora.getTime() + 24 * 60 * 60 * 1000).toISOString())
      .order("inicio")
      .limit(3);
    const itens = (data ?? []).map((a) => ({
      id: a.id,
      inicio: a.inicio,
      fim: a.fim,
      status: a.status,
      clienteId: a.cliente_id ?? null,
      cliente: a.clientes?.nome ?? "Cliente",
      telefone: a.clientes?.telefone ?? null,
      ficha: a.clientes?.condicoes_especiais ?? a.clientes?.ficha_tecnica ?? null,
      preferencias: (a.clientes?.preferencias ?? {}) as PreferenciasCliente,
      servico: a.servicos?.nome ?? "Serviço",
      duracaoMin:
        a.servicos?.duracao_min ??
        Math.max(
          1,
          Math.round((new Date(a.fim).getTime() - new Date(a.inicio).getTime()) / 60_000),
        ),
      profissional: a.profissionais?.nome ?? "—",
      arrivedAt: a.arrived_at ?? null,
      startedAt: a.started_at ?? null,
      finishedAt: a.finished_at ?? null,
    }));
    const t = agora.getTime();
    return {
      atual: itens.find((i) => new Date(i.inicio).getTime() <= t) ?? null,
      proximo: itens.find((i) => new Date(i.inicio).getTime() > t) ?? null,
    };
  });

export const avisarFila = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { filaId: string }) => data)
  .handler(async ({ data, context }) => {
    const { db, tenant } = await tenantPadrao(context);
    await exigirRecurso(db, tenant.id, "fila_espera");
    await exigirPermissao(context, tenant.id, "agendamento_manual");
    const { error } = await db
      .from("fila_de_espera")
      .update({ avisado_em: new Date().toISOString() })
      .eq("id", data.filaId)
      .eq("tenant_id", tenant.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const oferecerHorarioAFila = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { inicioIso: string }) => data)
  .handler(async ({ data, context }) => {
    const { db, tenant } = await tenantPadrao(context);
    await exigirRecurso(db, tenant.id, "fila_espera");
    await exigirPermissao(context, tenant.id, "agendamento_manual");
    const fuso = await fusoDoTenant(tenant.id);
    const hora = Number(
      new Intl.DateTimeFormat("en-US", {
        timeZone: fuso,
        hour: "2-digit",
        hourCycle: "h23",
      }).format(new Date(data.inicioIso)),
    );
    const { data: fila } = await db
      .from("fila_de_espera")
      .select("id, janela_preferida, clientes(nome)")
      .eq("tenant_id", tenant.id)
      .order("posicao");

    const candidato = (fila ?? []).find((f) => {
      const j = (f.janela_preferida ?? null) as { inicio?: number; fim?: number } | null;
      if (typeof j?.inicio !== "number" || typeof j?.fim !== "number") return true;
      return hora >= j.inicio && hora < j.fim;
    });
    if (!candidato) return { avisado: null as string | null };

    await db
      .from("fila_de_espera")
      .update({ avisado_em: new Date().toISOString() })
      .eq("id", candidato.id)
      .eq("tenant_id", tenant.id);
    return { avisado: candidato.clientes?.nome ?? "Cliente" };
  });

/* ----------------------------- FICHA DO CLIENTE --------------------------- */

export type Debito = { id: string; descricao: string | null; centavos: number; criado_em: string };

export type FichaCliente = {
  cliente: {
    id: string;
    nome: string;
    telefone: string;
    limite_fiado_centavos: number;
    ficha_tecnica: string | null;
    arquivado_em: string | null;
    opt_in_whatsapp: boolean;
    fidelidade_participa: boolean | null;
    desconto_percentual: number | null;
    condicoes_especiais: string | null;
    observacoes_internas: string | null;
  };
  padrao: { fidelidadeAtiva: boolean; fidelidadeAlvo: number | null };
  fidelidadeProgresso: number;
  emAbertoCentavos: number;
  debitos: Debito[];
  baixas: Debito[];
  maisAntigo: string | null;
};

export const listarClientesBarbeiro = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { db, tenant } = await tenantPadrao(context);
    const [clientesRes, carteirasRes] = await Promise.all([
      db
        .from("clientes")
        .select("id, nome, telefone")
        .eq("tenant_id", tenant.id)
        .is("arquivado_em", null)
        .order("nome"),
      db
        .from("carteiras")
        .select("cliente_id, saldo_centavos, saldo_creditos")
        .eq("tenant_id", tenant.id),
    ]);
    const mapa = new Map((carteirasRes.data ?? []).map((c) => [c.cliente_id, c]));
    return (clientesRes.data ?? []).map((c) => ({
      id: c.id,
      nome: c.nome,
      telefone: c.telefone,
      saldoCentavos: mapa.get(c.id)?.saldo_centavos ?? 0,
      creditos: mapa.get(c.id)?.saldo_creditos ?? 0,
    }));
  });

export const getFichaCliente = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: { clienteId: string }) => data)
  .handler(async ({ data, context }): Promise<FichaCliente> => {
    const { db, tenant } = await tenantPadrao(context);
    const { data: cliente } = await db
      .from("clientes")
      .select(
        "id, nome, telefone, limite_fiado_centavos, ficha_tecnica, arquivado_em, opt_in_whatsapp, fidelidade_participa, desconto_percentual, condicoes_especiais, observacoes_internas",
      )
      .eq("id", data.clienteId)
      .eq("tenant_id", tenant.id)
      .maybeSingle();
    if (!cliente) throw new Error("Cliente não encontrado");

    const [{ data: carteira }, { data: regra }] = await Promise.all([
      db
        .from("carteiras")
        .select("id, saldo_centavos, fidelidade_progresso")
        .eq("cliente_id", cliente.id)
        .maybeSingle(),
      db
        .from("regras_de_plano")
        .select("ativo, fidelidade_alvo")
        .eq("tenant_id", tenant.id)
        .eq("tipo", "fidelidade")
        .maybeSingle(),
    ]);

    const debitos: Debito[] = [];
    const baixas: Debito[] = [];
    if (carteira) {
      const { data: movs } = await db
        .from("movimentos")
        .select("id, tipo, descricao, centavos_delta, criado_em")
        .eq("carteira_id", carteira.id)
        .in("tipo", ["fiado", "baixa"])
        .order("criado_em", { ascending: true });
      for (const m of movs ?? []) {
        const item = {
          id: m.id,
          descricao: m.descricao,
          centavos: Math.abs(m.centavos_delta),
          criado_em: m.criado_em,
        };
        if (m.tipo === "baixa" || m.centavos_delta > 0) baixas.push(item);
        else debitos.push(item);
      }
    }

    const emAberto = Math.max(-(carteira?.saldo_centavos ?? 0), 0);

    return {
      cliente,
      padrao: {
        fidelidadeAtiva: regra?.ativo ?? false,
        fidelidadeAlvo: regra?.fidelidade_alvo ?? null,
      },
      fidelidadeProgresso: carteira?.fidelidade_progresso ?? 0,
      emAbertoCentavos: emAberto,
      debitos: debitos.reverse(),
      baixas: baixas.reverse(),
      maisAntigo: emAberto > 0 ? (debitos[debitos.length - 1]?.criado_em ?? null) : null,
    };
  });

/**
 * Baixa de fiado: sempre aceita valor menor que o total (baixa parcial).
 * Cada baixa entra como movimento novo na carteira — o débito original
 * nunca é editado nem apagado.
 */
export const registrarBaixaFiado = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { clienteId: string; centavos: number }) => {
    const centavos = Math.round(data.centavos);
    if (centavos <= 0) throw new Error("valor invalido");
    return { clienteId: data.clienteId, centavos };
  })
  .handler(async ({ data, context }) => {
    const { db, tenant } = await tenantPadrao(context);
    await exigirPermissao(context, tenant.id, "confirmar_pagamento");
    const { data: carteira } = await db
      .from("carteiras")
      .select("id, saldo_centavos")
      .eq("cliente_id", data.clienteId)
      .eq("tenant_id", tenant.id)
      .maybeSingle();
    if (!carteira) throw new Error("Carteira não encontrada");

    const devido = Math.max(-carteira.saldo_centavos, 0);
    if (devido === 0) throw new Error("Não há fiado em aberto.");
    const valor = Math.min(data.centavos, devido);

    const { error } = await db.from("movimentos").insert({
      carteira_id: carteira.id,
      tipo: "baixa",
      centavos_delta: valor,
      origem: "fiado",
      descricao: valor === devido ? "Fiado quitado" : "Baixa parcial do fiado",
    });
    if (error) throw new Error(error.message);

    return { pago: valor, restante: devido - valor };
  });

/* ------------------------------ FILA DE ESPERA ---------------------------- */

export type OfertaResumo = {
  id: string;
  status: string;
  inicio: string;
  expiraEm: string;
  enviadaWhatsapp: boolean;
  criadoEm: string;
  cliente: string;
  servico: string;
};

export type FilaItem = {
  id: string;
  posicao: number;
  cliente: string;
  telefone: string;
  profissionalId: string | null;
  profissional: string | null;
  servicoId: string | null;
  servico: string | null;
  dia: string | null;
  janelaInicio: number | null;
  janelaFim: number | null;
  status: string;
  avisado_em: string | null;
  criado_em: string;
  ofertaAtiva: { inicio: string; expiraEm: string } | null;
};

export type DadosFila = {
  itens: FilaItem[];
  historico: OfertaResumo[];
  recuperadosMes: number;
  recuperadoCentavos: number;
};

export const getFila = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DadosFila> => {
    const { db, tenant } = await tenantPadrao(context);
    await exigirRecurso(db, tenant.id, "fila_espera");

    const fuso = await fusoDoTenant(tenant.id);
    const inicioMes = isoNoFusoDaBarbearia(`${hojeNoFuso(fuso).slice(0, 7)}-01`, "00:00", fuso);

    const [filaRes, ofertasRes, recuperadosRes] = await Promise.all([
      db
        .from("fila_de_espera")
        .select(
          "id, posicao, status, avisado_em, criado_em, janela_preferida, profissional_id, servico_id, clientes(nome, telefone), profissionais(nome), servicos(nome)",
        )
        .eq("tenant_id", tenant.id)
        .in("status", ["aguardando", "avisado"])
        .not("janela_preferida", "is", null)
        .order("posicao")
        .order("criado_em"),
      db
        .from("ofertas_da_fila")
        .select(
          "id, fila_id, status, inicio, expira_em, enviada_whatsapp, criado_em, servicos(nome), fila_de_espera(clientes(nome))",
        )
        .eq("tenant_id", tenant.id)
        .order("criado_em", { ascending: false })
        .limit(30),
      db
        .from("agendamentos")
        .select("valor_centavos")
        .eq("tenant_id", tenant.id)
        .not("origem_fila_id", "is", null)
        .gte("criado_em", inicioMes)
        .not("status", "in", "(cancelado,remarcado)"),
    ]);

    const ofertas = ofertasRes.data ?? [];
    const agora = Date.now();
    const itens = (filaRes.data ?? []).map((f, i) => {
      const j = (f.janela_preferida ?? null) as {
        inicio?: number;
        fim?: number;
        dia?: string;
      } | null;
      const ativa = ofertas.find(
        (o) =>
          o.fila_id === f.id && o.status === "enviada" && new Date(o.expira_em).getTime() > agora,
      );
      return {
        id: f.id,
        posicao: i + 1,
        cliente: f.clientes?.nome ?? "Cliente",
        telefone: f.clientes?.telefone ?? "",
        profissionalId: f.profissional_id,
        profissional: f.profissionais?.nome ?? null,
        servicoId: f.servico_id,
        servico: f.servicos?.nome ?? null,
        dia: typeof j?.dia === "string" ? j.dia : null,
        janelaInicio: typeof j?.inicio === "number" ? j.inicio : null,
        janelaFim: typeof j?.fim === "number" ? j.fim : null,
        status: f.status,
        avisado_em: f.avisado_em,
        criado_em: f.criado_em,
        ofertaAtiva: ativa ? { inicio: ativa.inicio, expiraEm: ativa.expira_em } : null,
      };
    });
    const historico = ofertas.map((o) => ({
      id: o.id,
      status:
        o.status === "enviada" && new Date(o.expira_em).getTime() <= agora ? "expirada" : o.status,
      inicio: o.inicio,
      expiraEm: o.expira_em,
      enviadaWhatsapp: o.enviada_whatsapp,
      criadoEm: o.criado_em,
      cliente:
        (o.fila_de_espera as { clientes?: { nome?: string } | null } | null)?.clientes?.nome ??
        "Cliente",
      servico: (o.servicos as { nome?: string } | null)?.nome ?? "Serviço",
    }));
    const recuperados = recuperadosRes.data ?? [];
    return {
      itens,
      historico,
      recuperadosMes: recuperados.length,
      recuperadoCentavos: recuperados.reduce((s, a) => s + (a.valor_centavos ?? 0), 0),
    };
  });

/** Remove da lista sem apagar histórico: status "saiu". */
export const removerDaFila = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { filaId: string }) => data)
  .handler(async ({ data, context }) => {
    const { db, tenant } = await tenantPadrao(context);
    await exigirRecurso(db, tenant.id, "fila_espera");
    await exigirPermissao(context, tenant.id, "agendamento_manual");
    const { error } = await db
      .from("fila_de_espera")
      .update({ status: "saiu" })
      .eq("id", data.filaId)
      .eq("tenant_id", tenant.id);
    if (error) throw new Error(error.message);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("ofertas_da_fila")
      .update({ status: "cancelada", respondida_em: new Date().toISOString() })
      .eq("fila_id", data.filaId)
      .eq("tenant_id", tenant.id)
      .eq("status", "enviada");
    return { ok: true };
  });

/** Prioriza: troca a posição com o vizinho (para cima ou para baixo). */
export const moverNaFila = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { filaId: string; direcao: "subir" | "descer" }) => ({
    filaId: String(data.filaId),
    direcao: data.direcao === "descer" ? ("descer" as const) : ("subir" as const),
  }))
  .handler(async ({ data, context }) => {
    const { db, tenant } = await tenantPadrao(context);
    await exigirRecurso(db, tenant.id, "fila_espera");
    await exigirPermissao(context, tenant.id, "agendamento_manual");
    const { data: fila } = await db
      .from("fila_de_espera")
      .select("id")
      .eq("tenant_id", tenant.id)
      .in("status", ["aguardando", "avisado"])
      .not("janela_preferida", "is", null)
      .order("posicao")
      .order("criado_em");
    const ids = (fila ?? []).map((f) => f.id);
    const i = ids.indexOf(data.filaId);
    const j = data.direcao === "subir" ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= ids.length) return { ok: true };
    [ids[i], ids[j]] = [ids[j]!, ids[i]!];
    // Renumera tudo: posições ficam contínuas e sem empate.
    for (const [n, id] of ids.entries()) {
      await db
        .from("fila_de_espera")
        .update({ posicao: n + 1 })
        .eq("id", id)
        .eq("tenant_id", tenant.id);
    }
    return { ok: true };
  });

export const editarFila = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (data: {
      filaId: string;
      servicoId: string | null;
      profissionalId: string | null;
      dia: string | null;
      janelaInicio: number | null;
      janelaFim: number | null;
    }) => {
      if (data.dia && !/^\d{4}-\d{2}-\d{2}$/.test(data.dia)) throw new Error("Data inválida.");
      const ok = (h: number | null) => h === null || (Number.isInteger(h) && h >= 0 && h <= 24);
      if (!ok(data.janelaInicio) || !ok(data.janelaFim)) throw new Error("Período inválido.");
      return data;
    },
  )
  .handler(async ({ data, context }) => {
    const { db, tenant } = await tenantPadrao(context);
    await exigirRecurso(db, tenant.id, "fila_espera");
    await exigirPermissao(context, tenant.id, "agendamento_manual");
    const confere = async (tabela: "servicos" | "profissionais", id: string | null) => {
      if (!id) return null;
      const { data: r } = await db
        .from(tabela)
        .select("id")
        .eq("id", id)
        .eq("tenant_id", tenant.id)
        .maybeSingle();
      if (!r) throw new Error("Opção inválida para este negócio.");
      return id;
    };
    const janela: Record<string, string | number | boolean> = { espera: true };
    if (data.janelaInicio !== null && data.janelaFim !== null) {
      janela["inicio"] = data.janelaInicio;
      janela["fim"] = data.janelaFim;
    }
    if (data.dia) janela["dia"] = data.dia;
    const { error } = await db
      .from("fila_de_espera")
      .update({
        servico_id: await confere("servicos", data.servicoId),
        profissional_id: await confere("profissionais", data.profissionalId),
        janela_preferida: janela,
      })
      .eq("id", data.filaId)
      .eq("tenant_id", tenant.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Converte a solicitação em agendamento pelo motor oficial
 * (mesmas regras e trava de sobreposição do painel).
 */
export const converterFilaEmAgendamento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (data: { filaId: string; servicoId: string; profissionalId: string; inicioIso: string }) => {
      if (Number.isNaN(new Date(data.inicioIso).getTime())) throw new Error("Horário inválido.");
      return data;
    },
  )
  .handler(async ({ data, context }) => {
    const { db, tenant } = await tenantPadrao(context);
    await exigirRecurso(db, tenant.id, "fila_espera");
    await exigirPermissao(context, tenant.id, "agendamento_manual");
    const [{ data: item }, { data: servico }] = await Promise.all([
      db
        .from("fila_de_espera")
        .select("id, cliente_id, status")
        .eq("id", data.filaId)
        .eq("tenant_id", tenant.id)
        .maybeSingle(),
      db
        .from("servicos")
        .select("id, duracao_min, profissional_ids")
        .eq("id", data.servicoId)
        .eq("tenant_id", tenant.id)
        .maybeSingle(),
    ]);
    if (!item || !["aguardando", "avisado"].includes(item.status))
      throw new Error("Essa solicitação não está mais na lista.");
    if (!servico) throw new Error("Serviço não encontrado.");
    const inicio = new Date(data.inicioIso);
    const conflito = await validarAgendamento(db, {
      tenantId: tenant.id,
      servico,
      profissionalId: data.profissionalId,
      inicio,
      clienteId: item.cliente_id,
    });
    if (conflito) throw new Error(`Esse cliente já tem horário às ${conflito.hora}.`);
    const { data: res, error } = await db.rpc("criar_agendamento", {
      _tenant_id: tenant.id,
      _cliente_id: item.cliente_id,
      _profissional_id: data.profissionalId,
      _servico_id: servico.id,
      _inicio: inicio.toISOString(),
      _forma_pagamento: "balcao",
      _encaixe: false,
    });
    if (error) {
      if (error.message.includes("horario ja ocupado"))
        throw new Error("Esse horário acabou de ser reservado, escolha outro.");
      throw new Error(error.message);
    }
    const criado = res as unknown as { agendamento_id: string };
    await db
      .from("agendamentos")
      .update({ origem: "manual", origem_fila_id: item.id })
      .eq("id", criado.agendamento_id)
      .eq("tenant_id", tenant.id);
    await db
      .from("fila_de_espera")
      .update({ status: "atendido" })
      .eq("id", item.id)
      .eq("tenant_id", tenant.id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("ofertas_da_fila")
      .update({ status: "cancelada", respondida_em: new Date().toISOString() })
      .eq("fila_id", item.id)
      .eq("status", "enviada");
    try {
      const { enviarConfirmacaoDeAgendamento } = await import("@/lib/whatsapp/confirmacao.server");
      await enviarConfirmacaoDeAgendamento(criado.agendamento_id);
    } catch {
      /* agendamento salvo */
    }
    return { agendamentoId: criado.agendamento_id };
  });

/** Opções do negócio para editar/converter (serviços com duração real). */
export const getOpcoesDaFila = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { db, tenant } = await tenantPadrao(context);
    const [s, p] = await Promise.all([
      db
        .from("servicos")
        .select("id, nome, duracao_min, profissional_ids")
        .eq("tenant_id", tenant.id)
        .eq("ativo", true)
        .order("nome"),
      db
        .from("profissionais")
        .select("id, nome")
        .eq("tenant_id", tenant.id)
        .eq("ativo", true)
        .order("nome"),
    ]);
    return {
      servicos: (s.data ?? []) as {
        id: string;
        nome: string;
        duracao_min: number;
        profissional_ids: string[] | null;
      }[],
      profissionais: (p.data ?? []) as { id: string; nome: string }[],
      fuso: await fusoDoTenant(tenant.id),
    };
  });

/* -------------------------- CICLO DE VIDA DO CLIENTE ---------------------- */

/** Arquivar é reversível: some das listas, mas nada de histórico é apagado. */
export const arquivarCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { clienteId: string; arquivar: boolean }) => ({
    clienteId: String(data.clienteId),
    arquivar: Boolean(data.arquivar),
  }))
  .handler(async ({ data, context }) => {
    const { db, tenant } = await tenantPadrao(context);
    await exigirPermissao(context, tenant.id, "editar_clientes");
    const { error } = await db
      .from("clientes")
      .update({ arquivado_em: data.arquivar ? new Date().toISOString() : null })
      .eq("id", data.clienteId)
      .eq("tenant_id", tenant.id);
    if (error) throw new Error(error.message);
    return { ok: true, arquivado: data.arquivar };
  });

/**
 * Exclusão permanente do cliente: só quando não há histórico de atendimento
 * nem lançamento financeiro. Com histórico, o caminho seguro é arquivar.
 */
export const excluirClientePermanente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { clienteId: string }) => ({
    clienteId: String(data.clienteId),
  }))
  .handler(async ({ data, context }) => {
    const { db, tenant } = await tenantPadrao(context);
    await exigirPermissao(context, tenant.id, "acoes_destrutivas");
    const { data: cliente } = await db
      .from("clientes")
      .select("id")
      .eq("id", data.clienteId)
      .eq("tenant_id", tenant.id)
      .maybeSingle();
    if (!cliente) throw new Error("Cliente não encontrado.");

    const { data: agendamentos } = await db
      .from("agendamentos")
      .select("id")
      .eq("cliente_id", cliente.id)
      .limit(1);
    const { data: carteira } = await db
      .from("carteiras")
      .select("id")
      .eq("cliente_id", cliente.id)
      .maybeSingle();
    let temMovimento = false;
    if (carteira) {
      const { data: movimentos } = await db
        .from("movimentos")
        .select("id")
        .eq("carteira_id", carteira.id)
        .limit(1);
      temMovimento = Boolean(movimentos?.length);
    }
    if (agendamentos?.length || temMovimento) {
      throw new Error(
        "Este cliente tem histórico de atendimento ou financeiro. Para não apagar seus relatórios, arquive o cliente.",
      );
    }

    await db.from("fila_de_espera").delete().eq("cliente_id", cliente.id);
    await db.from("avaliacoes").delete().eq("cliente_id", cliente.id);
    if (carteira) await db.from("carteiras").delete().eq("id", carteira.id);
    const { error } = await db
      .from("clientes")
      .delete()
      .eq("id", cliente.id)
      .eq("tenant_id", tenant.id);
    if (error) throw new Error(error.message);
    const { gravarExclusao } = await import("@/lib/exclusoes.server");
    await gravarExclusao(context as never, "cliente", cliente.id, tenant.id);
    return { ok: true };
  });

/* --------------------- AGENDAMENTO MANUAL (BALCÃO) ------------------------ */

export type DadosManual = {
  tenant: { id: string; nome: string };
  servicos: {
    id: string;
    nome: string;
    duracao_min: number;
    preco_centavos: number;
    /** Vazio ou nulo = qualquer profissional faz. */
    profissional_ids: string[] | null;
  }[];
  profissionais: { id: string; nome: string }[];
  horarios: ReturnType<typeof mapearHorarios>;
  fuso: string;
  passoMin: number;
};

export const getDadosAgendamentoManual = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DadosManual> => {
    const { db, tenant } = await tenantPadrao(context);
    await exigirPermissao(context, tenant.id, "agendamento_manual");
    await exigirRecurso(db, tenant.id, "agendamento_manual");
    const [servicosRes, profRes, horariosRes] = await Promise.all([
      db
        .from("servicos")
        .select("id, nome, duracao_min, preco_centavos, profissional_ids")
        .eq("tenant_id", tenant.id)
        .eq("ativo", true)
        .order("ordem"),
      db
        .from("profissionais")
        .select("id, nome")
        .eq("tenant_id", tenant.id)
        .eq("ativo", true)
        .order("nome"),
      db
        .from("horarios_de_funcionamento")
        .select("dia_semana, fechado, abre, fecha, intervalo_inicio, intervalo_fim")
        .eq("tenant_id", tenant.id),
    ]);
    const { data: passoRow } = await db
      .from("tenants")
      .select("passo_horarios_min")
      .eq("id", tenant.id)
      .maybeSingle();
    return {
      tenant,
      servicos: servicosRes.data ?? [],
      profissionais: profRes.data ?? [],
      horarios: mapearHorarios(horariosRes.data ?? []),
      fuso: await fusoDoTenant(tenant.id),
      passoMin: passoValido(passoRow?.passo_horarios_min),
    };
  });

/**
 * Busca clientes SOMENTE da barbearia do usuário logado, por nome ou telefone. Com `lista`, devolve
 * a lista em ordem alfabética (até 300), para a escolha de cliente em tela cheia.
 */
export const buscarClientesDaBarbearia = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: { termo?: string | undefined; lista?: boolean | undefined }) => ({
    termo: (data?.termo ?? "").trim().slice(0, 60),
    lista: data?.lista === true,
  }))
  .handler(async ({ data, context }) => {
    const { db, tenant } = await tenantPadrao(context);
    let q = db
      .from("clientes")
      .select("id, nome, telefone")
      .eq("tenant_id", tenant.id)
      .is("arquivado_em", null)
      .order("nome")
      .limit(data.lista ? 300 : 8);
    if (data.termo) {
      const t = data.termo.replace(/[%,()]/g, "");
      q = q.or(`nome.ilike.%${t}%,telefone.ilike.%${t}%`);
    }
    if (!data.termo && !data.lista) {
      // Sem busca: clientes atendidos mais recentemente primeiro.
      const { data: recentes } = await db
        .from("agendamentos")
        .select("cliente_id, inicio, clientes!inner(id, nome, telefone, arquivado_em)")
        .eq("tenant_id", tenant.id)
        .is("clientes.arquivado_em", null)
        .order("inicio", { ascending: false })
        .limit(60);
      const vistos = new Map<string, { id: string; nome: string; telefone: string }>();
      for (const r of (recentes ?? []) as unknown as {
        clientes: { id: string; nome: string; telefone: string } | null;
      }[]) {
        if (r.clientes && !vistos.has(r.clientes.id))
          vistos.set(r.clientes.id, {
            id: r.clientes.id,
            nome: r.clientes.nome,
            telefone: r.clientes.telefone,
          });
        if (vistos.size >= 8) break;
      }
      if (vistos.size) return [...vistos.values()];
    }
    const { data: rows } = await q;
    return (rows ?? []) as { id: string; nome: string; telefone: string }[];
  });

function soDigitos(v: string) {
  return v.replace(/\D/g, "");
}

export type ResultadoManual = {
  ok: boolean;
  agendamentoId?: string;
  comandaId?: string | null;
  inicio?: string;
  clienteNome?: string;
  conflito?: {
    mensagem: string;
    sugestoes: { iso: string; label: string }[];
    podeEncaixar?: boolean;
  };
};

/**
 * Agendamento de balcão: mesmas regras de disponibilidade do app.
 * A barbearia vem sempre do vínculo da sessão — nunca de id enviado pela tela.
 */
export const criarAgendamentoManual = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (data: {
      clienteId?: string | undefined;
      semCliente?: boolean | undefined;
      novoNome?: string | undefined;
      novoTelefone?: string | undefined;
      servicoId: string;
      profissionalId: string;
      inicio: string;
      formaPagamento: "pix" | "balcao" | "fiado" | "credito";
      encaixe?: boolean | undefined;
    }) => data,
  )
  .handler(async ({ data, context }): Promise<ResultadoManual> => {
    const { db, tenant } = await tenantPadrao(context);
    await exigirPermissao(context, tenant.id, "agendamento_manual");
    await exigirRecurso(db, tenant.id, "agendamento_manual");

    const { data: servico } = await db
      .from("servicos")
      .select("id, duracao_min, profissional_ids")
      .eq("id", data.servicoId)
      .eq("tenant_id", tenant.id)
      .maybeSingle();
    if (!servico) throw new Error("Serviço não encontrado neste negócio.");

    const { data: prof } = await db
      .from("profissionais")
      .select("id")
      .eq("id", data.profissionalId)
      .eq("tenant_id", tenant.id)
      .maybeSingle();
    if (!prof) throw new Error("Profissional não encontrado neste negócio.");

    // 1. Resolver a referência do cliente sem criar uma ficha ainda.
    let clienteId = data.clienteId ?? null;
    let clienteNome = "";
    let clienteCriado = false;
    if (data.semCliente) {
      if (clienteId || (data.novoNome ?? "").trim() || (data.novoTelefone ?? "").trim())
        throw new Error("Escolha um cliente ou continue sem cliente, sem misturar os dados.");
      if (data.formaPagamento !== "balcao")
        throw new Error("Sem cliente, o pagamento deve ser definido depois do atendimento.");
      clienteNome = "";
    } else if (clienteId) {
      const { data: c } = await db
        .from("clientes")
        .select("id, nome")
        .eq("id", clienteId)
        .eq("tenant_id", tenant.id)
        .maybeSingle();
      if (!c) throw new Error("Cliente não encontrado neste negócio.");
      clienteNome = c.nome;
    } else {
      const nome = (data.novoNome ?? "").trim().slice(0, 80);
      const telefone = soDigitos(data.novoTelefone ?? "").slice(0, 15);
      if (nome.length < 2) throw new Error("Informe o nome do cliente.");
      if (telefone.length < 10) throw new Error("Informe um telefone com DDD.");
      const { data: existente } = await db
        .from("clientes")
        .select("id, nome")
        .eq("tenant_id", tenant.id)
        .eq("telefone", telefone)
        .maybeSingle();
      if (existente) {
        clienteId = existente.id;
        clienteNome = existente.nome;
        await db.from("clientes").update({ arquivado_em: null }).eq("id", existente.id);
      } else clienteNome = nome;
    }

    // 2. Conferir todas as regras antes de criar uma nova ficha de cliente.
    const inicio = new Date(data.inicio);
    if (Number.isNaN(inicio.getTime())) throw new Error("Horário inválido.");
    if (!data.encaixe) {
      try {
        const conflitoCliente = await validarAgendamento(db, {
          tenantId: tenant.id,
          servico,
          profissionalId: data.profissionalId,
          inicio,
          clienteId,
        });
        if (conflitoCliente)
          throw new Error(`O cliente já tem um horário às ${conflitoCliente.hora}.`);
      } catch (erro) {
        const mensagem = erro instanceof Error ? erro.message : "Horário indisponível.";
        if (mensagem.includes("acabou de ser reservado")) {
          return {
            ok: false,
            conflito: {
              mensagem: "Esse horário já tem agendamento. Encaixar mesmo assim?",
              sugestoes: [],
              podeEncaixar: true,
            },
          };
        }
        throw erro;
      }
    }

    // 3. Só agora cria o cliente novo; uma falha de disponibilidade nunca deixa cadastro órfão.
    if (!clienteId && !data.semCliente) {
      const telefone = soDigitos(data.novoTelefone ?? "").slice(0, 15);
      const { data: novo, error } = await db
        .from("clientes")
        .insert({ tenant_id: tenant.id, nome: clienteNome, telefone, origem: "balcao" })
        .select("id, nome")
        .single();
      if (error) throw new Error(error.message);
      clienteId = novo.id;
      clienteNome = novo.nome;
      clienteCriado = true;
    }

    // 4. A trava atômica do banco continua sendo a última defesa contra corridas.
    const fim = new Date(inicio.getTime() + servico.duracao_min * 60000);
    const dia = inicioDoDiaNoFuso(await fusoDoTenant(tenant.id), inicio);
    const fimDia = new Date(dia.getTime() + 24 * 60 * 60 * 1000);

    const { data: doDia } = await db
      .from("agendamentos")
      .select("inicio, fim")
      .eq("tenant_id", tenant.id)
      .eq("profissional_id", data.profissionalId)
      .gte("inicio", dia.toISOString())
      .lt("inicio", fimDia.toISOString())
      .in("status", ["agendado", "chegou", "na_cadeira"])
      .eq("encaixe", false);

    const ocupados = (doDia ?? []).map(
      (a) => [new Date(a.inicio).getTime(), new Date(a.fim).getTime()] as const,
    );
    const livre = (i: number, f: number) => !ocupados.some(([oi, of]) => i < of && f > oi);

    // Sugestões pelo motor único: expediente, pausa, fuso, antecedência, intervalo e
    // passo do negócio, mais bloqueios e escalas do profissional.
    const sugerir = async () => {
      const regras = await regrasDaBarbearia(db, tenant.id);
      const { intervalosPersonalizadosPorData } = await import("@/lib/agenda-regras.server");
      const diaDaSugestao = hojeNoFuso(regras.fuso, inicio);
      const intervalosPorData = await intervalosPersonalizadosPorData(
        db,
        tenant.id,
        somarDiasIso(diaDaSugestao, -1),
        diaDaSugestao,
      );
      const { ocupacoesExtras } = await import("@/lib/ocupacoes-extras.server");
      const extras = await ocupacoesExtras(db, {
        tenantId: tenant.id,
        fuso: regras.fuso,
        desde: dia,
        ate: fimDia,
        profissionalIds: [data.profissionalId],
      }).catch(() => []);
      return sugestoesDeHorario({
        pedido: inicio,
        servico,
        profissionalId: data.profissionalId,
        horarios: regras.horarios,
        fuso: regras.fuso,
        ocupados: [
          ...(doDia ?? []).map((a) => ({ ...a, profissional_id: data.profissionalId })),
          ...extras,
        ],
        regras: {
          antecedenciaMin: regras.antecedenciaMin,
          intervaloEntreMin: regras.intervaloEntreMin,
        },
        passoMin: regras.passoMin,
        intervalosPorData,
      });
    };
    const conflitoDoPainel = async (): Promise<ResultadoManual> => ({
      ok: false,
      conflito: {
        mensagem: "Esse horário já tem agendamento. Encaixar mesmo assim?",
        sugestoes: await sugerir().catch(() => []),
        podeEncaixar: true,
      },
    });

    if (!data.encaixe && !livre(inicio.getTime(), fim.getTime())) {
      if (clienteCriado) await db.from("clientes").delete().eq("id", clienteId!);
      return await conflitoDoPainel();
    }

    // 5. Criar pelas mesmas regras do app e marcar a origem como manual.
    const { data: res, error } = await db.rpc("criar_agendamento", {
      _tenant_id: tenant.id,
      _cliente_id: data.semCliente ? null : clienteId,
      _profissional_id: data.profissionalId,
      _servico_id: data.servicoId,
      _inicio: inicio.toISOString(),
      _forma_pagamento: data.formaPagamento,
      _encaixe: Boolean(data.encaixe),
    });
    if (error) {
      if (clienteCriado) await db.from("clientes").delete().eq("id", clienteId!);
      if (error.message.includes("horario ja ocupado")) return await conflitoDoPainel();
      throw new Error(error.message);
    }
    const criado = res as unknown as { agendamento_id: string; inicio: string };
    await db.from("agendamentos").update({ origem: "manual" }).eq("id", criado.agendamento_id);

    // Sem cliente vinculado, não há destinatário para a confirmação pelo WhatsApp.
    if (!data.semCliente) {
      try {
        const { enviarConfirmacaoDeAgendamento } =
          await import("@/lib/whatsapp/confirmacao.server");
        await enviarConfirmacaoDeAgendamento(criado.agendamento_id);
      } catch {
        /* o agendamento já está salvo; a falha fica registrada no envio */
      }
    }

    // A comanda nasce junto (gatilho do banco); só lemos o id para abrir o ticket.
    const { data: comanda } = await db
      .from("comandas")
      .select("id")
      .eq("tenant_id", tenant.id)
      .eq("agendamento_id", criado.agendamento_id)
      .maybeSingle();

    return {
      ok: true,
      agendamentoId: criado.agendamento_id,
      comandaId: comanda?.id ?? null,
      inicio: criado.inicio,
      clienteNome,
    };
  });

/** Próximo horário realmente livre (hoje, dentro do funcionamento) para "atender agora". */
export const getProximoHorarioLivre = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator(
    (data: { profissionalId?: string | undefined; servicoId?: string | undefined }) => data ?? {},
  )
  .handler(async ({ data, context }): Promise<{ iso: string; label: string } | null> => {
    const { db, tenant } = await tenantPadrao(context);
    await exigirPermissao(context, tenant.id, "agendamento_manual");

    let duracao = 30;
    if (data.servicoId) {
      const { data: s } = await db
        .from("servicos")
        .select("duracao_min")
        .eq("id", data.servicoId)
        .eq("tenant_id", tenant.id)
        .maybeSingle();
      if (s) duracao = s.duracao_min;
    }

    const fuso = await fusoDoTenant(tenant.id);
    const dia = hojeNoFuso(fuso);
    const inicioDia = new Date(isoNoFusoDaBarbearia(dia, "00:00", fuso));
    const fimDia = new Date(inicioDia.getTime() + 24 * 60 * 60 * 1000);

    let q = db
      .from("agendamentos")
      .select("inicio, fim")
      .eq("tenant_id", tenant.id)
      .gte("inicio", inicioDia.toISOString())
      .lt("inicio", fimDia.toISOString())
      .not("status", "in", "(cancelado,nao_compareceu,remarcado)");
    if (data.profissionalId) q = q.eq("profissional_id", data.profissionalId);
    const [{ data: doDia }, { data: horariosRes }] = await Promise.all([
      q,
      db
        .from("horarios_de_funcionamento")
        .select("dia_semana, fechado, abre, fecha, intervalo_inicio, intervalo_fim")
        .eq("tenant_id", tenant.id),
    ]);

    const ocupados = (doDia ?? []).map(
      (a) => [new Date(a.inicio).getTime(), new Date(a.fim).getTime()] as const,
    );
    const agora = Date.now();
    const horarios = (horariosRes ?? []).map((h) => ({
      diaSemana: h.dia_semana,
      fechado: h.fechado,
      abre: String(h.abre).slice(0, 5),
      fecha: String(h.fecha).slice(0, 5),
      intervaloInicio: h.intervalo_inicio ? String(h.intervalo_inicio).slice(0, 5) : null,
      intervaloFim: h.intervalo_fim ? String(h.intervalo_fim).slice(0, 5) : null,
    }));
    const { data: passoRow } = await db
      .from("tenants")
      .select("passo_horarios_min")
      .eq("id", tenant.id)
      .maybeSingle();
    const grade = slotsDoDia(dia, horarios, passoValido(passoRow?.passo_horarios_min), fuso, duracao);
    for (const slot of grade.slots) {
      const inicio = new Date(slot.iso).getTime();
      if (inicio < agora || motivoForaDoHorario(inicio, duracao, horarios, fuso)) continue;
      const fim = inicio + duracao * 60_000;
      if (!ocupados.some(([oi, of]) => inicio < of && fim > oi))
        return { iso: slot.iso, label: slot.label };
    }
    return null;
  });

/* --------------------- PERSONALIZAÇÃO POR CLIENTE ------------------------- */

/**
 * Só quem é membro da barbearia dona do cliente pode mudar estas regras.
 * O cliente final nunca chega aqui: a autorização é resolvida no servidor,
 * pelo vínculo do usuário logado com o tenant, e nunca por dado do navegador.
 */
export const salvarPersonalizacaoCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (data: {
      clienteId: string;
      fidelidadeParticipa: boolean | null;
      descontoPercentual: number | null;
      condicoesEspeciais: string | null;
      observacoesInternas: string | null;
      optInWhatsapp: boolean;
    }) => {
      if (!data.clienteId) throw new Error("cliente invalido");
      let desconto: number | null = null;
      if (data.descontoPercentual !== null && data.descontoPercentual !== undefined) {
        const n = Math.round(Number(data.descontoPercentual));
        if (!Number.isFinite(n) || n < 0 || n > 100)
          throw new Error("Use um desconto entre 0% e 100%.");
        desconto = n === 0 ? null : n;
      }
      const limpar = (t: string | null) => {
        const v = (t ?? "").trim();
        if (v.length > 600) throw new Error("Texto muito longo.");
        return v === "" ? null : v;
      };
      return {
        clienteId: data.clienteId,
        fidelidadeParticipa:
          data.fidelidadeParticipa === null || data.fidelidadeParticipa === undefined
            ? null
            : !!data.fidelidadeParticipa,
        descontoPercentual: desconto,
        condicoesEspeciais: limpar(data.condicoesEspeciais),
        observacoesInternas: limpar(data.observacoesInternas),
        optInWhatsapp: !!data.optInWhatsapp,
      };
    },
  )
  .handler(async ({ data, context }) => {
    const { db, tenant } = await tenantPadrao(context);
    await exigirPermissao(context, tenant.id, "editar_clientes");
    await exigirRecurso(db, tenant.id, "personalizacao_cliente");
    const { error } = await db
      .from("clientes")
      .update({
        fidelidade_participa: data.fidelidadeParticipa,
        desconto_percentual: data.descontoPercentual,
        condicoes_especiais: data.condicoesEspeciais,
        observacoes_internas: data.observacoesInternas,
        opt_in_whatsapp: data.optInWhatsapp,
      })
      .eq("id", data.clienteId)
      .eq("tenant_id", tenant.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------- REMARCAR E CANCELAR PELO PAINEL ---------------------- */

/** Remarcar = cancelar pelas regras atuais e recriar com o mesmo serviço. */
export const remarcarAgendamentoPainel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { agendamentoId: string; novoInicio: string }) => data)
  .handler(async ({ data, context }) => {
    const { db, tenant } = await tenantPadrao(context);
    await exigirPermissao(context, tenant.id, "agendamento_manual");
    const { data: atual } = await db
      .from("agendamentos")
      .select("id, cliente_id, servico_id, profissional_id, forma_pagamento, origem")
      .eq("id", data.agendamentoId)
      .eq("tenant_id", tenant.id)
      .maybeSingle();
    if (!atual) throw new Error("Agendamento não encontrado neste negócio.");
    if (!atual.profissional_id || !atual.servico_id) {
      throw new Error("Esse atendimento não pode ser remarcado por aqui.");
    }
    const { data: novo, error } = await db.rpc("criar_agendamento", {
      _tenant_id: tenant.id,
      _cliente_id: atual.cliente_id,
      _profissional_id: atual.profissional_id,
      _servico_id: atual.servico_id,
      _inicio: data.novoInicio,
      _forma_pagamento: atual.forma_pagamento ?? "balcao",
      _validar_regras: true,
    });
    if (error) throw new Error(error.message);
    const criadoId = (novo as { agendamento_id?: string } | null)?.agendamento_id;
    if (!criadoId) throw new Error("Não foi possível confirmar o novo horário.");
    // Remarcação herda a origem do agendamento original.
    await db
      .from("agendamentos")
      .update({ origem: atual.origem ?? "manual" })
      .eq("id", criadoId)
      .eq("tenant_id", tenant.id);
    const { concluirSubstituicao } = await import("@/lib/substituicao.server");
    await concluirSubstituicao(db, { novoId: criadoId, antigoId: atual.id });
    // Aviso de remarcação: nunca bloqueia o novo horário.
    try {
      const { notificarAgendamento } = await import("@/lib/whatsapp/notificacoes.server");
      await notificarAgendamento(criadoId, "remarcacao");
    } catch {
      /* o horário já está salvo; a falha fica registrada no envio */
    }
    return novo as unknown as { agendamento_id?: string };
  });

export const cancelarAgendamentoPainel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { agendamentoId: string }) => data)
  .handler(async ({ data, context }) => {
    const { db, tenant } = await tenantPadrao(context);
    await exigirPermissao(context, tenant.id, "agendamento_manual");
    const { data: atual } = await db
      .from("agendamentos")
      .select("id")
      .eq("id", data.agendamentoId)
      .eq("tenant_id", tenant.id)
      .maybeSingle();
    if (!atual) throw new Error("Agendamento não encontrado neste negócio.");
    const { error } = await db.rpc("cancelar_agendamento", { _agendamento_id: atual.id });
    if (error) throw new Error(error.message);
    try {
      const { notificarAgendamento } = await import("@/lib/whatsapp/notificacoes.server");
      await notificarAgendamento(atual.id, "cancelamento");
    } catch {
      /* o cancelamento já está salvo */
    }
    return { ok: true };
  });

/** Mover horário (arrastar na agenda): atualiza o mesmo agendamento; a trava do banco rejeita sobreposição. */
export const moverAgendamentoPainel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (data: {
      agendamentoId: string;
      novoInicio: string;
      /** Valores vistos pela tela; evitam sobrescrever uma edição simultânea. */
      inicioOriginal: string;
      fimOriginal: string;
      profissionalId?: string | null;
      apenasVerificar?: boolean;
      /** Nova duração em minutos (alça da Agenda); sem ela, a duração atual é mantida. */
      novaDuracaoMin?: number;
      /** Avisar o cliente da mudança; sem informar, avisa (comportamento de sempre). */
      avisarCliente?: boolean;
    }) => {
      if (Number.isNaN(new Date(data.novoInicio).getTime())) throw new Error("Horário inválido.");
      if (
        data.novaDuracaoMin !== undefined &&
        (!Number.isInteger(data.novaDuracaoMin) ||
          data.novaDuracaoMin < DURACAO_MIN_MINUTOS ||
          data.novaDuracaoMin > DURACAO_MAX_MINUTOS)
      )
        throw new Error(TEXTO_DO_MOTIVO.duracao);
      return data;
    },
  )
  .handler(async ({ data, context }) => {
    const { db, tenant } = await tenantPadrao(context);
    await exigirPermissao(context, tenant.id, "agendamento_manual");
    const { data: atual } = await db
      .from("agendamentos")
      .select("id, inicio, fim, status, profissional_id, servicos(profissional_ids)")
      .eq("id", data.agendamentoId)
      .eq("tenant_id", tenant.id)
      .maybeSingle();
    if (!atual) throw new Error("Agendamento não encontrado neste negócio.");
    if (
      new Date(atual.inicio).getTime() !== new Date(data.inicioOriginal).getTime() ||
      new Date(atual.fim).getTime() !== new Date(data.fimOriginal).getTime()
    ) {
      throw new Error("Este agendamento mudou enquanto você editava. Confira e tente de novo.");
    }
    if (atual.status !== "agendado" && atual.status !== "chegou")
      throw new Error("Só dá para remarcar quem ainda não começou.");
    const duracao =
      data.novaDuracaoMin !== undefined
        ? data.novaDuracaoMin * 60_000
        : new Date(atual.fim).getTime() - new Date(atual.inicio).getTime();
    const inicio = new Date(data.novoInicio);
    const fim = new Date(inicio.getTime() + duracao);
    // Mesma regra da tela: mudar o início para o passado não vale (esticar quem já começou, sim).
    // Tolerância de 1 minuto para o relógio do aparelho.
    if (
      inicio.getTime() !== new Date(atual.inicio).getTime() &&
      inicio.getTime() < Date.now() - 60_000
    ) {
      if (data.apenasVerificar)
        return { ok: false, livre: false, inicioAnterior: atual.inicio as string };
      throw new Error(TEXTO_DO_MOTIVO.passado);
    }
    const profissionalId = data.profissionalId ?? atual.profissional_id ?? null;
    if (profissionalId && profissionalId !== atual.profissional_id) {
      const { data: prof } = await db
        .from("profissionais")
        .select("id")
        .eq("id", profissionalId)
        .eq("tenant_id", tenant.id)
        .eq("ativo", true)
        .maybeSingle();
      if (!prof) throw new Error("Profissional não encontrado neste negócio.");
      const ids = ((atual as { servicos?: { profissional_ids?: string[] | null } | null }).servicos
        ?.profissional_ids ?? []) as string[];
      if (ids.length && !ids.includes(profissionalId))
        throw new Error("Esse profissional não faz este serviço.");
    }
    // Checagem prévia com as mesmas regras de ocupação; a trava do banco continua valendo.
    if (profissionalId) {
      const { STATUS_QUE_OCUPAM } = await import("@/lib/agenda-regras.server");
      const { data: choques } = await db
        .from("agendamentos")
        .select("id")
        .eq("tenant_id", tenant.id)
        .eq("profissional_id", profissionalId)
        .in("status", [...STATUS_QUE_OCUPAM])
        .neq("id", atual.id)
        .lt("inicio", fim.toISOString())
        .gt("fim", inicio.toISOString())
        .limit(1);
      if (choques?.length) {
        if (data.apenasVerificar)
          return { ok: false, livre: false, inicioAnterior: atual.inicio as string };
        throw new Error("Esse horário já está ocupado para este profissional.");
      }
      const fuso = await fusoDoTenant(tenant.id);
      const diaAlvo = hojeNoFuso(fuso, inicio);
      const desde = new Date(isoNoFusoDaBarbearia(diaAlvo, "00:00", fuso));
      const ate = new Date(
        isoNoFusoDaBarbearia(
          new Date(desde.getTime() + 36 * 60 * 60 * 1000).toISOString().slice(0, 10),
          "00:00",
          fuso,
        ),
      );
      const { ocupacoesExtras } = await import("@/lib/ocupacoes-extras.server");
      const extras = await ocupacoesExtras(db, {
        tenantId: tenant.id,
        fuso,
        desde,
        ate,
        profissionalIds: [profissionalId],
      });
      const extraConflitante = extras.some(
        (ocupacao) =>
          ocupacao.profissional_id === profissionalId &&
          new Date(ocupacao.inicio).getTime() < fim.getTime() &&
          new Date(ocupacao.fim).getTime() > inicio.getTime(),
      );
      if (extraConflitante) {
        if (data.apenasVerificar)
          return { ok: false, livre: false, inicioAnterior: atual.inicio as string };
        throw new Error("Esse horário coincide com um bloqueio ou com a escala do profissional.");
      }
    }
    if (data.apenasVerificar)
      return { ok: true, livre: true, inicioAnterior: atual.inicio as string };
    const { error } = await db
      .from("agendamentos")
      .update({
        inicio: inicio.toISOString(),
        fim: fim.toISOString(),
        ...(profissionalId ? { profissional_id: profissionalId } : {}),
      })
      .eq("id", atual.id)
      .eq("tenant_id", tenant.id);
    if (error) {
      if (error.code === "23P01" || /sobreposicao/i.test(error.message))
        throw new Error("Esse horário já está ocupado.");
      throw new Error(error.message);
    }
    if (data.avisarCliente !== false) {
      try {
        const { notificarAgendamento } = await import("@/lib/whatsapp/notificacoes.server");
        await notificarAgendamento(atual.id, "remarcacao");
      } catch {
        /* o horário já está salvo */
      }
    }
    return {
      ok: true,
      livre: true,
      inicioAnterior: atual.inicio as string,
      fimAnterior: atual.fim as string,
      profissionalAnterior: (atual.profissional_id as string | null) ?? null,
    };
  });

/**
 * Horários livres de um dia para remarcar um atendimento (tela "Reagendar", como no Figaro).
 * Mesmo motor e mesmas regras da validação: expediente, pausa, bloqueios e escala, intervalo
 * entre atendimentos e passo do negócio; o próprio atendimento não conta como ocupação. A
 * equipe pode remarcar para perto do agora (sem a antecedência do link público), nunca para o
 * passado. Só leitura: a gravação continua em `moverAgendamentoPainel`, que confere de novo.
 */
export const getHorariosParaRemarcar = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: { agendamentoId: string; dia: string; profissionalId?: string | null }) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.dia)) throw new Error("Dia inválido");
    return data;
  })
  .handler(
    async ({
      data,
      context,
    }): Promise<{
      fechado: boolean;
      duracaoMin: number;
      horarios: { iso: string; label: string }[];
    }> => {
      const { db, tenant } = await tenantPadrao(context);
      await exigirPermissao(context, tenant.id, "agendamento_manual");
      const { data: atual } = await db
        .from("agendamentos")
        .select("id, inicio, fim, profissional_id")
        .eq("id", data.agendamentoId)
        .eq("tenant_id", tenant.id)
        .maybeSingle();
      if (!atual) throw new Error("Agendamento não encontrado neste negócio.");
      const duracaoMin = Math.max(
        1,
        Math.round((new Date(atual.fim).getTime() - new Date(atual.inicio).getTime()) / 60_000),
      );
      const profissionalId = data.profissionalId ?? atual.profissional_id ?? null;
      if (!profissionalId) return { fechado: false, duracaoMin, horarios: [] };
      const regras = await regrasDaBarbearia(db, tenant.id);
      const desde = new Date(isoNoFusoDaBarbearia(data.dia, "00:00", regras.fuso));
      const ate = new Date(desde.getTime() + 36 * 60 * 60 * 1000);
      const { STATUS_QUE_OCUPAM } = await import("@/lib/agenda-regras.server");
      const { ocupacoesExtras } = await import("@/lib/ocupacoes-extras.server");
      const [{ data: doDia }, extras] = await Promise.all([
        db
          .from("agendamentos")
          .select("inicio, fim")
          .eq("tenant_id", tenant.id)
          .eq("profissional_id", profissionalId)
          .in("status", [...STATUS_QUE_OCUPAM])
          .neq("id", atual.id)
          .lt("inicio", ate.toISOString())
          .gt("fim", desde.toISOString()),
        ocupacoesExtras(db, {
          tenantId: tenant.id,
          fuso: regras.fuso,
          desde,
          ate,
          profissionalIds: [profissionalId],
        }).catch(() => []),
      ]);
      const { horariosDisponiveis } = await import("@/lib/disponibilidade");
      const { fechado, opcoes } = horariosDisponiveis({
        dia: data.dia,
        servico: { id: atual.id, duracao_min: duracaoMin, profissional_ids: null },
        profissionais: [{ id: profissionalId }],
        escolhido: profissionalId,
        horarios: regras.horarios,
        fuso: regras.fuso,
        ocupados: [
          ...(doDia ?? []).map((a) => ({ ...a, profissional_id: profissionalId })),
          ...extras,
        ],
        regras: { antecedenciaMin: 0, intervaloEntreMin: regras.intervaloEntreMin },
        passoMin: regras.passoMin,
      });
      return { fechado, duracaoMin, horarios: opcoes.map(({ iso, label }) => ({ iso, label })) };
    },
  );

export type ProfissionalParaRemarcar = {
  id: string;
  nome: string;
  avatarUrl: string | null;
  expediente: Expediente;
};

/**
 * Equipe que pode receber o atendimento num dia (escolha do profissional no "Reagendar"):
 * só ativos que fazem o serviço, com foto e expediente do dia (horário do negócio + escala).
 * Só leitura.
 */
export const getEquipeParaRemarcar = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: { agendamentoId: string; dia: string }) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.dia)) throw new Error("Dia inválido");
    return data;
  })
  .handler(async ({ data, context }): Promise<ProfissionalParaRemarcar[]> => {
    const { db, tenant } = await tenantPadrao(context);
    await exigirPermissao(context, tenant.id, "agendamento_manual");
    const { data: atual } = await db
      .from("agendamentos")
      .select("id, servicos(profissional_ids)")
      .eq("id", data.agendamentoId)
      .eq("tenant_id", tenant.id)
      .maybeSingle();
    if (!atual) throw new Error("Agendamento não encontrado neste negócio.");
    const fazem = ((atual as { servicos?: { profissional_ids?: string[] | null } | null }).servicos
      ?.profissional_ids ?? []) as string[];
    const equipe = await equipeComExpediente(db, tenant.id, data.dia);
    return equipe.filter((p) => !fazem.length || fazem.includes(p.id));
  });

/** Profissionais ativos com foto e expediente do dia (horário do negócio + escala). */
async function equipeComExpediente(
  db: Awaited<ReturnType<typeof tenantPadrao>>["db"],
  tenantId: string,
  dia: string,
): Promise<ProfissionalParaRemarcar[]> {
  const [regras, { data: profs }, { data: escalas }] = await Promise.all([
    regrasDaBarbearia(db, tenantId),
    db
      .from("profissionais")
      .select("id, nome, avatar_url")
      .eq("tenant_id", tenantId)
      .eq("ativo", true)
      .order("nome"),
    db
      .from("escalas_de_profissional")
      .select("profissional_id, dia_semana, trabalha, abre, fecha")
      .eq("tenant_id", tenantId),
  ]);
  return (profs ?? []).map((p) => ({
    id: p.id,
    nome: p.nome,
    avatarUrl: p.avatar_url ?? null,
    expediente: expedienteDoProfissional(dia, p.id, regras.horarios, escalas ?? []),
  }));
}

/**
 * Equipe do dia para trocar a agenda que está na tela (Figaro `AgendaTeamMemberFilterSheet`:
 * cada pessoa com "Hoje · 09:00 - 18:00."). Só leitura; mesmo acesso da Agenda.
 */
export const getEquipeDoDia = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: { dia: string }) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data?.dia ?? "")) throw new Error("Dia inválido");
    return data;
  })
  .handler(async ({ data, context }): Promise<ProfissionalParaRemarcar[]> => {
    const { db, tenant } = await tenantPadrao(context);
    return equipeComExpediente(db, tenant.id, data.dia);
  });

/**
 * "Trocar Cliente" da ficha (como no Figaro): passa o atendimento para outro cliente do mesmo
 * negócio. Só antes de começar e sem pagamento nem comanda; a confirmação do cliente anterior
 * deixa de valer e os botões que ele recebeu no WhatsApp param de agir sobre este horário. O
 * novo cliente recebe a confirmação do horário (pelo motor único, com o porteiro e as regras do
 * negócio), a menos que a equipe desmarque. Fica registrado na auditoria do negócio.
 */
export const trocarClienteDoAgendamento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { agendamentoId: string; clienteId: string; avisarCliente?: boolean }) => {
    if (!data?.agendamentoId || !data?.clienteId) throw new Error("Escolha o cliente.");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { db, tenant } = await tenantPadrao(context);
    await exigirPermissao(context, tenant.id, "agendamento_manual");
    const { data: atual } = await db
      .from("agendamentos")
      .select("id, inicio, fim, status, cliente_id, pagamento_confirmado_em")
      .eq("id", data.agendamentoId)
      .eq("tenant_id", tenant.id)
      .maybeSingle();
    if (!atual) throw new Error("Agendamento não encontrado neste negócio.");
    if (atual.cliente_id === data.clienteId)
      return { ok: true, clienteAnterior: atual.cliente_id ?? null, avisado: false };
    if (atual.status !== "agendado" && atual.status !== "chegou")
      throw new Error("Só dá para trocar o cliente antes de começar o atendimento.");
    if (atual.pagamento_confirmado_em)
      throw new Error("Este atendimento já tem pagamento confirmado; o cliente não pode mudar.");
    const [{ data: comanda }, { data: cliente }] = await Promise.all([
      db
        .from("comandas")
        .select("id")
        .eq("tenant_id", tenant.id)
        .eq("agendamento_id", atual.id)
        .limit(1),
      db
        .from("clientes")
        .select("id, nome")
        .eq("id", data.clienteId)
        .eq("tenant_id", tenant.id)
        .is("arquivado_em", null)
        .maybeSingle(),
    ]);
    if (comanda?.length)
      throw new Error("Este atendimento já tem comanda; o cliente não pode mudar.");
    if (!cliente) throw new Error("Cliente não encontrado neste negócio.");
    // O novo cliente não pode estar em dois lugares ao mesmo tempo.
    const { STATUS_QUE_OCUPAM } = await import("@/lib/agenda-regras.server");
    const { data: choque } = await db
      .from("agendamentos")
      .select("id")
      .eq("tenant_id", tenant.id)
      .eq("cliente_id", cliente.id)
      .in("status", [...STATUS_QUE_OCUPAM])
      .neq("id", atual.id)
      .lt("inicio", atual.fim)
      .gt("fim", atual.inicio)
      .limit(1);
    if (choque?.length) throw new Error(`${cliente.nome} já tem um horário nesse período.`);
    let atualizacao = db
      .from("agendamentos")
      .update({ cliente_id: cliente.id, confirmado_em: null })
      .eq("id", atual.id)
      .eq("tenant_id", tenant.id);
    atualizacao = atual.cliente_id
      ? atualizacao.eq("cliente_id", atual.cliente_id)
      : atualizacao.is("cliente_id", null);
    const { error } = await atualizacao;
    if (error) throw new Error(error.message);
    // Os avisos do cliente anterior deixam de valer. Sem cliente anterior, não há avisos a invalidar.
    if (atual.cliente_id) {
      await db
        .from("envios_de_whatsapp")
        .update({ aguarda_resposta: false, valido_ate: new Date().toISOString() })
        .eq("tenant_id", tenant.id)
        .eq("agendamento_id", atual.id)
        .eq("cliente_id", atual.cliente_id)
        .then(
          () => null,
          () => null,
        );
    }
    let avisado = false;
    if (data.avisarCliente !== false) {
      try {
        const { notificarAgendamento } = await import("@/lib/whatsapp/notificacoes.server");
        const resultado = await notificarAgendamento(atual.id, "confirmacao_agendamento");
        avisado = resultado.enviado;
      } catch {
        /* a troca já está salva; a falha fica registrada no envio */
      }
    }
    await db
      .from("auditoria_da_barbearia")
      .insert({
        tenant_id: tenant.id,
        ator_user_id: context.userId,
        acao: "agendamento.cliente_trocado",
        alvo: atual.id,
        detalhes: { de: atual.cliente_id, para: cliente.id, avisado },
      })
      .then(
        () => null,
        () => null,
      );
    return { ok: true, clienteAnterior: atual.cliente_id as string, avisado };
  });

/** Quantidade de atendimentos ativos por dia do mês (uma consulta), para os pontinhos da Agenda. */
export const getContagemDoMes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: { mes: string; profissionalId?: string | null }) => {
    if (!/^\d{4}-\d{2}$/.test(data?.mes ?? "")) throw new Error("Mês inválido.");
    return data;
  })
  .handler(async ({ data, context }): Promise<Record<string, number>> => {
    const { db, tenant } = await tenantPadrao(context);
    const fuso = await fusoDoTenant(tenant.id);
    const [a = 1970, m = 1] = data.mes.split("-").map(Number);
    const proximo = m === 12 ? `${a + 1}-01` : `${a}-${String(m + 1).padStart(2, "0")}`;
    const de = isoNoFusoDaBarbearia(`${data.mes}-01`, "00:00", fuso);
    const ate = isoNoFusoDaBarbearia(`${proximo}-01`, "00:00", fuso);
    let q = db
      .from("agendamentos")
      .select("inicio")
      .eq("tenant_id", tenant.id)
      .in("status", ["agendado", "chegou", "na_cadeira", "finalizado"])
      .gte("inicio", de)
      .lt("inicio", ate)
      .limit(5000);
    if (data.profissionalId) q = q.eq("profissional_id", data.profissionalId);
    const { data: linhas } = await q;
    const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: fuso });
    const contagem: Record<string, number> = {};
    for (const l of linhas ?? []) {
      const d = fmt.format(new Date(l.inicio));
      contagem[d] = (contagem[d] ?? 0) + 1;
    }
    return contagem;
  });
