import { createServerFn } from "@tanstack/react-start";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function tenantPadrao() {
  const db = await admin();
  const { data: tenant } = await db
    .from("tenants")
    .select("id, nome")
    .order("criado_em", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!tenant) throw new Error("Nenhuma barbearia cadastrada");
  return { db, tenant };
}

function inicioDoDia(dia?: string) {
  const d = dia ? new Date(`${dia}T00:00:00`) : new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/* ---------------------------------- HOJE --------------------------------- */

export type Alerta = { chave: string; numero: number; titulo: string; detalhe: string };

export type PainelHoje = {
  tenant: { id: string; nome: string };
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

export const getPainelHoje = createServerFn({ method: "GET" }).handler(async (): Promise<PainelHoje> => {
  const { db, tenant } = await tenantPadrao();
  const de = inicioDoDia();
  const ate = new Date(de.getTime() + 24 * 60 * 60 * 1000);
  const agora = Date.now();

  const [agRes, profRes, carteirasRes, regraRes, filaRes] = await Promise.all([
    db
      .from("agendamentos")
      .select(
        "id, inicio, fim, status, forma_pagamento, valor_centavos, clientes(nome), servicos(nome), profissionais(nome)",
      )
      .eq("tenant_id", tenant.id)
      .gte("inicio", de.toISOString())
      .lt("inicio", ate.toISOString())
      .order("inicio"),
    db.from("profissionais").select("id").eq("tenant_id", tenant.id).eq("ativo", true),
    db.from("carteiras").select("id, cliente_id, saldo_creditos, saldo_centavos").eq("tenant_id", tenant.id),
    db
      .from("regras_de_plano")
      .select("tipo, ativo, preco_centavos")
      .eq("tenant_id", tenant.id)
      .eq("tipo", "mensal")
      .maybeSingle(),
    db.from("fila_de_espera").select("id").eq("tenant_id", tenant.id),
  ]);

  const agendamentos = (agRes.data ?? []).filter((a) => a.status !== "cancelado" && a.status !== "falta");
  const carteiras = carteirasRes.data ?? [];

  const { data: baixasHoje } = await db
    .from("movimentos")
    .select("centavos_delta, carteira_id")
    .in("carteira_id", carteiras.map((c) => c.id).length ? carteiras.map((c) => c.id) : ["-"])
    .eq("tipo", "baixa")
    .gte("criado_em", de.toISOString());

  const caixaCentavos =
    agendamentos
      .filter((a) => a.forma_pagamento === "pix" || a.forma_pagamento === "balcao")
      .reduce((s, a) => s + a.valor_centavos, 0) +
    (baixasHoje ?? []).reduce((s, m) => s + Math.max(m.centavos_delta, 0), 0);

  const slotsPorProfissional = 20; // 9h às 19h, 30 em 30
  const totalSlots = Math.max((profRes.data?.length ?? 1) * slotsPorProfissional, 1);
  const ocupados = agendamentos.length;
  const ocupacaoPct = Math.round((ocupados / totalSlots) * 100);

  const fiadoAbertoCentavos = carteiras.reduce((s, c) => s + Math.min(c.saldo_centavos, 0), 0) * -1;
  const assinantes = carteiras.filter((c) => c.saldo_creditos > 0).length;
  const receitaFixaCentavos = regraRes.data?.ativo ? assinantes * (regraRes.data.preco_centavos ?? 0) : 0;

  const emAndamentoRow = agendamentos.find(
    (a) => new Date(a.inicio).getTime() <= agora && new Date(a.fim).getTime() > agora && a.status !== "concluido",
  );

  // Fiado vencendo: débitos abertos com mais de 25 dias.
  const limite25 = new Date(agora - 25 * 24 * 60 * 60 * 1000).toISOString();
  const negativas = carteiras.filter((c) => c.saldo_centavos < 0).map((c) => c.id);
  let fiadoVencendo = 0;
  if (negativas.length) {
    const { data: antigos } = await db
      .from("movimentos")
      .select("carteira_id")
      .in("carteira_id", negativas)
      .eq("tipo", "fiado")
      .lt("centavos_delta", 0)
      .lt("criado_em", limite25);
    fiadoVencendo = new Set((antigos ?? []).map((m) => m.carteira_id)).size;
  }

  // Clientes sem vir há mais de 45 dias.
  const { data: clientes } = await db.from("clientes").select("id").eq("tenant_id", tenant.id);
  const corte45 = new Date(agora - 45 * 24 * 60 * 60 * 1000).toISOString();
  const { data: recentes } = await db
    .from("agendamentos")
    .select("cliente_id")
    .eq("tenant_id", tenant.id)
    .gte("inicio", corte45)
    .neq("status", "cancelado");
  const ativos = new Set((recentes ?? []).map((a) => a.cliente_id));
  const sumidos = (clientes ?? []).filter((c) => !ativos.has(c.id)).length;

  return {
    tenant,
    caixaCentavos,
    ocupacaoPct,
    ocupacaoDetalhe: `${ocupados} de ${totalSlots} horários`,
    fiadoAbertoCentavos,
    assinantes,
    receitaFixaCentavos,
    emAndamento: emAndamentoRow
      ? {
          id: emAndamentoRow.id,
          cliente: emAndamentoRow.clientes?.nome ?? "Cliente",
          servico: emAndamentoRow.servicos?.nome ?? "Serviço",
          profissional: emAndamentoRow.profissionais?.nome ?? "—",
          inicio: emAndamentoRow.inicio,
          fim: emAndamentoRow.fim,
          formaPagamento: emAndamentoRow.forma_pagamento,
          valorCentavos: emAndamentoRow.valor_centavos,
        }
      : null,
    alertas: [
      {
        chave: "fila",
        numero: filaRes.data?.length ?? 0,
        titulo: "na fila de espera",
        detalhe: "Avise quando abrir um horário.",
      },
      {
        chave: "fiado",
        numero: fiadoVencendo,
        titulo: "com fiado vencendo",
        detalhe: "Débitos abertos há mais de 25 dias.",
      },
      {
        chave: "sumidos",
        numero: sumidos,
        titulo: "sem vir há mais de 45 dias",
        detalhe: "Vale uma mensagem para trazer de volta.",
      },
    ],
  };
});

export const finalizarAtendimento = createServerFn({ method: "POST" })
  .inputValidator((data: { agendamentoId: string }) => data)
  .handler(async ({ data }) => {
    const db = await admin();
    const { error } = await db
      .from("agendamentos")
      .update({ status: "concluido" })
      .eq("id", data.agendamentoId);
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
  cliente: string;
  servico: string;
  profissional: string;
};

export type FilaJanela = { id: string; cliente: string; janelaInicio: number | null; janelaFim: number | null };

export type AgendaDia = {
  tenant: { id: string; nome: string };
  dia: string;
  itens: AgendaItem[];
  fila: FilaJanela[];
};

export const getAgendaDia = createServerFn({ method: "GET" })
  .inputValidator((data: { dia?: string | undefined }) => data ?? {})
  .handler(async ({ data }): Promise<AgendaDia> => {
    const { db, tenant } = await tenantPadrao();
    const de = inicioDoDia(data.dia);
    const ate = new Date(de.getTime() + 24 * 60 * 60 * 1000);

    const [agRes, filaRes] = await Promise.all([
      db
        .from("agendamentos")
        .select(
          "id, inicio, fim, status, forma_pagamento, valor_centavos, clientes(nome), servicos(nome), profissionais(nome)",
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
    ]);

    const itens = (agRes.data ?? [])
      .filter((a) => a.status !== "cancelado")
      .map((a) => ({
        id: a.id,
        inicio: a.inicio,
        fim: a.fim,
        status: a.status,
        forma_pagamento: a.forma_pagamento,
        valor_centavos: a.valor_centavos,
        cliente: a.clientes?.nome ?? "Cliente",
        servico: a.servicos?.nome ?? "Serviço",
        profissional: a.profissionais?.nome ?? "—",
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

    const iso = de.toISOString().slice(0, 10);
    return { tenant, dia: iso, itens, fila };
  });

export const avisarFila = createServerFn({ method: "POST" })
  .inputValidator((data: { filaId: string }) => data)
  .handler(async ({ data }) => {
    const db = await admin();
    const { error } = await db
      .from("fila_de_espera")
      .update({ avisado_em: new Date().toISOString() })
      .eq("id", data.filaId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const oferecerHorarioAFila = createServerFn({ method: "POST" })
  .inputValidator((data: { inicioIso: string }) => data)
  .handler(async ({ data }) => {
    const { db, tenant } = await tenantPadrao();
    const hora = new Date(data.inicioIso).getHours();
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
      .eq("id", candidato.id);
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
  };
  emAbertoCentavos: number;
  debitos: Debito[];
  baixas: Debito[];
  maisAntigo: string | null;
};

export const listarClientesBarbeiro = createServerFn({ method: "GET" }).handler(async () => {
  const { db, tenant } = await tenantPadrao();
  const [clientesRes, carteirasRes] = await Promise.all([
    db.from("clientes").select("id, nome, telefone").eq("tenant_id", tenant.id).order("nome"),
    db.from("carteiras").select("cliente_id, saldo_centavos, saldo_creditos").eq("tenant_id", tenant.id),
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
  .inputValidator((data: { clienteId: string }) => data)
  .handler(async ({ data }): Promise<FichaCliente> => {
    const db = await admin();
    const { data: cliente } = await db
      .from("clientes")
      .select("id, nome, telefone, limite_fiado_centavos, ficha_tecnica")
      .eq("id", data.clienteId)
      .maybeSingle();
    if (!cliente) throw new Error("Cliente não encontrado");

    const { data: carteira } = await db
      .from("carteiras")
      .select("id, saldo_centavos")
      .eq("cliente_id", cliente.id)
      .maybeSingle();

    let debitos: Debito[] = [];
    let baixas: Debito[] = [];
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
  .inputValidator((data: { clienteId: string; centavos: number }) => {
    const centavos = Math.round(data.centavos);
    if (centavos <= 0) throw new Error("valor invalido");
    return { clienteId: data.clienteId, centavos };
  })
  .handler(async ({ data }) => {
    const db = await admin();
    const { data: carteira } = await db
      .from("carteiras")
      .select("id, saldo_centavos")
      .eq("cliente_id", data.clienteId)
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

export const getFila = createServerFn({ method: "GET" }).handler(async (): Promise<DadosFila> => {
  const { db, tenant } = await tenantPadrao();

  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);

  const [filaRes, avisadosRes] = await Promise.all([
    db
      .from("fila_de_espera")
      .select("id, posicao, avisado_em, criado_em, janela_preferida, clientes(nome, telefone), profissionais(nome)")
      .eq("tenant_id", tenant.id)
      .order("posicao"),
    db
      .from("fila_de_espera")
      .select("cliente_id, avisado_em")
      .eq("tenant_id", tenant.id)
      .not("avisado_em", "is", null)
      .gte("avisado_em", inicioMes.toISOString()),
  ]);

  const avisados = avisadosRes.data ?? [];
  let recuperadosMes = 0;
  let recuperadoCentavos = 0;
  if (avisados.length) {
    const { data: ags } = await db
      .from("agendamentos")
      .select("cliente_id, criado_em, valor_centavos, status")
      .eq("tenant_id", tenant.id)
      .gte("criado_em", inicioMes.toISOString())
      .neq("status", "cancelado");
    for (const a of ags ?? []) {
      const aviso = avisados.find((v) => v.cliente_id === a.cliente_id);
      if (aviso && aviso.avisado_em && new Date(a.criado_em) >= new Date(aviso.avisado_em)) {
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
  .inputValidator((data: { filaId: string }) => data)
  .handler(async ({ data }) => {
    const db = await admin();
    const { error } = await db.from("fila_de_espera").delete().eq("id", data.filaId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
