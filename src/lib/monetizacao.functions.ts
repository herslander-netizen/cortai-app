import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { exigirPermissao, tenantIdDoMembro } from "@/lib/tenant";
import {
  condicaoVigente,
  limiteVigente,
  precoEfetivoCentavos,
  precoPadraoCentavos,
  type Condicao,
  type Plano,
} from "@/lib/monetizacao";

async function db() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Só o dono da plataforma administra preços, condições, cupons e banners. */
async function somenteAdmin(context: { supabase: any; userId: string }) {
  const { data: ok } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!ok) throw new Error("Acesso exclusivo do dono da plataforma.");
  return db();
}

export function planoDaLinha(linha: any): Plano {
  return {
    id: linha.id,
    chave: linha.chave,
    nome: linha.nome,
    descricao: linha.descricao ?? null,
    precoMensalCentavos: linha.preco_mensal_centavos,
    precoAnualCentavos: linha.preco_anual_centavos,
    diasTeste: linha.dias_teste,
    limiteProfissionais: linha.limite_profissionais,
    limiteClientes: linha.limite_clientes,
    limiteAgendamentosMes: linha.limite_agendamentos_mes,
    limiteUnidades: linha.limite_unidades,
    ordem: linha.ordem,
    ativo: linha.ativo,
  };
}

export function condicaoDaLinha(linha: any): Condicao {
  return {
    id: linha.id,
    tenantId: linha.tenant_id,
    planoChave: linha.plano_chave,
    precoPersonalizadoCentavos: linha.preco_personalizado_centavos,
    descontoPercentual: linha.desconto_percentual,
    descontoCentavos: linha.desconto_centavos,
    ciclo: linha.ciclo,
    inicio: linha.inicio,
    fim: linha.fim,
    motivo: linha.motivo ?? null,
    limites: (linha.limites ?? {}) as Record<string, number>,
    recursos: (linha.recursos ?? []) as string[],
    ativo: linha.ativo,
  };
}

/* ------------------------------ BARBEARIA ------------------------------- */

export type MinhaAssinatura = {
  planoChave: string;
  planoNome: string;
  ciclo: string;
  precoPadraoCentavos: number;
  precoEfetivoCentavos: number;
  condicaoAtiva: boolean;
  condicaoAte: string | null;
  status: string;
  testeAte: string | null;
  limites: { tipo: string; limite: number | null; uso: number }[];
};

/**
 * O que a barbearia vê do próprio plano: preço padrão, preço com a condição e
 * até quando ela vale. Motivo interno e negociação nunca saem daqui.
 */
export const getMinhaAssinatura = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MinhaAssinatura> => {
    const tenantId = await tenantIdDoMembro(context);
    const client = await db();
    const inicioDoMes = new Date();
    inicioDoMes.setDate(1);
    inicioDoMes.setHours(0, 0, 0, 0);

    const [tenantRes, planosRes, condRes, profRes, cliRes, agRes] = await Promise.all([
      client
        .from("tenants")
        .select("plano, ciclo, assinatura_status, teste_fim")
        .eq("id", tenantId)
        .maybeSingle(),
      client.from("planos_da_plataforma").select("*"),
      client
        .from("condicoes_comerciais")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("inicio", { ascending: false }),
      client
        .from("profissionais")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId),
      client
        .from("clientes")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId),
      client
        .from("agendamentos")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .gte("inicio", inicioDoMes.toISOString()),
    ]);

    const tenant = tenantRes.data;
    const planos = (planosRes.data ?? []).map(planoDaLinha);
    const condicoes = (condRes.data ?? []).map(condicaoDaLinha);
    const condicao = condicaoVigente(condicoes);
    const chave = condicao?.planoChave ?? tenant?.plano ?? "essencial";
    const plano = planos.find((p) => p.chave === chave) ?? null;
    const ciclo = condicao?.ciclo ?? tenant?.ciclo ?? "mensal";

    return {
      planoChave: chave,
      planoNome: plano?.nome ?? chave,
      ciclo,
      precoPadraoCentavos: precoPadraoCentavos(plano, ciclo),
      precoEfetivoCentavos: precoEfetivoCentavos(plano, ciclo, condicao),
      condicaoAtiva: Boolean(condicao),
      condicaoAte: condicao?.fim ?? null,
      status: tenant?.assinatura_status ?? "ativa",
      testeAte: tenant?.teste_fim ?? null,
      limites: (["profissionais", "clientes", "agendamentos_mes"] as const).map((tipo) => ({
        tipo,
        limite: limiteVigente(plano, condicao, tipo),
        uso:
          tipo === "profissionais"
            ? (profRes.count ?? 0)
            : tipo === "clientes"
              ? (cliRes.count ?? 0)
              : (agRes.count ?? 0),
      })),
    };
  });

export type BannerDaHome = {
  id: string;
  titulo: string;
  subtitulo: string | null;
  imagemUrl: string | null;
  ctaRotulo: string | null;
  ctaDestino: string | null;
};

/** Banners e campanhas que o dono da plataforma publicou para esta barbearia. */
export const getBannersDaHome = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<BannerDaHome[]> => {
    const tenantId = await tenantIdDoMembro(context);
    const client = await db();
    const hoje = new Date().toISOString().slice(0, 10);
    const [{ data: tenant }, { data: banners }] = await Promise.all([
      client
        .from("tenants")
        .select("plano, assinatura_status, criado_em, teste_fim")
        .eq("id", tenantId)
        .maybeSingle(),
      client
        .from("banners_da_plataforma")
        .select("*")
        .eq("ativo", true)
        .lte("inicio", hoje)
        .order("prioridade", { ascending: false }),
    ]);

    const novo =
      tenant?.criado_em != null &&
      Date.now() - new Date(tenant.criado_em).getTime() < 30 * 86400000;
    const emTeste = tenant?.assinatura_status === "teste";
    const perto =
      tenant?.teste_fim != null && new Date(tenant.teste_fim).getTime() - Date.now() < 7 * 86400000;

    return (banners ?? [])
      .filter((b: any) => !b.fim || b.fim >= hoje)
      .filter((b: any) => {
        if (b.segmento === "todos") return true;
        if (b.segmento === "novos") return novo;
        if (b.segmento === "teste") return emTeste;
        if (b.segmento === "vencimento") return perto;
        if (b.segmento === "plano") return b.plano_alvo === tenant?.plano;
        if (b.segmento === "tenant") return b.tenant_alvo === tenantId;
        return false;
      })
      .map((b: any) => ({
        id: b.id,
        titulo: b.titulo,
        subtitulo: b.subtitulo ?? null,
        imagemUrl: b.imagem_url ?? null,
        ctaRotulo: b.cta_rotulo ?? null,
        ctaDestino: b.cta_destino ?? null,
      }));
  });

/**
 * Aplica um cupom na barbearia do usuário. O desconto vem sempre do cupom
 * gravado no banco — nada do que a tela envia vira preço.
 */
export const aplicarCupom = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ codigo: z.string().trim().min(2).max(40) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "gerenciar_plano");
    const client = await db();
    const hoje = new Date().toISOString().slice(0, 10);

    const { data: cupom } = await client
      .from("cupons")
      .select("*")
      .ilike("codigo", data.codigo.trim())
      .maybeSingle();
    if (!cupom || !cupom.ativo) throw new Error("Cupom inválido ou expirado.");
    if (cupom.inicio > hoje || (cupom.fim && cupom.fim < hoje))
      throw new Error("Cupom inválido ou expirado.");
    if (cupom.usos_max != null && cupom.usos >= cupom.usos_max)
      throw new Error("Este cupom já atingiu o limite de usos.");

    const { data: tenant } = await client
      .from("tenants")
      .select("plano, ciclo, criado_em")
      .eq("id", tenantId)
      .maybeSingle();
    if (cupom.planos.length && !cupom.planos.includes(tenant?.plano ?? "")) {
      throw new Error("Este cupom não vale para o seu plano.");
    }
    const novo =
      tenant?.criado_em != null &&
      Date.now() - new Date(tenant.criado_em).getTime() < 30 * 86400000;
    if (cupom.publico === "novos" && !novo)
      throw new Error("Este cupom é só para barbearias novas.");
    if (cupom.publico === "existentes" && novo)
      throw new Error("Este cupom é só para barbearias já clientes.");

    const { error: erroUso } = await client
      .from("cupons_usos")
      .insert({ cupom_id: cupom.id, tenant_id: tenantId, aplicado_por: context.userId });
    if (erroUso) throw new Error("Este cupom já foi usado nesta barbearia.");
    await client
      .from("cupons")
      .update({ usos: cupom.usos + 1 })
      .eq("id", cupom.id);

    const ciclo = tenant?.ciclo ?? "mensal";
    await client.from("condicoes_comerciais").insert({
      tenant_id: tenantId,
      plano_chave: tenant?.plano ?? "essencial",
      desconto_percentual: cupom.tipo === "percentual" ? cupom.valor : 0,
      desconto_centavos: cupom.tipo === "fixo" ? cupom.valor : 0,
      ciclo,
      fim: cupom.fim,
      motivo: `Cupom ${cupom.codigo}`,
      criado_por: context.userId,
    });
    return { ok: true, codigo: cupom.codigo };
  });

/* -------------------------------- ADMIN --------------------------------- */

export const listarPlanos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Plano[]> => {
    const client = await somenteAdmin(context);
    const { data } = await client.from("planos_da_plataforma").select("*").order("ordem");
    return (data ?? []).map(planoDaLinha);
  });

const planoSchema = z.object({
  id: z.string().uuid().optional(),
  chave: z
    .string()
    .trim()
    .regex(/^[a-z0-9_]{2,30}$/, "Use letras minúsculas, números ou _"),
  nome: z.string().trim().min(2).max(60),
  descricao: z.string().trim().max(300).nullable(),
  precoMensalCentavos: z.number().int().min(0),
  precoAnualCentavos: z.number().int().min(0),
  diasTeste: z.number().int().min(0).max(365),
  limiteProfissionais: z.number().int().min(0).nullable(),
  limiteClientes: z.number().int().min(0).nullable(),
  limiteAgendamentosMes: z.number().int().min(0).nullable(),
  limiteUnidades: z.number().int().min(0).nullable(),
  ordem: z.number().int().min(0).max(99),
  ativo: z.boolean(),
});

export const salvarPlano = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => planoSchema.parse(input))
  .handler(async ({ data, context }) => {
    const client = await somenteAdmin(context);
    const linha = {
      chave: data.chave,
      nome: data.nome,
      descricao: data.descricao,
      preco_mensal_centavos: data.precoMensalCentavos,
      preco_anual_centavos: data.precoAnualCentavos,
      dias_teste: data.diasTeste,
      limite_profissionais: data.limiteProfissionais,
      limite_clientes: data.limiteClientes,
      limite_agendamentos_mes: data.limiteAgendamentosMes,
      limite_unidades: data.limiteUnidades,
      ordem: data.ordem,
      ativo: data.ativo,
    };
    const { error } = data.id
      ? await client.from("planos_da_plataforma").update(linha).eq("id", data.id)
      : await client.from("planos_da_plataforma").insert(linha);
    if (error)
      throw new Error(
        error.message.includes("duplicate") ? "Já existe um plano com essa chave." : error.message,
      );
    return { ok: true };
  });

export type VisaoComercial = {
  tenantId: string;
  tenantNome: string;
  planoChave: string;
  ciclo: string;
  status: string;
  testeAte: string | null;
  precoPadraoCentavos: number;
  precoEfetivoCentavos: number;
  condicoes: Condicao[];
  cuponsAplicados: { codigo: string; criadoEm: string }[];
  uso: { profissionais: number; clientes: number; agendamentosMes: number };
  limites: {
    profissionais: number | null;
    clientes: number | null;
    agendamentos_mes: number | null;
  };
};

export const getVisaoComercialDoTenant = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ tenantId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<VisaoComercial> => {
    const client = await somenteAdmin(context);
    const inicioDoMes = new Date();
    inicioDoMes.setDate(1);
    inicioDoMes.setHours(0, 0, 0, 0);
    const [tenantRes, planosRes, condRes, usosRes, profRes, cliRes, agRes] = await Promise.all([
      client
        .from("tenants")
        .select("id, nome, plano, ciclo, assinatura_status, teste_fim")
        .eq("id", data.tenantId)
        .maybeSingle(),
      client.from("planos_da_plataforma").select("*"),
      client
        .from("condicoes_comerciais")
        .select("*")
        .eq("tenant_id", data.tenantId)
        .order("inicio", { ascending: false }),
      client.from("cupons_usos").select("criado_em, cupons(codigo)").eq("tenant_id", data.tenantId),
      client
        .from("profissionais")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", data.tenantId),
      client
        .from("clientes")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", data.tenantId),
      client
        .from("agendamentos")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", data.tenantId)
        .gte("inicio", inicioDoMes.toISOString()),
    ]);
    const tenant = tenantRes.data;
    if (!tenant) throw new Error("Barbearia não encontrada.");
    const planos = (planosRes.data ?? []).map(planoDaLinha);
    const condicoes = (condRes.data ?? []).map(condicaoDaLinha);
    const condicao = condicaoVigente(condicoes);
    const chave = condicao?.planoChave ?? tenant.plano;
    const plano = planos.find((p) => p.chave === chave) ?? null;
    const ciclo = condicao?.ciclo ?? tenant.ciclo;
    return {
      tenantId: tenant.id,
      tenantNome: tenant.nome,
      planoChave: chave,
      ciclo,
      status: tenant.assinatura_status,
      testeAte: tenant.teste_fim,
      precoPadraoCentavos: precoPadraoCentavos(plano, ciclo),
      precoEfetivoCentavos: precoEfetivoCentavos(plano, ciclo, condicao),
      condicoes,
      cuponsAplicados: (usosRes.data ?? []).map((u: any) => ({
        codigo: u.cupons?.codigo ?? "cupom",
        criadoEm: u.criado_em,
      })),
      uso: {
        profissionais: profRes.count ?? 0,
        clientes: cliRes.count ?? 0,
        agendamentosMes: agRes.count ?? 0,
      },
      limites: {
        profissionais: limiteVigente(plano, condicao, "profissionais"),
        clientes: limiteVigente(plano, condicao, "clientes"),
        agendamentos_mes: limiteVigente(plano, condicao, "agendamentos_mes"),
      },
    };
  });

const condicaoSchema = z.object({
  id: z.string().uuid().optional(),
  tenantId: z.string().uuid(),
  planoChave: z.string().trim().min(2).max(30),
  precoPersonalizadoCentavos: z.number().int().min(0).nullable(),
  descontoPercentual: z.number().int().min(0).max(100),
  descontoCentavos: z.number().int().min(0),
  ciclo: z.enum(["mensal", "anual"]),
  inicio: z.string().min(10).max(10),
  fim: z.string().min(10).max(10).nullable(),
  motivo: z.string().trim().max(500).nullable(),
  limites: z.record(z.string(), z.number().int().min(0)),
  recursos: z.array(z.string().max(60)).max(40),
  ativo: z.boolean(),
});

/** Condição especial de uma barbearia — não muda o preço padrão global. */
export const salvarCondicao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => condicaoSchema.parse(input))
  .handler(async ({ data, context }) => {
    const client = await somenteAdmin(context);
    const linha = {
      tenant_id: data.tenantId,
      plano_chave: data.planoChave,
      preco_personalizado_centavos: data.precoPersonalizadoCentavos,
      desconto_percentual: data.descontoPercentual,
      desconto_centavos: data.descontoCentavos,
      ciclo: data.ciclo,
      inicio: data.inicio,
      fim: data.fim,
      motivo: data.motivo,
      limites: data.limites,
      recursos: data.recursos,
      ativo: data.ativo,
      criado_por: context.userId,
    };
    const { error } = data.id
      ? await client.from("condicoes_comerciais").update(linha).eq("id", data.id)
      : await client.from("condicoes_comerciais").insert(linha);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const encerrarCondicao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const client = await somenteAdmin(context);
    const { error } = await client
      .from("condicoes_comerciais")
      .update({ ativo: false })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Troca o plano padrão da barbearia e, quando pedido, abre o teste grátis. */
export const definirPlanoDoTenant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        tenantId: z.string().uuid(),
        planoChave: z.string().trim().min(2).max(30),
        ciclo: z.enum(["mensal", "anual"]),
        status: z.enum(["teste", "ativa", "vencida", "cancelada"]),
        diasDeTeste: z.number().int().min(0).max(365).nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const client = await somenteAdmin(context);
    const testeFim =
      data.status === "teste" && data.diasDeTeste
        ? new Date(Date.now() + data.diasDeTeste * 86400000).toISOString()
        : data.status === "teste"
          ? undefined
          : null;
    const { error } = await client
      .from("tenants")
      .update({
        plano: data.planoChave,
        ciclo: data.ciclo,
        assinatura_status: data.status,
        ...(testeFim === undefined ? {} : { teste_fim: testeFim }),
        ...(data.status === "teste" ? { teste_inicio: new Date().toISOString() } : {}),
      })
      .eq("id", data.tenantId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* -------------------------------- CUPONS -------------------------------- */

export type CupomAdmin = {
  id: string;
  codigo: string;
  descricao: string | null;
  tipo: "percentual" | "fixo";
  valor: number;
  inicio: string;
  fim: string | null;
  usosMax: number | null;
  usos: number;
  publico: "todos" | "novos" | "existentes";
  planos: string[];
  ativo: boolean;
};

export const listarCupons = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CupomAdmin[]> => {
    const client = await somenteAdmin(context);
    const { data } = await client
      .from("cupons")
      .select("*")
      .order("criado_em", { ascending: false });
    return (data ?? []).map((c: any) => ({
      id: c.id,
      codigo: c.codigo,
      descricao: c.descricao ?? null,
      tipo: c.tipo,
      valor: c.valor,
      inicio: c.inicio,
      fim: c.fim,
      usosMax: c.usos_max,
      usos: c.usos,
      publico: c.publico,
      planos: c.planos ?? [],
      ativo: c.ativo,
    }));
  });

export const salvarCupom = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        codigo: z.string().trim().min(2).max(40),
        descricao: z.string().trim().max(200).nullable(),
        tipo: z.enum(["percentual", "fixo"]),
        valor: z.number().int().min(0),
        inicio: z.string().min(10).max(10),
        fim: z.string().min(10).max(10).nullable(),
        usosMax: z.number().int().min(1).nullable(),
        publico: z.enum(["todos", "novos", "existentes"]),
        planos: z.array(z.string().max(30)).max(20),
        ativo: z.boolean(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const client = await somenteAdmin(context);
    if (data.tipo === "percentual" && data.valor > 100)
      throw new Error("Desconto em percentual não pode passar de 100.");
    const linha = {
      codigo: data.codigo.toUpperCase(),
      descricao: data.descricao,
      tipo: data.tipo,
      valor: data.valor,
      inicio: data.inicio,
      fim: data.fim,
      usos_max: data.usosMax,
      publico: data.publico,
      planos: data.planos,
      ativo: data.ativo,
      criado_por: context.userId,
    };
    const { error } = data.id
      ? await client.from("cupons").update(linha).eq("id", data.id)
      : await client.from("cupons").insert(linha);
    if (error)
      throw new Error(
        error.message.includes("duplicate") ? "Já existe um cupom com esse código." : error.message,
      );
    return { ok: true };
  });

/* -------------------------------- BANNERS -------------------------------- */

export type BannerAdmin = {
  id: string;
  titulo: string;
  subtitulo: string | null;
  imagemUrl: string | null;
  ctaRotulo: string | null;
  ctaDestino: string | null;
  inicio: string;
  fim: string | null;
  prioridade: number;
  ativo: boolean;
  segmento: string;
  planoAlvo: string | null;
  tenantAlvo: string | null;
};

export const listarBanners = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<BannerAdmin[]> => {
    const client = await somenteAdmin(context);
    const { data } = await client
      .from("banners_da_plataforma")
      .select("*")
      .order("prioridade", { ascending: false });
    return (data ?? []).map((b: any) => ({
      id: b.id,
      titulo: b.titulo,
      subtitulo: b.subtitulo ?? null,
      imagemUrl: b.imagem_url ?? null,
      ctaRotulo: b.cta_rotulo ?? null,
      ctaDestino: b.cta_destino ?? null,
      inicio: b.inicio,
      fim: b.fim,
      prioridade: b.prioridade,
      ativo: b.ativo,
      segmento: b.segmento,
      planoAlvo: b.plano_alvo,
      tenantAlvo: b.tenant_alvo,
    }));
  });

export const salvarBanner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        titulo: z.string().trim().min(2).max(80),
        subtitulo: z.string().trim().max(200).nullable(),
        imagemUrl: z.string().trim().max(500).nullable(),
        ctaRotulo: z.string().trim().max(40).nullable(),
        ctaDestino: z.string().trim().max(200).nullable(),
        inicio: z.string().min(10).max(10),
        fim: z.string().min(10).max(10).nullable(),
        prioridade: z.number().int().min(0).max(99),
        ativo: z.boolean(),
        segmento: z.enum(["todos", "novos", "teste", "plano", "tenant", "vencimento"]),
        planoAlvo: z.string().trim().max(30).nullable(),
        tenantAlvo: z.string().uuid().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const client = await somenteAdmin(context);
    const linha = {
      titulo: data.titulo,
      subtitulo: data.subtitulo,
      imagem_url: data.imagemUrl,
      cta_rotulo: data.ctaRotulo,
      cta_destino: data.ctaDestino,
      inicio: data.inicio,
      fim: data.fim,
      prioridade: data.prioridade,
      ativo: data.ativo,
      segmento: data.segmento,
      plano_alvo: data.segmento === "plano" ? data.planoAlvo : null,
      tenant_alvo: data.segmento === "tenant" ? data.tenantAlvo : null,
      criado_por: context.userId,
    };
    const { error } = data.id
      ? await client.from("banners_da_plataforma").update(linha).eq("id", data.id)
      : await client.from("banners_da_plataforma").insert(linha);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removerBanner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const client = await somenteAdmin(context);
    const { error } = await client.from("banners_da_plataforma").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
