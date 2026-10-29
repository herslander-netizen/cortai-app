import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { clienteDoUsuario, fichasDoUsuario } from "@/lib/cliente";
import { hojeNoFuso, somarDias, type ExcecaoIntervaloAgenda, type HorarioDeFuncionamento } from "@/lib/horarios";

export type Ocupado = { profissional_id: string | null; inicio: string; fim: string };

export type DadosAgendar = {
  tenant: { id: string; nome: string; rotulo_carteira: string | null; slug?: string | undefined };
  cliente: { id: string; nome: string; limite_fiado_centavos: number };
  servicos: {
    id: string;
    nome: string;
    duracao_min: number;
    preco_centavos: number;
    profissional_ids: string[] | null;
  }[];
  profissionais: { id: string; nome: string }[];
  fuso: string;
  regrasAgenda: {
    antecedenciaMin: number;
    intervaloEntreMin: number;
    janelaDias: number;
    passoMin: number;
  };
  pixAtivo: boolean;
  /** Dados reais de Pix da barbearia, exibidos ao cliente depois de agendar. */
  pix: { chave: string; tipo: string | null; whatsapp: string | null } | null;
  carteira: { saldo_creditos: number; saldo_centavos: number; fidelidade_progresso: number };
  regras: {
    tipo: string;
    ativo: boolean;
    bloqueia_agendamento_no_limite: boolean;
    fidelidade_alvo: number | null;
  }[];
  ocupados: Ocupado[];
  horarios: HorarioDeFuncionamento[];
  excecoesIntervalo: ExcecaoIntervaloAgenda[];
};

export const getDadosAgendar = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: { slug?: string | undefined }) => data ?? {})
  .handler(async ({ data, context }): Promise<DadosAgendar> => {
    const { db, tenant, cliente } = await clienteDoUsuario(context, { slug: data.slug ?? null });
    const { STATUS_QUE_OCUPAM, regrasDaBarbearia } = await import("@/lib/agenda-regras.server");

    const [regrasAgenda, { data: financeiro }, servicosRes, profRes, regrasRes, carteiraRes] =
      await Promise.all([
        regrasDaBarbearia(db, tenant.id),
        db
          .from("configuracoes_financeiras")
          .select("pix_ativo, pix_chave, pix_tipo, pix_whatsapp")
          .eq("tenant_id", tenant.id)
          .maybeSingle(),
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
          .from("regras_de_plano")
          .select("tipo, ativo, bloqueia_agendamento_no_limite, fidelidade_alvo")
          .eq("tenant_id", tenant.id),
        db
          .from("carteiras")
          .select("saldo_creditos, saldo_centavos, fidelidade_progresso")
          .eq("cliente_id", cliente.id)
          .maybeSingle(),
      ]);

    // Exceção individual: a escolha feita na ficha do cliente vale mais que o padrão.
    const { data: personalizacao } = await db
      .from("clientes")
      .select("fidelidade_participa")
      .eq("id", cliente.id)
      .maybeSingle();

    const regras = (regrasRes.data ?? []).map((r: DadosAgendar["regras"][number]) =>
      r.tipo === "fidelidade" &&
      personalizacao?.fidelidade_participa !== null &&
      personalizacao?.fidelidade_participa !== undefined
        ? { ...r, ativo: personalizacao.fidelidade_participa }
        : r,
    );

    const desde = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const ate = new Date(desde.getTime() + (regrasAgenda.janelaDias + 1) * 24 * 60 * 60 * 1000);
    const hojeLocal = hojeNoFuso(regrasAgenda.fuso);
    const inicioExcecoes = somarDias(hojeLocal, -1);
    const fimExcecoes = somarDias(hojeLocal, regrasAgenda.janelaDias + 2);
    const [ocupadosRes, excecoesRes] = await Promise.all([
      db
        .from("agendamentos")
        .select("profissional_id, inicio, fim")
        .eq("tenant_id", tenant.id)
        .gte("inicio", desde.toISOString())
        .lte("inicio", ate.toISOString())
        .in("status", [...STATUS_QUE_OCUPAM]),
      db
        .from("excecoes_intervalo_agenda")
        .select("dia, intervalo_inicio, intervalo_fim")
        .eq("tenant_id", tenant.id)
        .gte("dia", inicioExcecoes)
        .lte("dia", fimExcecoes),
    ]);
    if (excecoesRes.error) throw new Error("Não foi possível carregar a disponibilidade deste negócio.");

    return {
      tenant,
      cliente,
      servicos: servicosRes.data ?? [],
      profissionais: profRes.data ?? [],
      carteira: carteiraRes.data ?? {
        saldo_creditos: 0,
        saldo_centavos: 0,
        fidelidade_progresso: 0,
      },
      regras,
      ocupados: [
        ...(ocupadosRes.data ?? []),
        ...(await (
          await import("@/lib/ocupacoes-extras.server")
        ).ocupacoesExtras(db, {
          tenantId: tenant.id,
          fuso: regrasAgenda.fuso,
          desde,
          ate,
        })),
      ],
      horarios: regrasAgenda.horarios,
      excecoesIntervalo: (excecoesRes.data ?? []).map((linha) => ({
        dia: linha.dia,
        intervaloInicio: linha.intervalo_inicio ? String(linha.intervalo_inicio).slice(0, 5) : null,
        intervaloFim: linha.intervalo_fim ? String(linha.intervalo_fim).slice(0, 5) : null,
      })),
      fuso: regrasAgenda.fuso,
      regrasAgenda: {
        antecedenciaMin: regrasAgenda.antecedenciaMin,
        intervaloEntreMin: regrasAgenda.intervaloEntreMin,
        janelaDias: regrasAgenda.janelaDias,
        passoMin: regrasAgenda.passoMin,
      },
      pixAtivo: Boolean(financeiro?.pix_ativo && String(financeiro?.pix_chave ?? "").trim()),
      pix:
        financeiro?.pix_ativo && String(financeiro?.pix_chave ?? "").trim()
          ? {
              chave: String(financeiro.pix_chave),
              tipo: financeiro.pix_tipo ?? null,
              whatsapp: financeiro.pix_whatsapp ?? null,
            }
          : null,
    };
  });

export type ResultadoAgendamento = {
  agendamento_id: string;
  inicio: string;
  fim: string;
  forma_pagamento: string;
  valor_centavos: number;
  saldo_creditos: number;
  saldo_centavos: number;
  fidelidade_progresso: number;
  fidelidade_alvo: number | null;
};

export type ConflitoAgendamento = { conflito: true; agendamentoId: string; hora: string };

export const criarAgendamento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (data: {
      slug?: string;
      profissionalId: string;
      servicoId: string;
      inicio: string;
      formaPagamento: "credito" | "pix" | "balcao" | "fiado" | "saldo";
      substituiId?: string;
    }) => data,
  )
  .handler(async ({ data, context }): Promise<ResultadoAgendamento | ConflitoAgendamento> => {
    // A barbearia e o cliente vêm sempre da sessão, nunca do que a tela enviou.
    const { db, tenant, cliente } = await clienteDoUsuario(context, { slug: data.slug ?? null });
    const { exigirAgendamentoPeloCliente } = await import("@/lib/planos");
    await exigirAgendamentoPeloCliente(tenant.id);
    // O profissional precisa ser desta barbearia: nunca confiar no id vindo da tela.
    const { data: profissional } = await db
      .from("profissionais")
      .select("id")
      .eq("id", data.profissionalId)
      .eq("tenant_id", tenant.id)
      .eq("ativo", true)
      .maybeSingle();
    if (!profissional) throw new Error("Profissional não encontrado neste negócio.");
    const { data: servico } = await db
      .from("servicos")
      .select("id, duracao_min, profissional_ids")
      .eq("id", data.servicoId)
      .eq("tenant_id", tenant.id)
      .eq("ativo", true)
      .maybeSingle();
    if (!servico) throw new Error("Esse serviço não está disponível.");
    let substituiId: string | null = null;
    if (data.substituiId) {
      const { STATUS_ATIVOS_DO_CLIENTE } = await import("@/lib/agenda-regras.server");
      const { data: antigo } = await db
        .from("agendamentos")
        .select("id")
        .eq("id", data.substituiId)
        .eq("cliente_id", cliente.id)
        .in("status", [...STATUS_ATIVOS_DO_CLIENTE])
        .maybeSingle();
      substituiId = (antigo?.id as string) ?? null;
    }
    const { validarAgendamento } = await import("@/lib/agenda-regras.server");
    const inicio = new Date(data.inicio);
    if (Number.isNaN(inicio.getTime())) throw new Error("Horário inválido.");
    const conflito = await validarAgendamento(db, {
      tenantId: tenant.id,
      servico,
      profissionalId: data.profissionalId,
      inicio,
      clienteId: cliente.id,
      ignorarId: substituiId,
    });
    if (conflito) return { conflito: true, ...conflito };
    const { data: res, error } = await db.rpc("criar_agendamento", {
      _tenant_id: tenant.id,
      _cliente_id: cliente.id,
      _profissional_id: data.profissionalId,
      _servico_id: data.servicoId,
      _inicio: data.inicio,
      _forma_pagamento: data.formaPagamento,
      _validar_regras: true,
    });
    if (error) throw new Error(traduz(error.message));
    const resultado = res as unknown as ResultadoAgendamento;
    if (substituiId) {
      const { concluirSubstituicao } = await import("@/lib/substituicao.server");
      await concluirSubstituicao(db, {
        novoId: resultado.agendamento_id,
        antigoId: substituiId,
      });
    }

    const [{ data: personalizacao }, { data: regraFidelidade }] = await Promise.all([
      db.from("clientes").select("fidelidade_participa").eq("id", cliente.id).maybeSingle(),
      db
        .from("regras_de_plano")
        .select("ativo")
        .eq("tenant_id", tenant.id)
        .eq("tipo", "fidelidade")
        .maybeSingle(),
    ]);
    const participa = personalizacao?.fidelidade_participa ?? regraFidelidade?.ativo ?? false;
    if (!participa) resultado.fidelidade_alvo = null;

    // Confirmação pelo WhatsApp: nunca bloqueia nem derruba o agendamento.
    try {
      const { enviarConfirmacaoDeAgendamento } = await import("@/lib/whatsapp/confirmacao.server");
      await enviarConfirmacaoDeAgendamento(resultado.agendamento_id);
    } catch {
      /* o agendamento já está salvo; a falha fica registrada no envio */
    }

    return resultado;
  });

export const cancelarAgendamento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { agendamentoId: string }) => data)
  .handler(async ({ data, context }) => {
    const { db, fichas } = await fichasDoUsuario(context);
    const ids = fichas.map((f) => f.cliente.id);
    const { data: ag } = await db
      .from("agendamentos")
      .select("id")
      .eq("id", data.agendamentoId)
      .in("cliente_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"])
      .maybeSingle();
    if (!ag) throw new Error("Esse agendamento não é seu.");
    const { exigirPrazoDeCancelamento } = await import("@/lib/prazo-cancelamento.server");
    await exigirPrazoDeCancelamento(db, data.agendamentoId);
    const { data: res, error } = await db.rpc("cancelar_agendamento", {
      _agendamento_id: data.agendamentoId,
    });
    if (error) throw new Error(traduz(error.message));
    try {
      const { notificarAgendamento } = await import("@/lib/whatsapp/notificacoes.server");
      await notificarAgendamento(data.agendamentoId, "cancelamento");
    } catch {
      /* o cancelamento já está salvo */
    }
    return res as unknown as { devolvido: boolean; saldo_creditos: number; saldo_centavos: number };
  });

export type AgendamentoCliente = {
  id: string;
  inicio: string;
  fim: string;
  status: string;
  forma_pagamento: string | null;
  valor_centavos: number;
  servicos: { nome: string } | null;
  profissionais: { nome: string } | null;
};

export const listarAgendamentosCliente = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: { slug?: string | undefined }) => data ?? {})
  .handler(async ({ data, context }): Promise<AgendamentoCliente[]> => {
    const { db, fichas } = await fichasDoUsuario(context);
    const ids = data.slug
      ? fichas.filter((f) => f.tenant.slug === data.slug).map((f) => f.cliente.id)
      : fichas.map((f) => f.cliente.id);
    if (!ids.length) return [];
    const { data: rows } = await db
      .from("agendamentos")
      .select(
        "id, inicio, fim, status, forma_pagamento, valor_centavos, servicos(nome), profissionais(nome)",
      )
      .in("cliente_id", ids)
      .order("inicio", { ascending: false })
      .limit(30);
    return (rows ?? []) as AgendamentoCliente[];
  });

function traduz(msg: string): string {
  if (msg.includes("limite de fiado")) return "O limite de fiado foi atingido.";
  if (msg.includes("sem creditos")) return "Você não tem créditos disponíveis.";
  if (msg.includes("horario ja ocupado"))
    return "Esse horário acabou de ser reservado, escolha outro";
  if (msg.includes("fora do horario de funcionamento"))
    return "Esse horário está fora do funcionamento do negócio.";
  if (msg.includes("fora do periodo de agendamento")) return "Escolha uma data mais próxima.";
  return msg;
}
