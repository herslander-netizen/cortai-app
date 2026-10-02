/**
 * Dashboard do dono ("Hoje" + seções sob demanda) e Visão Casa.
 * Papel e barbearia vêm sempre do vínculo real do usuário, no servidor.
 * Horários de corte do dia são calculados no fuso da barbearia.
 */
import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { tenantIdDoMembro, type ContextoAutenticado } from "@/lib/tenant";
import {
  hojeNoFuso,
  horarioDoDia,
  isoNoFusoDaBarbearia,
  normalizarFuso,
  type HorarioDeFuncionamento,
} from "@/lib/horarios";

const DIA = 24 * 60 * 60 * 1000;
const SEMANA = 7 * DIA;
const CANCELADOS = ["cancelado", "nao_compareceu", "remarcado"];

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

type Base = {
  db: Awaited<ReturnType<typeof admin>>;
  tenantId: string;
  fuso: string;
  papel: string;
  pode: (p: string) => Promise<boolean>;
};

async function base(context: unknown, papeis: string[]): Promise<Base> {
  const ctx = context as ContextoAutenticado;
  const tenantId = await tenantIdDoMembro(ctx);
  const { data: acesso } = await ctx.supabase.rpc("meu_acesso_no_tenant", { _tenant_id: tenantId });
  const linha = (Array.isArray(acesso) ? acesso[0] : acesso) as {
    papel?: string;
    ativo?: boolean;
  } | null;
  const papel = linha?.papel ?? "";
  if (!linha?.ativo || !papeis.includes(papel)) throw new Error("Sem permissão para esta visão.");
  const db = await admin();
  const { data: t } = await db.from("tenants").select("fuso").eq("id", tenantId).maybeSingle();
  const pode = async (p: string) => {
    const { data } = await ctx.supabase.rpc("has_tenant_permission", {
      _tenant_id: tenantId,
      _permission: p,
    });
    return Boolean(data);
  };
  return { db, tenantId, fuso: normalizarFuso(t?.fuso), papel, pode };
}

function janelaDoDia(fuso: string, deslocamentoMs = 0) {
  const dia = hojeNoFuso(fuso, new Date(Date.now() - deslocamentoMs));
  const ini = new Date(isoNoFusoDaBarbearia(dia, "00:00", fuso));
  return { dia, ini, fim: new Date(ini.getTime() + DIA) };
}

function minutosEntre(abre: string, fecha: string) {
  const m = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));
  return Math.max(0, m(fecha) - m(abre));
}

async function metricasDoDia(
  b: Base,
  deslocamentoMs: number,
  horarios: HorarioDeFuncionamento[],
  ativos: Set<string>,
) {
  const totalProfs = ativos.size;
  const { dia, ini, fim } = janelaDoDia(b.fuso, deslocamentoMs);
  const corte = new Date(Math.min(Date.now() - deslocamentoMs, fim.getTime()));
  const [ags, caixa] = await Promise.all([
    b.db
      .from("agendamentos")
      .select("inicio, fim, status, finished_at, profissional_id")
      .eq("tenant_id", b.tenantId)
      .gte("inicio", ini.toISOString())
      .lt("inicio", fim.toISOString()),
    b.db
      .from("caixa_movimentos")
      .select("tipo, valor_centavos")
      .eq("tenant_id", b.tenantId)
      .gte("criado_em", ini.toISOString())
      .lte("criado_em", corte.toISOString()),
  ]);
  const lista = ags.data ?? [];
  const validos = lista.filter((a) => !CANCELADOS.includes(a.status));
  const atendimentos = validos.filter(
    (a) =>
      a.status === "finalizado" && new Date(a.finished_at ?? a.fim).getTime() <= corte.getTime(),
  ).length;
  const faturamento = (caixa.data ?? []).reduce(
    (s, m) =>
      s +
      (m.tipo === "entrada"
        ? m.valor_centavos
        : m.tipo === "saida" || m.tipo === "estorno"
          ? -Math.abs(m.valor_centavos)
          : 0),
    0,
  );
  const ocupado = validos.reduce(
    (s, a) => s + Math.max(0, (new Date(a.fim).getTime() - new Date(a.inicio).getTime()) / 60000),
    0,
  );
  const h = horarioDoDia(dia, horarios);
  const disponivel = h.fechado ? 0 : minutosEntre(h.abre, h.fecha) * totalProfs;
  const trabalhando = new Set(
    validos
      .map((a) => a.profissional_id)
      .filter((id): id is string => Boolean(id) && ativos.has(id as string)),
  ).size;
  return {
    atendimentos,
    faturamentoCentavos: faturamento,
    ticketMedioCentavos: atendimentos ? Math.round(faturamento / atendimentos) : 0,
    ocupacaoPct: disponivel ? Math.min(100, Math.round((ocupado / disponivel) * 100)) : null,
    equipe: trabalhando,
  };
}

async function horariosDe(b: Base): Promise<HorarioDeFuncionamento[]> {
  const { data } = await b.db
    .from("horarios_de_funcionamento")
    .select("dia_semana, fechado, abre, fecha")
    .eq("tenant_id", b.tenantId);
  return (data ?? []).map((h) => ({
    diaSemana: h.dia_semana,
    fechado: h.fechado,
    abre: String(h.abre).slice(0, 5),
    fecha: String(h.fecha).slice(0, 5),
  }));
}

export type Metricas = Awaited<ReturnType<typeof metricasDoDia>>;
export type HojeDoDono = {
  hoje: Metricas;
  semanaPassada: Metricas;
  equipeTotal: number;
  financeiro: boolean;
  fuso: string;
};

export const getHojeDoDono = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<HojeDoDono> => {
    const b = await base(context, ["dono", "gerente"]);
    const [horarios, profs, financeiro] = await Promise.all([
      horariosDe(b),
      b.db.from("profissionais").select("id").eq("tenant_id", b.tenantId).eq("ativo", true),
      b.pode("visualizar_financeiro"),
    ]);
    const ativos = new Set((profs.data ?? []).map((p) => p.id));
    const total = ativos.size;
    const [hoje, semanaPassada] = await Promise.all([
      metricasDoDia(b, 0, horarios, ativos),
      metricasDoDia(b, SEMANA, horarios, ativos),
    ]);
    if (!financeiro) {
      hoje.faturamentoCentavos = 0;
      hoje.ticketMedioCentavos = 0;
      semanaPassada.faturamentoCentavos = 0;
      semanaPassada.ticketMedioCentavos = 0;
    }
    return { hoje, semanaPassada, equipeTotal: total, financeiro, fuso: b.fuso };
  });

export type SecaoOperacao = {
  profissionais: {
    nome: string;
    atendimentos: number;
    agendados: number;
    ocupacaoPct: number | null;
  }[];
  faltas: number;
  cancelamentos: number;
  aindaHoje: number;
};

export const getSecaoOperacao = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SecaoOperacao> => {
    const b = await base(context, ["dono", "gerente"]);
    const { dia, ini, fim } = janelaDoDia(b.fuso);
    const [horarios, profs, ags] = await Promise.all([
      horariosDe(b),
      b.db
        .from("profissionais")
        .select("id, nome")
        .eq("tenant_id", b.tenantId)
        .eq("ativo", true)
        .order("nome"),
      b.db
        .from("agendamentos")
        .select("inicio, fim, status, profissional_id")
        .eq("tenant_id", b.tenantId)
        .gte("inicio", ini.toISOString())
        .lt("inicio", fim.toISOString()),
    ]);
    const h = horarioDoDia(dia, horarios);
    const disp = h.fechado ? 0 : minutosEntre(h.abre, h.fecha);
    const lista = ags.data ?? [];
    const agora = Date.now();
    return {
      profissionais: (profs.data ?? []).map((p) => {
        const meus = lista.filter(
          (a) => a.profissional_id === p.id && !CANCELADOS.includes(a.status),
        );
        const ocupado = meus.reduce(
          (s, a) => s + (new Date(a.fim).getTime() - new Date(a.inicio).getTime()) / 60000,
          0,
        );
        return {
          nome: p.nome,
          atendimentos: meus.filter((a) => a.status === "finalizado").length,
          agendados: meus.length,
          ocupacaoPct: disp ? Math.min(100, Math.round((ocupado / disp) * 100)) : null,
        };
      }),
      faltas: lista.filter((a) => a.status === "nao_compareceu").length,
      cancelamentos: lista.filter((a) => a.status === "cancelado").length,
      aindaHoje: lista.filter(
        (a) =>
          !CANCELADOS.includes(a.status) &&
          a.status !== "finalizado" &&
          new Date(a.fim).getTime() >= agora,
      ).length,
    };
  });

export type SecaoFinanceiro = {
  vendasCentavos: number;
  porForma: { forma: string; centavos: number }[];
  caixaAberto: boolean;
  comissoesHojeCentavos: number;
  comissoesPendentesCentavos: number;
  fiadoAbertoCentavos: number;
  fiadoClientes: number;
};

export const getSecaoFinanceiro = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SecaoFinanceiro> => {
    const b = await base(context, ["dono", "gerente"]);
    if (!(await b.pode("visualizar_financeiro")))
      throw new Error("Sem permissão para o financeiro.");
    const { ini, fim } = janelaDoDia(b.fuso);
    const [mov, sessao, comHoje, comPend, fiados] = await Promise.all([
      b.db
        .from("caixa_movimentos")
        .select("tipo, valor_centavos, forma_pagamento")
        .eq("tenant_id", b.tenantId)
        .gte("criado_em", ini.toISOString())
        .lt("criado_em", fim.toISOString()),
      b.db
        .from("caixa_sessoes")
        .select("id")
        .eq("tenant_id", b.tenantId)
        .eq("status", "aberto")
        .limit(1)
        .maybeSingle(),
      b.db
        .from("comissoes")
        .select("valor_centavos")
        .eq("tenant_id", b.tenantId)
        .gte("criado_em", ini.toISOString())
        .lt("criado_em", fim.toISOString()),
      b.db
        .from("comissoes")
        .select("valor_centavos")
        .eq("tenant_id", b.tenantId)
        .eq("status", "pendente"),
      b.db
        .from("fiados")
        .select("saldo_centavos, cliente_id")
        .eq("tenant_id", b.tenantId)
        .gt("saldo_centavos", 0),
    ]);
    const formas = new Map<string, number>();
    let vendas = 0;
    for (const m of mov.data ?? []) {
      if (m.tipo !== "entrada") continue;
      vendas += m.valor_centavos;
      const f = m.forma_pagamento ?? "outro";
      formas.set(f, (formas.get(f) ?? 0) + m.valor_centavos);
    }
    const soma = (r: { valor_centavos: number }[] | null) =>
      (r ?? []).reduce((s, x) => s + x.valor_centavos, 0);
    return {
      vendasCentavos: vendas,
      porForma: [...formas]
        .map(([forma, centavos]) => ({ forma, centavos }))
        .sort((a, b2) => b2.centavos - a.centavos),
      caixaAberto: Boolean(sessao.data),
      comissoesHojeCentavos: soma(comHoje.data),
      comissoesPendentesCentavos: soma(comPend.data),
      fiadoAbertoCentavos: (fiados.data ?? []).reduce((s, f) => s + f.saldo_centavos, 0),
      fiadoClientes: new Set((fiados.data ?? []).map((f) => f.cliente_id)).size,
    };
  });

export type SecaoClientes = {
  novosHoje: number;
  atendidosHoje: number;
  recorrentesHoje: number;
  voltamEstaSemana: number;
  sumidos: number;
};

export const getSecaoClientes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SecaoClientes> => {
    const b = await base(context, ["dono", "gerente"]);
    const { ini, fim } = janelaDoDia(b.fuso);
    const [novos, hoje, proximos, historico] = await Promise.all([
      b.db
        .from("clientes")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", b.tenantId)
        .gte("criado_em", ini.toISOString())
        .lt("criado_em", fim.toISOString()),
      b.db
        .from("agendamentos")
        .select("cliente_id")
        .eq("tenant_id", b.tenantId)
        .eq("status", "finalizado")
        .gte("inicio", ini.toISOString())
        .lt("inicio", fim.toISOString()),
      b.db
        .from("agendamentos")
        .select("cliente_id")
        .eq("tenant_id", b.tenantId)
        .gte("inicio", fim.toISOString())
        .lt("inicio", new Date(fim.getTime() + 7 * DIA).toISOString())
        .not("status", "in", `(${CANCELADOS.join(",")})`),
      b.db
        .from("agendamentos")
        .select("cliente_id, inicio")
        .eq("tenant_id", b.tenantId)
        .eq("status", "finalizado")
        .gte("inicio", new Date(Date.now() - 180 * DIA).toISOString())
        .lt("inicio", ini.toISOString())
        .limit(5000),
    ]);
    const antes = new Set((historico.data ?? []).map((a) => a.cliente_id));
    const idsHoje = new Set((hoje.data ?? []).map((a) => a.cliente_id));
    const ultima = new Map<string, number>();
    for (const a of historico.data ?? [])
      ultima.set(
        a.cliente_id,
        Math.max(ultima.get(a.cliente_id) ?? 0, new Date(a.inicio).getTime()),
      );
    const futuros = new Set((proximos.data ?? []).map((a) => a.cliente_id));
    const limite = Date.now() - 45 * DIA;
    return {
      novosHoje: novos.count ?? 0,
      atendidosHoje: idsHoje.size,
      recorrentesHoje: [...idsHoje].filter((id) => antes.has(id)).length,
      voltamEstaSemana: [...futuros].filter((id) => antes.has(id) || idsHoje.has(id)).length,
      sumidos: [...ultima].filter(([id, t]) => t < limite && !futuros.has(id) && !idsHoje.has(id))
        .length,
    };
  });

export type LinhaDaCasa = {
  profissionalId: string;
  nome: string;
  estado: "na_cadeira" | "chegou" | "livre" | "encerrado";
  cliente: string | null;
  desde: string | null;
  previstoMin: number | null;
  proximo: string | null;
};
export type VisaoCasa = {
  tenantId: string;
  fuso: string;
  linhas: LinhaDaCasa[];
  fila: { id: string; nome: string; servico: string | null; desde: string }[];
  caixa: { entradasCentavos: number; atendimentos: number; aberto: boolean } | null;
};

export const getVisaoCasa = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<VisaoCasa> => {
    const b = await base(context, ["dono", "gerente", "recepcao"]);
    const { ini, fim } = janelaDoDia(b.fuso);
    const [profs, ags, fila, podeCaixa] = await Promise.all([
      b.db
        .from("profissionais")
        .select("id, nome")
        .eq("tenant_id", b.tenantId)
        .eq("ativo", true)
        .order("nome"),
      b.db
        .from("agendamentos")
        .select(
          "id, inicio, fim, status, started_at, arrived_at, profissional_id, clientes(nome), servicos(duracao_min)",
        )
        .eq("tenant_id", b.tenantId)
        .gte("inicio", ini.toISOString())
        .lt("inicio", fim.toISOString())
        .order("inicio"),
      b.db
        .from("fila_de_espera")
        .select("id, criado_em, clientes(nome), servicos(nome)")
        .eq("tenant_id", b.tenantId)
        .is("janela_preferida", null)
        .eq("status", "aguardando")
        .order("posicao")
        .limit(20),
      b.pode("visualizar_financeiro"),
    ]);
    const lista = (ags.data ?? []) as unknown as {
      id: string;
      inicio: string;
      fim: string;
      status: string;
      started_at: string | null;
      arrived_at: string | null;
      profissional_id: string | null;
      clientes: { nome: string } | null;
      servicos: { duracao_min: number } | null;
    }[];
    const agora = Date.now();
    const linhas: LinhaDaCasa[] = (profs.data ?? []).map((p) => {
      const meus = lista.filter((a) => a.profissional_id === p.id);
      const cadeira = meus.find((a) => a.status === "na_cadeira");
      const chegou = meus.find((a) => a.status === "chegou");
      const prox = meus.find((a) => a.status === "agendado" && new Date(a.fim).getTime() >= agora);
      const base2 = { profissionalId: p.id, nome: p.nome, proximo: prox?.inicio ?? null };
      if (cadeira) {
        const prev =
          cadeira.servicos?.duracao_min ??
          Math.round(
            (new Date(cadeira.fim).getTime() - new Date(cadeira.inicio).getTime()) / 60000,
          );
        return {
          ...base2,
          estado: "na_cadeira",
          cliente: cadeira.clientes?.nome ?? "Cliente",
          desde: cadeira.started_at ?? cadeira.inicio,
          previstoMin: prev,
        };
      }
      if (chegou)
        return {
          ...base2,
          estado: "chegou",
          cliente: chegou.clientes?.nome ?? "Cliente",
          desde: chegou.arrived_at,
          previstoMin: null,
        };
      return {
        ...base2,
        estado: prox ? "livre" : "encerrado",
        cliente: null,
        desde: null,
        previstoMin: null,
      };
    });
    let caixa: VisaoCasa["caixa"] = null;
    if (podeCaixa) {
      const [mov, sessao] = await Promise.all([
        b.db
          .from("caixa_movimentos")
          .select("tipo, valor_centavos")
          .eq("tenant_id", b.tenantId)
          .gte("criado_em", ini.toISOString())
          .lt("criado_em", fim.toISOString()),
        b.db
          .from("caixa_sessoes")
          .select("id")
          .eq("tenant_id", b.tenantId)
          .eq("status", "aberto")
          .limit(1)
          .maybeSingle(),
      ]);
      caixa = {
        entradasCentavos: (mov.data ?? [])
          .filter((m) => m.tipo === "entrada")
          .reduce((s, m) => s + m.valor_centavos, 0),
        atendimentos: lista.filter((a) => a.status === "finalizado").length,
        aberto: Boolean(sessao.data),
      };
    }
    return {
      tenantId: b.tenantId,
      fuso: b.fuso,
      linhas,
      fila: (
        (fila.data ?? []) as unknown as {
          id: string;
          criado_em: string;
          clientes: { nome: string } | null;
          servicos: { nome: string } | null;
        }[]
      ).map((f) => ({
        id: f.id,
        nome: f.clientes?.nome ?? "Cliente",
        servico: f.servicos?.nome ?? null,
        desde: f.criado_em,
      })),
      caixa,
    };
  });
