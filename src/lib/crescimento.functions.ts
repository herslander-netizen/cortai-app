import { createServerFn } from "@tanstack/react-start";
import { inicioDoDiaNoFuso, inicioDoMesNoFuso } from "@/lib/horarios";
import { fusoDoTenant } from "@/lib/fuso.server";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { tenantIdDoMembro, type ContextoAutenticado, exigirPermissao } from "@/lib/tenant";
import { exigirRecurso } from "@/lib/planos";
import { fotoValida, MAX_FOTOS_DO_PORTFOLIO } from "@/lib/fotos-do-negocio";
import { assinarFoto } from "@/lib/fotos.server";
import { z } from "zod";
import { dataDeRetorno, estaNaHoraDeVoltar } from "@/lib/retorno";

const DIA = 24 * 60 * 60 * 1000;

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function tenantPadrao(context: ContextoAutenticado) {
  const db = await admin();
  const tenantId = await tenantIdDoMembro(context);
  const { data: tenant } = await db
    .from("tenants")
    .select(
      "id, nome, slug, segmento, indicacao_ativa, indicacao_codigo, indicacao_recompensa, link_avaliacao_publica",
    )
    .eq("id", tenantId)
    .maybeSingle();
  if (!tenant) throw new Error("Negócio não encontrado");
  return { db, tenant };
}

function preferido(valores: string[]): string | null {
  if (!valores.length) return null;
  const contagem = new Map<string, number>();
  for (const v of valores) contagem.set(v, (contagem.get(v) ?? 0) + 1);
  return [...contagem.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

/* ---------------------------------- CRM ---------------------------------- */

export type ClienteCRM = {
  id: string;
  nome: string;
  telefone: string;
  visitas: number;
  ultimaVisita: string | null;
  diasDesdeUltima: number | null;
  intervaloMedioDias: number | null;
  gastoMedioCentavos: number;
  servicoPreferido: string | null;
  profissionalPreferido: string | null;
  saldoCentavos: number;
  creditos: number;
  status: "novo" | "recorrente" | "em_retorno" | "inativo";
  atrasoDias: number | null;
  retornoEm: string | null;
  retornoServico: string | null;
  horaDeVoltar: boolean;
};

export const getClientesCRM = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { db, tenant } = await tenantPadrao(context);
    const [clientesRes, agRes, carteirasRes] = await Promise.all([
      db
        .from("clientes")
        .select("id, nome, telefone, criado_em")
        .eq("tenant_id", tenant.id)
        .is("arquivado_em", null)
        .order("nome"),
      db
        .from("agendamentos")
        .select(
          "cliente_id, inicio, valor_centavos, status, servicos(nome, retorno_dias), profissionais(nome)",
        )
        .eq("tenant_id", tenant.id)
        .not("status", "in", "(cancelado,falta)")
        .order("inicio"),
      db
        .from("carteiras")
        .select("cliente_id, saldo_centavos, saldo_creditos")
        .eq("tenant_id", tenant.id),
    ]);

    const carteiras = new Map((carteirasRes.data ?? []).map((c) => [c.cliente_id, c]));
    const agora = Date.now();

    const clientes: ClienteCRM[] = (clientesRes.data ?? []).map((c) => {
      const visitas = (agRes.data ?? []).filter(
        (a) => a.cliente_id === c.id && new Date(a.inicio).getTime() <= agora,
      );
      const datas = visitas.map((v) => new Date(v.inicio).getTime()).sort((a, b) => a - b);
      const ultima = datas.length ? datas[datas.length - 1]! : null;
      const diasDesdeUltima = ultima === null ? null : Math.floor((agora - ultima) / DIA);

      let intervalo: number | null = null;
      if (datas.length >= 2) {
        let soma = 0;
        for (let i = 1; i < datas.length; i += 1) soma += datas[i]! - datas[i - 1]!;
        intervalo = Math.max(1, Math.round(soma / (datas.length - 1) / DIA));
      }

      const pagos = visitas.filter((v) => v.valor_centavos > 0);
      const gastoMedio = pagos.length
        ? Math.round(pagos.reduce((s, v) => s + v.valor_centavos, 0) / pagos.length)
        : 0;

      const referencia = intervalo ?? 30;
      const atraso = diasDesdeUltima === null ? null : diasDesdeUltima - referencia;

      let status: ClienteCRM["status"] = "novo";
      if (visitas.length === 0) status = "novo";
      else if (diasDesdeUltima !== null && diasDesdeUltima > referencia * 2) status = "inativo";
      else if (atraso !== null && atraso > 0) status = "em_retorno";
      else status = "recorrente";

      const carteira = carteiras.get(c.id);
      const doCliente = (agRes.data ?? []).filter((a) => a.cliente_id === c.id);
      const ultimoFeito = [...doCliente]
        .reverse()
        .find((a) => a.status === "finalizado" && new Date(a.inicio).getTime() <= agora);
      const temHorarioFuturo = doCliente.some(
        (a) =>
          new Date(a.inicio).getTime() > agora &&
          !["finalizado", "nao_compareceu", "remarcado", "estornado"].includes(String(a.status)),
      );
      const retornoEm = ultimoFeito
        ? dataDeRetorno(
            ultimoFeito.inicio,
            (ultimoFeito.servicos as { retorno_dias?: number | null } | null)?.retorno_dias,
          )
        : null;
      return {
        id: c.id,
        nome: c.nome,
        telefone: c.telefone,
        visitas: visitas.length,
        ultimaVisita: ultima === null ? null : new Date(ultima).toISOString(),
        diasDesdeUltima,
        intervaloMedioDias: intervalo,
        gastoMedioCentavos: gastoMedio,
        servicoPreferido: preferido(
          visitas.map((v) => v.servicos?.nome).filter((n): n is string => !!n),
        ),
        profissionalPreferido: preferido(
          visitas.map((v) => v.profissionais?.nome).filter((n): n is string => !!n),
        ),
        saldoCentavos: carteira?.saldo_centavos ?? 0,
        creditos: carteira?.saldo_creditos ?? 0,
        status,
        atrasoDias: atraso !== null && atraso > 0 ? atraso : null,
        retornoEm: retornoEm === null ? null : new Date(retornoEm).toISOString(),
        retornoServico: ultimoFeito?.servicos?.nome ?? null,
        horaDeVoltar: estaNaHoraDeVoltar(retornoEm, temHorarioFuturo, agora),
      };
    });

    const trazerDeVolta = clientes
      .filter((c) => c.atrasoDias !== null && c.visitas > 0)
      .sort((a, b) => (b.atrasoDias ?? 0) - (a.atrasoDias ?? 0))
      .slice(0, 12);

    return {
      tenant: { id: tenant.id, nome: tenant.nome, slug: tenant.slug, segmento: tenant.segmento },
      clientes,
      trazerDeVolta,
    };
  });

/* ------------------------------- CRESCIMENTO ------------------------------ */

export type Crescimento = {
  tenant: { id: string; nome: string; slug: string };
  novosClientesMes: number;
  clientesRecorrentes: number;
  agendamentosPeloLink: number;
  oportunidadesRetorno: number;
  indicacoesTotal: number;
  indicacoesConvertidas: number;
  ocupacaoPct: number;
  horariosVagosHoje: number;
  naFila: number;
};

export const getCrescimento = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Crescimento> => {
    const { db, tenant } = await tenantPadrao(context);
    await exigirRecurso(db, tenant.id, "crescimento");
    const agora = Date.now();
    const fusoDoNegocio = await fusoDoTenant(tenant.id);
    const inicioMes = inicioDoMesNoFuso(fusoDoNegocio);
    const hoje = inicioDoDiaNoFuso(fusoDoNegocio);
    const amanha = new Date(hoje.getTime() + DIA);

    const [novosRes, origemRes, agHojeRes, agRes, profRes, filaRes, indicacoesRes] =
      await Promise.all([
        db
          .from("clientes")
          .select("id")
          .eq("tenant_id", tenant.id)
          .gte("criado_em", inicioMes.toISOString()),
        db
          .from("clientes")
          .select("id")
          .eq("tenant_id", tenant.id)
          .in("origem", ["link", "indicacao"]),
        db
          .from("agendamentos")
          .select("id, status")
          .eq("tenant_id", tenant.id)
          .gte("inicio", hoje.toISOString())
          .lt("inicio", amanha.toISOString()),
        db
          .from("agendamentos")
          .select("cliente_id, inicio")
          .eq("tenant_id", tenant.id)
          .not("status", "in", "(cancelado,falta)"),
        db.from("profissionais").select("id").eq("tenant_id", tenant.id).eq("ativo", true),
        db.from("fila_de_espera").select("id").eq("tenant_id", tenant.id),
        db.from("indicacoes").select("id, status").eq("tenant_id", tenant.id),
      ]);

    const porCliente = new Map<string, number[]>();
    for (const a of agRes.data ?? []) {
      const t = new Date(a.inicio).getTime();
      if (t > agora || !a.cliente_id) continue;
      const lista = porCliente.get(a.cliente_id) ?? [];
      lista.push(t);
      porCliente.set(a.cliente_id, lista);
    }

    let recorrentes = 0;
    let oportunidades = 0;
    for (const datas of porCliente.values()) {
      datas.sort((a, b) => a - b);
      if (datas.length >= 2) recorrentes += 1;
      let intervalo = 30;
      if (datas.length >= 2) {
        let soma = 0;
        for (let i = 1; i < datas.length; i += 1) soma += datas[i]! - datas[i - 1]!;
        intervalo = Math.max(1, Math.round(soma / (datas.length - 1) / DIA));
      }
      const ultima = datas[datas.length - 1]!;
      if ((agora - ultima) / DIA > intervalo) oportunidades += 1;
    }

    const ativosHoje = (agHojeRes.data ?? []).filter(
      (a) => a.status !== "cancelado" && a.status !== "nao_compareceu" && a.status !== "remarcado",
    );
    const totalSlots = Math.max((profRes.data?.length ?? 1) * 20, 1);
    const indicacoes = indicacoesRes.data ?? [];

    return {
      tenant: { id: tenant.id, nome: tenant.nome, slug: tenant.slug },
      novosClientesMes: novosRes.data?.length ?? 0,
      clientesRecorrentes: recorrentes,
      agendamentosPeloLink: origemRes.data?.length ?? 0,
      oportunidadesRetorno: oportunidades,
      indicacoesTotal: indicacoes.length,
      indicacoesConvertidas: indicacoes.filter((i) => i.status === "convertido").length,
      ocupacaoPct: Math.round((ativosHoje.length / totalSlots) * 100),
      horariosVagosHoje: Math.max(0, totalSlots - ativosHoje.length),
      naFila: filaRes.data?.length ?? 0,
    };
  });

/* -------------------------------- INDICAÇÕES ------------------------------ */

export const getIndicacoes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { db, tenant } = await tenantPadrao(context);
    await exigirRecurso(db, tenant.id, "indicacoes");
    const { data } = await db
      .from("indicacoes")
      .select(
        "id, indicado_nome, status, recompensa, recompensa_entregue, criado_em, convertido_em, clientes!indicacoes_indicador_cliente_id_fkey(nome)",
      )
      .eq("tenant_id", tenant.id)
      .order("criado_em", { ascending: false });

    return {
      tenant: {
        id: tenant.id,
        nome: tenant.nome,
        slug: tenant.slug,
        ativa: tenant.indicacao_ativa,
        codigo: tenant.indicacao_codigo,
        recompensa: tenant.indicacao_recompensa,
      },
      itens: (data ?? []).map((i) => ({
        id: i.id,
        indicado: i.indicado_nome,
        indicador: (i as { clientes?: { nome?: string } | null }).clientes?.nome ?? null,
        status: i.status,
        recompensa: i.recompensa,
        recompensaEntregue: i.recompensa_entregue,
        criadoEm: i.criado_em,
        convertidoEm: i.convertido_em,
      })),
    };
  });

export const salvarConfigIndicacao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        ativa: z.boolean(),
        codigo: z
          .string()
          .trim()
          .min(3)
          .max(24)
          .regex(/^[a-zA-Z0-9-]+$/),
        recompensa: z.string().trim().max(120),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { db, tenant } = await tenantPadrao(context);
    await exigirPermissao(context, tenant.id, "alterar_dados_barbearia");
    await exigirRecurso(db, tenant.id, "indicacoes");
    const { error } = await db
      .from("tenants")
      .update({
        indicacao_ativa: data.ativa,
        indicacao_codigo: data.codigo.toLowerCase(),
        indicacao_recompensa: data.recompensa || null,
      })
      .eq("id", tenant.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const registrarIndicacao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        indicadorClienteId: z.string().uuid().nullable(),
        indicadoNome: z.string().trim().min(2).max(80),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { db, tenant } = await tenantPadrao(context);
    await exigirPermissao(context, tenant.id, "gerenciar_profissionais");
    const { error } = await db.from("indicacoes").insert({
      tenant_id: tenant.id,
      indicador_cliente_id: data.indicadorClienteId,
      indicado_nome: data.indicadoNome,
      recompensa: tenant.indicacao_recompensa,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const atualizarIndicacao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        acao: z.enum(["converter", "recompensar", "remover"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { db, tenant } = await tenantPadrao(context);
    if (data.acao === "remover") {
      await exigirPermissao(context, tenant.id, "acoes_destrutivas");
      const { error: erroRemocao } = await db
        .from("indicacoes")
        .delete()
        .eq("id", data.id)
        .eq("tenant_id", tenant.id);
      if (erroRemocao) throw new Error(erroRemocao.message);
      const { gravarExclusao } = await import("@/lib/exclusoes.server");
      await gravarExclusao(context as never, "indicacao", data.id, tenant.id);
      return { ok: true };
    }
    const patch =
      data.acao === "converter"
        ? { status: "convertido", convertido_em: new Date().toISOString() }
        : { recompensa_entregue: true };
    const { error } = await db
      .from("indicacoes")
      .update(patch)
      .eq("id", data.id)
      .eq("tenant_id", tenant.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* -------------------------------- AVALIAÇÕES ------------------------------ */

export const getAvaliacoes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { db, tenant } = await tenantPadrao(context);
    const desde = new Date(Date.now() - 30 * DIA).toISOString();

    const [concluidosRes, avaliacoesRes] = await Promise.all([
      db
        .from("agendamentos")
        .select("id, inicio, cliente_id, profissional_id, clientes(nome), servicos(nome)")
        .eq("tenant_id", tenant.id)
        .eq("status", "finalizado")
        .gte("inicio", desde)
        .order("inicio", { ascending: false }),
      db
        .from("avaliacoes")
        .select("id, agendamento_id, nota, comentario, criado_em, clientes(nome)")
        .eq("tenant_id", tenant.id)
        .order("criado_em", { ascending: false }),
    ]);

    const avaliadas = new Set((avaliacoesRes.data ?? []).map((a) => a.agendamento_id));
    const notas = (avaliacoesRes.data ?? []).map((a) => a.nota);

    return {
      linkPublico: tenant.link_avaliacao_publica,
      media: notas.length
        ? Number((notas.reduce((s, n) => s + n, 0) / notas.length).toFixed(1))
        : null,
      pendentes: (concluidosRes.data ?? [])
        .filter((a) => !avaliadas.has(a.id))
        .map((a) => ({
          id: a.id,
          inicio: a.inicio,
          clienteId: a.cliente_id,
          profissionalId: a.profissional_id,
          cliente: a.clientes?.nome ?? "Cliente",
          servico: a.servicos?.nome ?? "Atendimento",
        })),
      registradas: (avaliacoesRes.data ?? []).map((a) => ({
        id: a.id,
        nota: a.nota,
        comentario: a.comentario,
        criadoEm: a.criado_em,
        cliente: (a as { clientes?: { nome?: string } | null }).clientes?.nome ?? "Cliente",
      })),
    };
  });

export const registrarAvaliacao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        agendamentoId: z.string().uuid(),
        nota: z.number().int().min(1).max(5),
        comentario: z.string().trim().max(400).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { db, tenant } = await tenantPadrao(context);
    const { data: ag } = await db
      .from("agendamentos")
      .select("id, cliente_id, profissional_id")
      .eq("id", data.agendamentoId)
      .eq("tenant_id", tenant.id)
      .maybeSingle();
    if (!ag) throw new Error("Atendimento não encontrado");

    const { error } = await db.from("avaliacoes").insert({
      tenant_id: tenant.id,
      agendamento_id: ag.id,
      cliente_id: ag.cliente_id,
      profissional_id: ag.profissional_id,
      nota: data.nota,
      comentario: data.comentario ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true, convidarPublico: data.nota >= 4, link: tenant.link_avaliacao_publica };
  });

export const salvarLinkAvaliacao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ link: z.string().trim().max(300) }).parse(input))
  .handler(async ({ data, context }) => {
    const { db, tenant } = await tenantPadrao(context);
    const { error } = await db
      .from("tenants")
      .update({ link_avaliacao_publica: data.link || null })
      .eq("id", tenant.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------- RECORRÊNCIA DE AGENDAMENTO --------------------- */

const PERIODOS = { semanal: 7, quinzenal: 14, mensal: 28 } as const;

export const repetirAgendamento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        agendamentoId: z.string().uuid(),
        periodicidade: z.enum(["semanal", "quinzenal", "mensal"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { db, tenant } = await tenantPadrao(context);
    const { data: ag } = await db
      .from("agendamentos")
      .select("*")
      .eq("id", data.agendamentoId)
      .eq("tenant_id", tenant.id)
      .maybeSingle();
    if (!ag) throw new Error("Atendimento não encontrado");

    const dias = PERIODOS[data.periodicidade];
    const inicio = new Date(new Date(ag.inicio).getTime() + dias * DIA);
    const fim = new Date(new Date(ag.fim).getTime() + dias * DIA);

    const { data: conflito } = await db
      .from("agendamentos")
      .select("id")
      .eq("profissional_id", ag.profissional_id ?? "")
      .in("status", ["agendado", "chegou", "na_cadeira"])
      .eq("encaixe", false)
      .lt("inicio", fim.toISOString())
      .gt("fim", inicio.toISOString())
      .maybeSingle();
    if (conflito) throw new Error("Esse horário já está ocupado na próxima data.");

    await db.from("agendamentos").update({ recorrencia: data.periodicidade }).eq("id", ag.id);

    const { error } = await db.from("agendamentos").insert({
      tenant_id: tenant.id,
      cliente_id: ag.cliente_id,
      profissional_id: ag.profissional_id,
      servico_id: ag.servico_id,
      inicio: inicio.toISOString(),
      fim: fim.toISOString(),
      status: "agendado",
      forma_pagamento: ag.forma_pagamento === "credito" ? "balcao" : ag.forma_pagamento,
      valor_centavos: ag.valor_centavos,
      recorrencia: data.periodicidade,
    });
    if (error)
      throw new Error(
        error.code === "23P01" ? "Esse horário já está ocupado na próxima data." : error.message,
      );
    return { ok: true, inicio: inicio.toISOString() };
  });

/* ---------------------------- PERFIL PROFISSIONAL ------------------------- */

export const getProfissionaisPerfil = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { db, tenant } = await tenantPadrao(context);
    const { data } = await db
      .from("profissionais")
      .select("id, nome, descricao, portfolio, ativo, avatar_url")
      .eq("tenant_id", tenant.id)
      .order("criado_em");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return Promise.all(
      (data ?? []).map(async (p) => {
        const portfolio = Array.isArray(p.portfolio)
          ? (p.portfolio as unknown[]).filter((f): f is string => typeof f === "string")
          : [];
        // `portfolio` guarda os caminhos (é o que se salva); `fotos` traz o link temporário de cada um para mostrar.
        const fotos = (
          await Promise.all(
            portfolio.map(async (valor) => ({
              valor,
              url: await assinarFoto(supabaseAdmin, valor),
            })),
          )
        ).filter((f): f is { valor: string; url: string } => Boolean(f.url));
        return {
          id: p.id,
          tenantId: tenant.id,
          nome: p.nome,
          descricao: p.descricao,
          portfolio,
          fotos,
          ativo: p.ativo,
          avatarUrl: p.avatar_url,
          avatarPreview: await assinarFoto(supabaseAdmin, p.avatar_url),
        };
      }),
    );
  });

export const salvarPerfilProfissional = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        descricao: z.string().trim().max(2000),
        portfolio: z.array(z.string().trim().min(1).max(400)).max(MAX_FOTOS_DO_PORTFOLIO),
        avatarUrl: z.string().trim().max(500).nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { db, tenant } = await tenantPadrao(context);
    await exigirPermissao(context, tenant.id, "gerenciar_profissionais");
    if (data.avatarUrl && !fotoValida(data.avatarUrl, tenant.id))
      throw new Error("Escolha uma foto de perfil válida.");
    if (!data.portfolio.every((f) => fotoValida(f, tenant.id)))
      throw new Error("Escolha as fotos pela galeria de fotos.");
    const { error } = await db
      .from("profissionais")
      .update({
        descricao: data.descricao || null,
        portfolio: data.portfolio,
        ...(data.avatarUrl !== undefined ? { avatar_url: data.avatarUrl } : {}),
      })
      .eq("id", data.id)
      .eq("tenant_id", tenant.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* -------------------------- OPORTUNIDADES DE HOJE ------------------------- */

export type Oportunidade = {
  chave: string;
  titulo: string;
  detalhe: string;
  quantidade: number;
  destino:
    "/barbeiro/clientes" | "/barbeiro/agenda" | "/barbeiro/produtos" | "/barbeiro/avaliacoes";
};
