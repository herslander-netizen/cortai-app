import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { tenantIdDoMembro, type ContextoAutenticado } from "@/lib/tenant";
import { slotsDoDia, type HorarioDeFuncionamento } from "@/lib/horarios";
import { calcularOportunidades, type Oportunidade } from "@/lib/painel/oportunidades.server";

const DIA = 24 * 60 * 60 * 1000;

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function pode(context: ContextoAutenticado, tenantId: string, permissao: string): Promise<boolean> {
  const { data } = await context.supabase.rpc("has_tenant_permission", {
    _tenant_id: tenantId,
    _permission: permissao,
  });
  return Boolean(data);
}

export type ItemDeAtencao = {
  chave: string;
  nivel: "urgente" | "atencao" | "ok";
  titulo: string;
  detalhe: string;
  destino: string;
};

export type ProximoAtendimento = {
  id: string;
  inicio: string;
  cliente: string;
  servico: string;
  profissional: string;
  status: string;
};

export type PainelDeControle = {
  saudacao: { nome: string | null; periodo: "manha" | "tarde" | "noite"; barbearia: string };
  permissoes: { financeiro: boolean; clientes: boolean; cortai: boolean; relatorios: boolean };
  hoje: {
    faturamentoCentavos: number | null;
    atendimentos: number;
    ticketMedioCentavos: number | null;
    ocupacaoPct: number | null;
    horariosLivres: number | null;
    horariosConfigurados: boolean;
    cancelamentos: number;
    faltas: number;
    clientesNovos: number;
    clientesRecorrentes: number;
  };
  agenda: {
    proximos: ProximoAtendimento[];
    ocupados: number;
    livres: number | null;
    emAtendimento: { profissional: string; cliente: string; fim: string }[];
    encaixes: number;
    naFila: number;
    cancelamentosRecentes: number;
  };
  atencao: ItemDeAtencao[];
  movimentos: Oportunidade[];
  clientes: {
    total: number;
    novosMes: number;
    recorrentes: number;
    inativos: number;
    retornosProximos: number;
    fidelidade: number;
    comSaldo: number | null;
  } | null;
  financeiro: {
    entradasCentavos: number;
    saidasCentavos: number;
    liquidoCentavos: number;
    fiadoAbertoCentavos: number;
    caixaAberto: boolean;
    comissoesPendentesCentavos: number | null;
  } | null;
  profissionais: {
    nome: string;
    atendimentos: number;
    ocupacaoPct: number | null;
    faturamentoCentavos: number | null;
  }[];
  atendimento: { comIa: number; aguardandoHumano: number; encerradas: number } | null;
  base: { temClientes: boolean; temAgenda: boolean; temFaturamento: boolean };
  atualizadoEm: string;
};

/**
 * Painel de Controle da Operação — uma única leitura agregada da barbearia.
 * Cada bloco sensível só é calculado quando a permissão real do usuário
 * permite; a checagem acontece aqui no servidor, nunca só na tela.
 */
export const getPainelDeControle = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PainelDeControle> => {
    const ctx = context as unknown as ContextoAutenticado;
    const tenantId = await tenantIdDoMembro(ctx);
    const db = await admin();

    const [podeFinanceiro, podeClientes, podeCortai, podeRelatorios, podeComissoes] = await Promise.all([
      pode(ctx, tenantId, "visualizar_financeiro"),
      pode(ctx, tenantId, "visualizar_clientes"),
      pode(ctx, tenantId, "ver_cortai"),
      pode(ctx, tenantId, "relatorios"),
      pode(ctx, tenantId, "comissao_visualizar_todas"),
    ]);

    const agora = Date.now();
    const inicioDoDia = new Date();
    inicioDoDia.setHours(0, 0, 0, 0);
    const fimDoDia = new Date(inicioDoDia.getTime() + DIA);
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);
    const diaIso = new Date(inicioDoDia.getTime() - inicioDoDia.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 10);

    const [
      tenantRes,
      perfilRes,
      horariosRes,
      profRes,
      agHojeRes,
      histRes,
      clientesRes,
      filaRes,
      carteirasRes,
      produtosRes,
      avaliacoesRes,
      concluidosRes,
    ] = await Promise.all([
      db.from("tenants").select("id, nome").eq("id", tenantId).maybeSingle(),
      db.from("perfis").select("nome").eq("user_id", ctx.userId).maybeSingle(),
      db.from("horarios_de_funcionamento").select("dia_semana, fechado, abre, fecha").eq("tenant_id", tenantId),
      db.from("profissionais").select("id, nome").eq("tenant_id", tenantId).eq("ativo", true),
      db
        .from("agendamentos")
        .select(
          "id, inicio, fim, status, origem, valor_centavos, cliente_id, profissional_id, clientes(nome), servicos(nome), profissionais(nome)",
        )
        .eq("tenant_id", tenantId)
        .gte("inicio", inicioDoDia.toISOString())
        .lt("inicio", fimDoDia.toISOString())
        .order("inicio"),
      db
        .from("agendamentos")
        .select("cliente_id, inicio, status")
        .eq("tenant_id", tenantId)
        .not("status", "in", "(cancelado,falta)"),
      db.from("clientes").select("id, criado_em").eq("tenant_id", tenantId),
      db.from("fila_de_espera").select("id").eq("tenant_id", tenantId),
      db
        .from("carteiras")
        .select("id, saldo_centavos, saldo_creditos, fidelidade_progresso")
        .eq("tenant_id", tenantId),
      db.from("produtos").select("id, nome, quantidade, estoque_minimo").eq("tenant_id", tenantId).eq("ativo", true),
      db.from("avaliacoes").select("agendamento_id").eq("tenant_id", tenantId),
      db
        .from("agendamentos")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("status", "concluido")
        .gte("inicio", new Date(agora - 30 * DIA).toISOString()),
    ]);

    const horarios: HorarioDeFuncionamento[] = (horariosRes.data ?? []).map((h: any) => ({
      diaSemana: h.dia_semana as number,
      fechado: Boolean(h.fechado),
      abre: String(h.abre).slice(0, 5),
      fecha: String(h.fecha).slice(0, 5),
    }));
    const horariosConfigurados = horarios.length > 0;
    const grade = slotsDoDia(diaIso, horarios);
    const profissionais = profRes.data ?? [];
    const totalSlots = horariosConfigurados && !grade.fechado ? grade.slots.length * Math.max(profissionais.length, 1) : 0;

    const agendamentosHoje = (agHojeRes.data ?? []) as any[];
    const ativosHoje = agendamentosHoje.filter((a) => a.status !== "cancelado" && a.status !== "falta");
    const cancelamentos = agendamentosHoje.filter((a) => a.status === "cancelado");
    const faltas = agendamentosHoje.filter((a) => a.status === "falta").length;
    const encaixes = ativosHoje.filter((a) => a.origem === "manual" || a.origem === "encaixe").length;

    const ocupacaoPct = totalSlots > 0 ? Math.min(100, Math.round((ativosHoje.length / totalSlots) * 100)) : null;
    const horariosLivres = totalSlots > 0 ? Math.max(0, totalSlots - ativosHoje.length) : null;

    // Histórico por cliente: recorrência, retorno próximo e inatividade.
    const porCliente = new Map<string, number[]>();
    for (const a of (histRes.data ?? []) as any[]) {
      const t = new Date(a.inicio).getTime();
      if (t > agora) continue;
      const lista = porCliente.get(a.cliente_id) ?? [];
      lista.push(t);
      porCliente.set(a.cliente_id, lista);
    }
    let recorrentes = 0;
    let inativos = 0;
    let retornosProximos = 0;
    for (const datas of porCliente.values()) {
      datas.sort((a, b) => a - b);
      if (datas.length >= 2) recorrentes += 1;
      let intervalo = 30;
      if (datas.length >= 2) {
        let soma = 0;
        for (let i = 1; i < datas.length; i += 1) soma += datas[i]! - datas[i - 1]!;
        intervalo = Math.max(1, Math.round(soma / (datas.length - 1) / DIA));
      }
      const dias = (agora - datas[datas.length - 1]!) / DIA;
      if (dias > intervalo * 1.5) inativos += 1;
      else if (dias >= intervalo * 0.8) retornosProximos += 1;
    }

    const clientes = clientesRes.data ?? [];
    const idsComHistorico = new Set(porCliente.keys());
    const clientesNovosHoje = ativosHoje.filter(
      (a) => a.cliente_id && !idsComHistorico.has(a.cliente_id),
    ).length;
    const clientesRecorrentesHoje = ativosHoje.filter(
      (a) => a.cliente_id && (porCliente.get(a.cliente_id)?.length ?? 0) >= 1,
    ).length;

    const carteiras = carteirasRes.data ?? [];
    const estoqueBaixo = (produtosRes.data ?? []).filter((p: any) => p.quantidade <= p.estoque_minimo);
    const avaliadas = new Set((avaliacoesRes.data ?? []).map((a: any) => a.agendamento_id));
    const avaliacoesPendentes = (concluidosRes.data ?? []).filter((a: any) => !avaliadas.has(a.id)).length;

    // Fiado vencido: débito aberto há mais de 25 dias.
    const negativas = carteiras.filter((c: any) => c.saldo_centavos < 0).map((c: any) => c.id);
    let fiadoVencido = 0;
    if (negativas.length) {
      const { data: antigos } = await db
        .from("movimentos")
        .select("carteira_id")
        .in("carteira_id", negativas)
        .eq("tipo", "fiado")
        .lt("centavos_delta", 0)
        .lt("criado_em", new Date(agora - 25 * DIA).toISOString());
      fiadoVencido = new Set((antigos ?? []).map((m: any) => m.carteira_id)).size;
    }

    // Financeiro: mesma fonte do módulo de caixa, para o número bater.
    let financeiro: PainelDeControle["financeiro"] = null;
    let faturamentoCentavos: number | null = null;
    if (podeFinanceiro) {
      const [movRes, fiadosRes, sessaoRes, comissoesRes] = await Promise.all([
        db
          .from("caixa_movimentos")
          .select("tipo, valor_centavos")
          .eq("tenant_id", tenantId)
          .gte("criado_em", inicioDoDia.toISOString()),
        db.from("fiados").select("saldo_centavos").eq("tenant_id", tenantId).in("status", ["pendente", "parcial"]),
        db.from("caixa_sessoes").select("id").eq("tenant_id", tenantId).eq("status", "aberto").maybeSingle(),
        podeComissoes
          ? db
              .from("comissoes")
              .select("valor_centavos, status")
              .eq("tenant_id", tenantId)
              .gte("criado_em", inicioMes.toISOString())
          : Promise.resolve({ data: null } as any),
      ]);
      const movimentos = (movRes.data ?? []) as any[];
      const entradas = movimentos.filter((m) => m.tipo === "entrada").reduce((s, m) => s + m.valor_centavos, 0);
      const saidas = movimentos.filter((m) => m.tipo !== "entrada").reduce((s, m) => s + m.valor_centavos, 0);
      faturamentoCentavos = entradas;
      financeiro = {
        entradasCentavos: entradas,
        saidasCentavos: saidas,
        liquidoCentavos: entradas - saidas,
        fiadoAbertoCentavos: ((fiadosRes.data ?? []) as any[]).reduce((s, f) => s + f.saldo_centavos, 0),
        caixaAberto: Boolean(sessaoRes.data),
        comissoesPendentesCentavos: podeComissoes
          ? ((comissoesRes.data ?? []) as any[])
              .filter((c) => c.status !== "paga")
              .reduce((s, c) => s + c.valor_centavos, 0)
          : null,
      };
    }

    // Atendimento no WhatsApp.
    let atendimento: PainelDeControle["atendimento"] = null;
    if (podeCortai) {
      const [ativas, humanas, encerradas] = await Promise.all([
        db
          .from("conversas_whatsapp")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .eq("status", "ativa"),
        db
          .from("conversas_whatsapp")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .eq("status", "humano"),
        db
          .from("conversas_whatsapp")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .eq("status", "encerrada"),
      ]);
      atendimento = {
        comIa: ativas.count ?? 0,
        aguardandoHumano: humanas.count ?? 0,
        encerradas: encerradas.count ?? 0,
      };
    }

    // Profissionais do dia.
    const porProfissional = profissionais.map((p: any) => {
      const meus = ativosHoje.filter((a) => a.profissional_id === p.id);
      const slots = horariosConfigurados && !grade.fechado ? grade.slots.length : 0;
      return {
        nome: p.nome as string,
        atendimentos: meus.length,
        ocupacaoPct: slots > 0 ? Math.min(100, Math.round((meus.length / slots) * 100)) : null,
        faturamentoCentavos: podeFinanceiro ? meus.reduce((s, a) => s + (a.valor_centavos ?? 0), 0) : null,
      };
    });

    // Próximo horário vago de hoje.
    const ocupadosIso = new Set(ativosHoje.map((a) => new Date(a.inicio).getTime()));
    const proximoVago =
      grade.slots.find((s) => {
        const t = new Date(s.iso).getTime();
        return t > agora && !ocupadosIso.has(t);
      }) ?? null;

    const movimentos = calcularOportunidades({
      proximoHorarioVago: proximoVago ? { label: proximoVago.label } : null,
      horariosVagosHoje: horariosLivres ?? 0,
      retornosProximos: podeClientes ? retornosProximos : 0,
      inativos: podeClientes ? inativos : 0,
      naFila: filaRes.data?.length ?? 0,
      canceladosHoje: {
        label: cancelamentos[0] ? new Date(cancelamentos[0].inicio).toISOString().slice(11, 16) : null,
        quantidade: cancelamentos.length,
      },
      profissionaisBaixaOcupacao: porProfissional
        .filter((p) => p.ocupacaoPct !== null && p.ocupacaoPct < 30 && profissionais.length > 1)
        .map((p) => ({ nome: p.nome, ocupacaoPct: p.ocupacaoPct as number })),
      fiadoVencido: podeFinanceiro ? fiadoVencido : 0,
      avaliacoesPendentes,
      estoqueBaixo: estoqueBaixo.map((p: any) => ({ nome: p.nome as string })),
      aguardandoHumano: atendimento?.aguardandoHumano ?? 0,
    });

    // Precisa de atenção — só a partir de regra real.
    const atencao: ItemDeAtencao[] = [];
    const proximasHoras = ativosHoje.filter((a) => {
      const t = new Date(a.inicio).getTime();
      return t > agora && t < agora + 3 * 60 * 60 * 1000;
    });
    if (proximoVago && proximasHoras.length === 0 && grade.slots.length > 0) {
      atencao.push({
        chave: "vazio",
        nivel: "urgente",
        titulo: `Nenhum atendimento nas próximas horas`,
        detalhe: `O próximo horário livre é às ${proximoVago.label}.`,
        destino: "/barbeiro/agenda",
      });
    }
    if ((filaRes.data?.length ?? 0) > 0) {
      atencao.push({
        chave: "fila",
        nivel: "atencao",
        titulo: `${filaRes.data!.length} na fila de espera`,
        detalhe: "Tem cliente esperando encaixe.",
        destino: "/barbeiro/fila",
      });
    }
    if (cancelamentos.length > 0) {
      atencao.push({
        chave: "cancelamento",
        nivel: "atencao",
        titulo: `${cancelamentos.length} ${cancelamentos.length === 1 ? "cancelamento" : "cancelamentos"} hoje`,
        detalhe: "Horário livre para preencher.",
        destino: "/barbeiro/agenda",
      });
    }
    if (atendimento && atendimento.aguardandoHumano > 0) {
      atencao.push({
        chave: "humano",
        nivel: "urgente",
        titulo: `${atendimento.aguardandoHumano} ${atendimento.aguardandoHumano === 1 ? "conversa aguarda" : "conversas aguardam"} você`,
        detalhe: "O cliente pediu para falar com a barbearia.",
        destino: "/barbeiro/cortai",
      });
    }
    if (financeiro && financeiro.fiadoAbertoCentavos > 0) {
      atencao.push({
        chave: "fiado",
        nivel: "atencao",
        titulo: "Pagamentos pendentes em aberto",
        detalhe: "Fiados ainda não quitados.",
        destino: "/barbeiro/caixa",
      });
    }

    const ticketBase = ativosHoje.filter((a) => (a.valor_centavos ?? 0) > 0);
    const receitaAgendada = ticketBase.reduce((s, a) => s + (a.valor_centavos ?? 0), 0);

    const horaLocal = Number(
      new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", hour12: false, timeZone: "America/Sao_Paulo" }).format(
        new Date(),
      ),
    );

    return {
      saudacao: {
        nome: (perfilRes.data?.nome as string) ?? null,
        periodo: horaLocal < 12 ? "manha" : horaLocal < 18 ? "tarde" : "noite",
        barbearia: (tenantRes.data?.nome as string) ?? "Sua barbearia",
      },
      permissoes: {
        financeiro: podeFinanceiro,
        clientes: podeClientes,
        cortai: podeCortai,
        relatorios: podeRelatorios,
      },
      hoje: {
        faturamentoCentavos,
        atendimentos: ativosHoje.length,
        ticketMedioCentavos:
          podeFinanceiro && ticketBase.length ? Math.round(receitaAgendada / ticketBase.length) : null,
        ocupacaoPct,
        horariosLivres,
        horariosConfigurados,
        cancelamentos: cancelamentos.length,
        faltas,
        clientesNovos: clientesNovosHoje,
        clientesRecorrentes: clientesRecorrentesHoje,
      },
      agenda: {
        proximos: ativosHoje
          .filter((a) => new Date(a.inicio).getTime() > agora)
          .slice(0, 4)
          .map((a) => ({
            id: a.id as string,
            inicio: a.inicio as string,
            cliente: a.clientes?.nome ?? "Cliente",
            servico: a.servicos?.nome ?? "Serviço",
            profissional: a.profissionais?.nome ?? "—",
            status: a.status as string,
          })),
        ocupados: ativosHoje.length,
        livres: horariosLivres,
        emAtendimento: ativosHoje
          .filter((a) => new Date(a.inicio).getTime() <= agora && new Date(a.fim).getTime() > agora)
          .map((a) => ({
            profissional: a.profissionais?.nome ?? "—",
            cliente: a.clientes?.nome ?? "Cliente",
            fim: a.fim as string,
          })),
        encaixes,
        naFila: filaRes.data?.length ?? 0,
        cancelamentosRecentes: cancelamentos.length,
      },
      atencao,
      movimentos,
      clientes: podeClientes
        ? {
            total: clientes.length,
            novosMes: clientes.filter((c: any) => new Date(c.criado_em) >= inicioMes).length,
            recorrentes,
            inativos,
            retornosProximos,
            fidelidade: carteiras.filter((c: any) => (c.fidelidade_progresso ?? 0) > 0).length,
            comSaldo: podeFinanceiro
              ? carteiras.filter((c: any) => c.saldo_centavos > 0 || c.saldo_creditos > 0).length
              : null,
          }
        : null,
      financeiro,
      profissionais: porProfissional,
      atendimento,
      base: {
        temClientes: clientes.length > 0,
        temAgenda: agendamentosHoje.length > 0,
        temFaturamento: (faturamentoCentavos ?? 0) > 0,
      },
      atualizadoEm: new Date().toISOString(),
    };
  });
