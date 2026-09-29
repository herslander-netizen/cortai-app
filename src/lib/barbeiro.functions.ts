import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { tenantIdDoMembro, exigirPermissao, type ContextoAutenticado } from "@/lib/tenant";
import { exigirRecurso } from "@/lib/planos";
import { hojeNoFuso, isoNoFusoDaBarbearia, slotsDoDia } from "@/lib/horarios";
import { motivoForaDoHorario } from "@/lib/disponibilidade";
import { fusoDoTenant } from "@/lib/fuso.server";
import { segmentoValido, type Segmento } from "@/lib/segmentos";
import { mapearHorarios, validarAgendamento } from "@/lib/agenda-regras.server";

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
  .inputValidator((data: { agendamentoId: string }) => data)
  .handler(async ({ data, context }) => {
    const { db, tenant } = await tenantPadrao(context);
    await exigirPermissao(context, tenant.id, "confirmar_pagamento");
    const { error } = await db
      .from("agendamentos")
      .update({ status: "finalizado", status_alterado_por: context.userId })
      .eq("id", data.agendamentoId)
      .eq("tenant_id", tenant.id);
    if (error) throw new Error(error.message);
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
  servico: string;
  duracaoMin: number;
  profissional: string;
  arrivedAt: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  encaixe?: boolean;
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
  fila: FilaJanela[];
  horarios: { diaSemana: number; fechado: boolean; abre: string; fecha: string }[];
  fuso: string;
};

export const getAgendaDia = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { dia?: string | undefined }) => data ?? {})
  .handler(async ({ data, context }): Promise<AgendaDia> => {
    const { db, tenant } = await tenantPadrao(context);
    const fuso = await fusoDoTenant(tenant.id);
    const diaAlvo = data.dia ?? hojeNoFuso(fuso);
    const de = new Date(isoNoFusoDaBarbearia(diaAlvo, "00:00", fuso));
    const ate = new Date(de.getTime() + 24 * 60 * 60 * 1000);

    const [agRes, filaRes, horariosRes] = await Promise.all([
      db
        .from("agendamentos")
        .select(
          "id, inicio, fim, status, forma_pagamento, valor_centavos, cliente_id, arrived_at, started_at, finished_at, confirmado_em, encaixe, clientes(nome, telefone, ficha_tecnica, condicoes_especiais), servicos(nome, duracao_min), profissionais(nome)",
        )
        .eq("tenant_id", tenant.id)
        .gte("inicio", de.toISOString())
        .lt("inicio", ate.toISOString())
        .order("inicio"),
      db
        .from("fila_de_espera")
        .select("id, janela_preferida, clientes(nome)")
        .eq("tenant_id", tenant.id)
        .order("posicao"),
      db
        .from("horarios_de_funcionamento")
        .select("dia_semana, fechado, abre, fecha")
        .eq("tenant_id", tenant.id)
        .order("dia_semana"),
    ]);

    const itens = (agRes.data ?? []).map((a) => ({
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
      confirmadoEm: (a as { confirmado_em?: string | null }).confirmado_em ?? null,
      encaixe: Boolean((a as { encaixe?: boolean | null }).encaixe),
    }));

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
    }));
    return { tenant, dia: iso, itens, fila, horarios, fuso };
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
  .inputValidator(
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
        "id, inicio, fim, status, cliente_id, arrived_at, started_at, finished_at, confirmado_em, clientes(nome, telefone, ficha_tecnica, condicoes_especiais), servicos(nome, duracao_min), profissionais(nome)",
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
  .inputValidator((data: { filaId: string }) => data)
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
  .inputValidator((data: { inicioIso: string }) => data)
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
  .inputValidator((data: { clienteId: string }) => data)
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
  .inputValidator((data: { clienteId: string; centavos: number }) => {
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

export type FilaItem = {
  id: string;
  posicao: number;
  cliente: string;
  telefone: string;
  profissional: string | null;
  janelaInicio: number | null;
  janelaFim: number | null;
  avisado_em: string | null;
  criado_em: string;
};

export type DadosFila = {
  itens: FilaItem[];
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

    const [filaRes, avisadosRes] = await Promise.all([
      db
        .from("fila_de_espera")
        .select(
          "id, posicao, avisado_em, criado_em, janela_preferida, clientes(nome, telefone), profissionais(nome)",
        )
        .eq("tenant_id", tenant.id)
        .order("posicao"),
      db
        .from("fila_de_espera")
        .select("cliente_id, avisado_em")
        .eq("tenant_id", tenant.id)
        .not("avisado_em", "is", null)
        .gte("avisado_em", inicioMes)
        .order("avisado_em", { ascending: true }),
    ]);

    const avisados = avisadosRes.data ?? [];
    let recuperadosMes = 0;
    let recuperadoCentavos = 0;
    if (avisados.length) {
      const { data: ags } = await db
        .from("agendamentos")
        .select("cliente_id, criado_em, valor_centavos, status")
        .eq("tenant_id", tenant.id)
        .gte("criado_em", inicioMes)
        .neq("status", "cancelado");
      const primeiroAvisoPorCliente = new Map<string, string>();
      for (const aviso of avisados) {
        if (
          aviso.cliente_id &&
          aviso.avisado_em &&
          !primeiroAvisoPorCliente.has(aviso.cliente_id)
        ) {
          primeiroAvisoPorCliente.set(aviso.cliente_id, aviso.avisado_em);
        }
      }
      for (const a of ags ?? []) {
        const avisadoEm = a.cliente_id ? primeiroAvisoPorCliente.get(a.cliente_id) : undefined;
        if (avisadoEm && new Date(a.criado_em) >= new Date(avisadoEm)) {
          recuperadosMes += 1;
          recuperadoCentavos += a.valor_centavos;
        }
      }
    }

    const itens = (filaRes.data ?? []).map((f, i) => {
      const j = (f.janela_preferida ?? null) as { inicio?: number; fim?: number } | null;
      return {
        id: f.id,
        posicao: f.posicao || i + 1,
        cliente: f.clientes?.nome ?? "Cliente",
        telefone: f.clientes?.telefone ?? "",
        profissional: f.profissionais?.nome ?? null,
        janelaInicio: typeof j?.inicio === "number" ? j.inicio : null,
        janelaFim: typeof j?.fim === "number" ? j.fim : null,
        avisado_em: f.avisado_em,
        criado_em: f.criado_em,
      };
    });

    return { itens, recuperadosMes, recuperadoCentavos };
  });

export const removerDaFila = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { filaId: string }) => data)
  .handler(async ({ data, context }) => {
    const { db, tenant } = await tenantPadrao(context);
    await exigirRecurso(db, tenant.id, "fila_espera");
    await exigirPermissao(context, tenant.id, "agendamento_manual");
    const { error } = await db
      .from("fila_de_espera")
      .delete()
      .eq("id", data.filaId)
      .eq("tenant_id", tenant.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* -------------------------- CICLO DE VIDA DO CLIENTE ---------------------- */

/** Arquivar é reversível: some das listas, mas nada de histórico é apagado. */
export const arquivarCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { clienteId: string; arquivar: boolean }) => ({
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
  .inputValidator((data: { clienteId: string }) => ({
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
  servicos: { id: string; nome: string; duracao_min: number; preco_centavos: number }[];
  profissionais: { id: string; nome: string }[];
  horarios: ReturnType<typeof mapearHorarios>;
  fuso: string;
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
        .select("id, nome, duracao_min, preco_centavos")
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
    return {
      tenant,
      servicos: servicosRes.data ?? [],
      profissionais: profRes.data ?? [],
      horarios: mapearHorarios(horariosRes.data ?? []),
      fuso: await fusoDoTenant(tenant.id),
    };
  });

/** Busca clientes SOMENTE da barbearia do usuário logado, por nome ou telefone. */
export const buscarClientesDaBarbearia = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { termo?: string | undefined }) => ({
    termo: (data?.termo ?? "").trim().slice(0, 60),
  }))
  .handler(async ({ data, context }) => {
    const { db, tenant } = await tenantPadrao(context);
    let q = db
      .from("clientes")
      .select("id, nome, telefone")
      .eq("tenant_id", tenant.id)
      .is("arquivado_em", null)
      .order("nome")
      .limit(8);
    if (data.termo) {
      const t = data.termo.replace(/[%,()]/g, "");
      q = q.or(`nome.ilike.%${t}%,telefone.ilike.%${t}%`);
    }
    if (!data.termo) {
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
  .inputValidator(
    (data: {
      clienteId?: string | undefined;
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
    if (!servico) throw new Error("Serviço não encontrado nesta barbearia.");

    const { data: prof } = await db
      .from("profissionais")
      .select("id")
      .eq("id", data.profissionalId)
      .eq("tenant_id", tenant.id)
      .maybeSingle();
    if (!prof) throw new Error("Profissional não encontrado nesta barbearia.");

    // 1. Resolver a referência do cliente sem criar uma ficha ainda.
    let clienteId = data.clienteId ?? null;
    let clienteNome = "";
    let clienteCriado = false;
    if (clienteId) {
      const { data: c } = await db
        .from("clientes")
        .select("id, nome")
        .eq("id", clienteId)
        .eq("tenant_id", tenant.id)
        .maybeSingle();
      if (!c) throw new Error("Cliente não encontrado nesta barbearia.");
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
        if (conflitoCliente) throw new Error(`O cliente já tem um horário às ${conflitoCliente.hora}.`);
      } catch (erro) {
        const mensagem = erro instanceof Error ? erro.message : "Horário indisponível.";
        if (mensagem.includes("acabou de ser reservado")) {
          return { ok: false, conflito: { mensagem: "Esse horário já tem agendamento. Encaixar mesmo assim?", sugestoes: [], podeEncaixar: true } };
        }
        throw erro;
      }
    }

    // 3. Só agora cria o cliente novo; uma falha de disponibilidade nunca deixa cadastro órfão.
    if (!clienteId) {
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
    const dia = new Date(inicio);
    dia.setHours(0, 0, 0, 0);
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

    const sugerir = () => {
      const sugestoes: { iso: string; label: string }[] = [];
      for (let h = 9; h < 19 && sugestoes.length < 4; h++) {
        for (const m of [0, 30]) {
          const cand = new Date(dia);
          cand.setHours(h, m, 0, 0);
          if (cand.getTime() <= Date.now()) continue;
          const candFim = cand.getTime() + servico.duracao_min * 60000;
          if (livre(cand.getTime(), candFim) && sugestoes.length < 4) {
            sugestoes.push({
              iso: cand.toISOString(),
              label: `${String(h).padStart(2, "0")}:${m === 0 ? "00" : "30"}`,
            });
          }
        }
      }
      return sugestoes;
    };
    const conflitoDoPainel = (): ResultadoManual => ({
      ok: false,
      conflito: {
        mensagem: "Esse horário já tem agendamento. Encaixar mesmo assim?",
        sugestoes: sugerir(),
        podeEncaixar: true,
      },
    });

    if (!data.encaixe && !livre(inicio.getTime(), fim.getTime())) {
      if (clienteCriado) await db.from("clientes").delete().eq("id", clienteId);
      return conflitoDoPainel();
    }

    // 5. Criar pelas mesmas regras do app e marcar a origem como manual.
    const { data: res, error } = await db.rpc("criar_agendamento", {
      _tenant_id: tenant.id,
      _cliente_id: clienteId,
      _profissional_id: data.profissionalId,
      _servico_id: data.servicoId,
      _inicio: inicio.toISOString(),
      _forma_pagamento: data.formaPagamento,
      _encaixe: Boolean(data.encaixe),
    });
    if (error) {
      if (clienteCriado) await db.from("clientes").delete().eq("id", clienteId);
      if (error.message.includes("horario ja ocupado")) return conflitoDoPainel();
      throw new Error(error.message);
    }
    const criado = res as unknown as { agendamento_id: string; inicio: string };
    await db.from("agendamentos").update({ origem: "manual" }).eq("id", criado.agendamento_id);

    // Fila de eventos da integração de IA: nunca interfere no agendamento.
    const { emitirEvento } = await import("@/lib/ia/eventos.server");
    await emitirEvento(tenant.id, "appointment_created", criado.agendamento_id, {
      inicio: criado.inicio,
      origem: "manual",
    });

    // Confirmação pelo WhatsApp: nunca bloqueia nem derruba o agendamento.
    try {
      const { enviarConfirmacaoDeAgendamento } = await import("@/lib/whatsapp/confirmacao.server");
      await enviarConfirmacaoDeAgendamento(criado.agendamento_id);
    } catch {
      /* o agendamento já está salvo; a falha fica registrada no envio */
    }

    return { ok: true, agendamentoId: criado.agendamento_id, inicio: criado.inicio, clienteNome };
  });

/** Próximo horário realmente livre (hoje, dentro do funcionamento) para "atender agora". */
export const getProximoHorarioLivre = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
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
    const grade = slotsDoDia(dia, horarios, 30, fuso);
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
  .inputValidator(
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
  .inputValidator((data: { agendamentoId: string; novoInicio: string }) => data)
  .handler(async ({ data, context }) => {
    const { db, tenant } = await tenantPadrao(context);
    await exigirPermissao(context, tenant.id, "agendamento_manual");
    const { data: atual } = await db
      .from("agendamentos")
      .select("id, cliente_id, servico_id, profissional_id, forma_pagamento")
      .eq("id", data.agendamentoId)
      .eq("tenant_id", tenant.id)
      .maybeSingle();
    if (!atual) throw new Error("Agendamento não encontrado nesta barbearia.");
    if (!atual.profissional_id || !atual.servico_id) {
      throw new Error("Esse atendimento não pode ser remarcado por aqui.");
    }
    const { error: erroCancelar } = await db.rpc("cancelar_agendamento", {
      _agendamento_id: atual.id,
    });
    if (erroCancelar) throw new Error(erroCancelar.message);
    const { data: novo, error } = await db.rpc("criar_agendamento", {
      _tenant_id: tenant.id,
      _cliente_id: atual.cliente_id,
      _profissional_id: atual.profissional_id,
      _servico_id: atual.servico_id,
      _inicio: data.novoInicio,
      _forma_pagamento: atual.forma_pagamento ?? "balcao",
    });
    if (error) throw new Error(error.message);
    const criadoId = (novo as { agendamento_id?: string } | null)?.agendamento_id;
    // Aviso de remarcação: nunca bloqueia o novo horário.
    if (criadoId) {
      try {
        const { notificarAgendamento } = await import("@/lib/whatsapp/notificacoes.server");
        await notificarAgendamento(criadoId, "remarcacao");
      } catch {
        /* o horário já está salvo; a falha fica registrada no envio */
      }
    }
    return novo as unknown as { agendamento_id?: string };
  });

export const cancelarAgendamentoPainel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { agendamentoId: string }) => data)
  .handler(async ({ data, context }) => {
    const { db, tenant } = await tenantPadrao(context);
    await exigirPermissao(context, tenant.id, "agendamento_manual");
    const { data: atual } = await db
      .from("agendamentos")
      .select("id")
      .eq("id", data.agendamentoId)
      .eq("tenant_id", tenant.id)
      .maybeSingle();
    if (!atual) throw new Error("Agendamento não encontrado nesta barbearia.");
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
  .inputValidator((data: { agendamentoId: string; novoInicio: string }) => {
    if (Number.isNaN(new Date(data.novoInicio).getTime())) throw new Error("Horário inválido.");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { db, tenant } = await tenantPadrao(context);
    await exigirPermissao(context, tenant.id, "agendamento_manual");
    const { data: atual } = await db
      .from("agendamentos")
      .select("id, inicio, fim, status")
      .eq("id", data.agendamentoId)
      .eq("tenant_id", tenant.id)
      .maybeSingle();
    if (!atual) throw new Error("Agendamento não encontrado nesta barbearia.");
    if (atual.status !== "agendado" && atual.status !== "chegou")
      throw new Error("Só dá para remarcar quem ainda não começou.");
    const duracao = new Date(atual.fim).getTime() - new Date(atual.inicio).getTime();
    const inicio = new Date(data.novoInicio);
    const { error } = await db
      .from("agendamentos")
      .update({
        inicio: inicio.toISOString(),
        fim: new Date(inicio.getTime() + duracao).toISOString(),
      })
      .eq("id", atual.id)
      .eq("tenant_id", tenant.id);
    if (error) {
      if (error.code === "23P01" || /sobreposicao/i.test(error.message))
        throw new Error("Esse horário já está ocupado.");
      throw new Error(error.message);
    }
    try {
      const { notificarAgendamento } = await import("@/lib/whatsapp/notificacoes.server");
      await notificarAgendamento(atual.id, "remarcacao");
    } catch {
      /* o horário já está salvo */
    }
    return { ok: true, inicioAnterior: atual.inicio as string };
  });
