import { esquemaRegrasDeAgendamento, passoValido } from "@/lib/onboarding-regras";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { exigirPermissao, tenantIdDoMembro } from "@/lib/tenant";
import type { HorarioSugerido } from "@/lib/ia/assistente";
import { FUSOS_DA_BARBEARIA, normalizarFuso } from "@/lib/horarios";
import { capacidadesDoTenant } from "@/lib/capacidades.functions";
import { PERMISSOES } from "@/lib/permissoes";
import type { CapacidadesDoTenant } from "@/lib/capacidades";
import {
  SEGMENTOS_CONFIG,
  chipsSaoPadraoBarbearia,
  segmentoParaApresentacao,
  type Segmento,
} from "@/lib/segmentos";
import { normalizarPagina } from "@/lib/pagina-config";
import type { Json } from "@/integrations/supabase/types";

/** Primeiros passos depois do onboarding. Cada item é detectado de verdade no banco. */
export const ITENS_DO_CHECKLIST = [
  { chave: "cadastrar_servicos", rotulo: "Cadastre seus serviços", destino: "/barbeiro/servicos" },
  {
    chave: "cadastrar_profissionais",
    rotulo: "Cadastre os profissionais",
    destino: "/barbeiro/profissionais",
  },
  { chave: "whatsapp", rotulo: "Conecte o WhatsApp", destino: "/barbeiro/cortai" },
  {
    chave: "compartilhar_link",
    rotulo: "Compartilhe seu link de agendamento",
    destino: "/barbeiro/configurar",
  },
] as const;

export type ChaveDoChecklist = (typeof ITENS_DO_CHECKLIST)[number]["chave"];

export type ServicoDaBarbearia = {
  id: string;
  nome: string;
  duracaoMin: number;
  precoCentavos: number;
  ativo: boolean;
  categoria: string;
  profissionalIds: string[];
  /** Prazo para lembrar o cliente de voltar; null = prazo geral. */
  retornoDias: number | null;
  fotoUrl: string | null;
};

export type RegrasDeAgendamento = {
  antecedenciaMinMinutos: number;
  cancelamentoMinHoras: number;
  intervaloEntreMin: number;
  aceitaEncaixe: boolean;
  /** Período máximo para agendar (7 a 90 dias). */
  janelaDias: number;
  /** Passo dos horários oferecidos (15, 20, 30 ou 40 min). */
  passoMin: number;
};

export const REGRAS_RECOMENDADAS: RegrasDeAgendamento = {
  antecedenciaMinMinutos: 60,
  cancelamentoMinHoras: 2,
  intervaloEntreMin: 0,
  aceitaEncaixe: true,
  janelaDias: 30,
  passoMin: 30,
};

function paraServico(s: Record<string, any>): ServicoDaBarbearia {
  return {
    id: s["id"] as string,
    nome: s["nome"] as string,
    duracaoMin: s["duracao_min"] as number,
    precoCentavos: s["preco_centavos"] as number,
    ativo: Boolean(s["ativo"]),
    categoria: (s["categoria"] as string | null) ?? "Serviço",
    profissionalIds: (s["profissional_ids"] as string[] | null) ?? [],
    retornoDias: (s["retorno_dias"] as number | null) ?? null,
    fotoUrl: (s["foto_url"] as string | null) ?? null,
  };
}

function paraHorario(h: Record<string, any>): HorarioSugerido {
  return {
    diaSemana: h["dia_semana"] as number,
    fechado: Boolean(h["fechado"]),
    abre: String(h["abre"]).slice(0, 5),
    fecha: String(h["fecha"]).slice(0, 5),
    intervaloInicio: h["intervalo_inicio"] ? String(h["intervalo_inicio"]).slice(0, 5) : null,
    intervaloFim: h["intervalo_fim"] ? String(h["intervalo_fim"]).slice(0, 5) : null,
  };
}

/** Detecta os primeiros passos pelo que aconteceu de fato. */
async function detectarPrimeirosPassos(db: any, tenantId: string, itens: Record<string, boolean>) {
  const [servicos, conexao, profissionais] = await Promise.all([
    db.from("servicos").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
    db
      .from("conexoes_whatsapp")
      .select("status")
      .eq("tenant_id", tenantId)
      .eq("status", "conectado")
      .limit(1),
    db.from("profissionais").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
  ]);
  // Cada item conta como feito quando detectado de verdade ou quando o dono pulou.
  return {
    cadastrar_servicos: Boolean(itens["cadastrar_servicos"]) || (servicos.count ?? 0) > 0,
    cadastrar_profissionais:
      Boolean(itens["cadastrar_profissionais"]) || (profissionais.count ?? 0) > 0,
    whatsapp: Boolean(itens["whatsapp"]) || (conexao.data ?? []).length > 0,
    compartilhar_link: Boolean(itens["compartilhar_link"]),
  };
}

export type ConfiguracaoInicial = {
  tenant: {
    id: string;
    nome: string;
    slug: string;
    whatsapp: string | null;
    logoUrl: string | null;
    fuso: string;
    segmento: Segmento;
  };
  horarios: HorarioSugerido[];
  servicos: ServicoDaBarbearia[];
  etapa: string;
  itens: Record<string, boolean>;
  tourVisto: boolean;
  concluidoEm: string | null;
};

const horarioSchema = z.object({
  diaSemana: z.number().int().min(0).max(6),
  fechado: z.boolean(),
  abre: z.string().regex(/^\d{2}:\d{2}$/),
  fecha: z.string().regex(/^\d{2}:\d{2}$/),
  intervaloInicio: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .nullable()
    .optional(),
  intervaloFim: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .nullable()
    .optional(),
});

const servicoSchema = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().trim().min(2).max(60),
  duracaoMin: z.number().int().min(5).max(480),
  precoCentavos: z.number().int().min(0).max(10_000_000),
  categoria: z.string().trim().max(40).optional(),
  profissionalIds: z.array(z.string().uuid()).max(50).optional(),
  retornoDias: z.number().int().min(3).max(365).nullable().optional(),
  fotoUrl: z.string().max(500).nullable().optional(),
});

export const getConfiguracaoInicial = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ConfiguracaoInicial> => {
    const tenantId = await tenantIdDoMembro(context);
    const db = context.supabase;
    const [tenantRes, horariosRes, servicosRes, onbRes] = await Promise.all([
      db
        .from("tenants")
        .select("id, nome, slug, whatsapp, logo_url, fuso, segmento")
        .eq("id", tenantId)
        .maybeSingle(),
      db
        .from("horarios_de_funcionamento")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("dia_semana"),
      db.from("servicos").select("*").eq("tenant_id", tenantId).order("ordem").order("nome"),
      db.from("onboarding_do_tenant").select("*").eq("tenant_id", tenantId).maybeSingle(),
    ]);

    const tenant = tenantRes.data;
    if (!tenant) throw new Error("Negócio não encontrado.");

    const segmento = segmentoParaApresentacao(tenant.segmento);
    const horarios: HorarioSugerido[] = (horariosRes.data ?? []).length
      ? (horariosRes.data ?? []).map(paraHorario)
      : SEGMENTOS_CONFIG[segmento].horariosPadrao.map((horario) => ({ ...horario }));

    const servicos: ServicoDaBarbearia[] = (servicosRes.data ?? []).map(paraServico);

    const onb = onbRes.data as Record<string, any> | null;
    const gravados = (onb?.["itens"] ?? {}) as Record<string, boolean>;
    const itens = { ...gravados, ...(await detectarPrimeirosPassos(db, tenantId, gravados)) };

    return {
      tenant: {
        id: tenant.id as string,
        nome: tenant.nome as string,
        slug: tenant.slug as string,
        whatsapp: (tenant.whatsapp as string) ?? null,
        logoUrl: (tenant.logo_url as string) ?? null,
        fuso: normalizarFuso(tenant.fuso as string | null),
        segmento,
      },
      horarios,
      servicos,
      etapa: (onb?.["etapa"] as string) ?? "dados",
      itens,
      tourVisto: Boolean(onb?.["tour_visto"]),
      concluidoEm: (onb?.["concluido_em"] as string) ?? null,
    };
  });

async function gravarOnboarding(
  context: { supabase: any; userId: string },
  tenantId: string,
  campos: Record<string, unknown>,
) {
  const { error } = await context.supabase
    .from("onboarding_do_tenant")
    .upsert({ tenant_id: tenantId, ...campos }, { onConflict: "tenant_id" });
  if (error) throw new Error(error.message);
}

export const salvarDadosDaBarbearia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        nome: z.string().trim().min(2).max(80),
        whatsapp: z.string().trim().max(30).optional().default(""),
        telefone: z.string().trim().max(30).optional(),
        endereco: z.string().trim().max(160).optional(),
        logoUrl: z.string().trim().max(300).nullable().optional(),
        fuso: z.enum(FUSOS_DA_BARBEARIA.map((f) => f.valor) as [string, ...string[]]).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "alterar_dados_barbearia");
    const whatsapp = data.whatsapp.replace(/\D/g, "");
    const campos = {
      nome: data.nome,
      whatsapp: whatsapp || null,
      ...(data.telefone !== undefined
        ? { telefone: data.telefone.replace(/\D/g, "") || null }
        : {}),
      ...(data.endereco !== undefined ? { endereco: data.endereco || null } : {}),
      ...(data.fuso ? { fuso: data.fuso } : {}),
      // Só aceita arquivo dentro da pasta da própria barbearia.
      ...(data.logoUrl !== undefined &&
      (data.logoUrl === null || data.logoUrl.startsWith(`${tenantId}/`))
        ? { logo_url: data.logoUrl }
        : {}),
    };
    const { error } = await context.supabase.from("tenants").update(campos).eq("id", tenantId);

    if (error) throw new Error(error.message);
    if (data.fuso) {
      const { esquecerFusoDoTenant } = await import("@/lib/fuso.server");
      esquecerFusoDoTenant(tenantId);
    }
    return { ok: true };
  });

export const salvarHorarios = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        horarios: z.array(horarioSchema).min(1).max(7),
        fuso: z.enum(FUSOS_DA_BARBEARIA.map((f) => f.valor) as [string, ...string[]]).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "alterar_dados_barbearia");
    const linhas = data.horarios.map((h) => ({
      tenant_id: tenantId,
      dia_semana: h.diaSemana,
      fechado: h.fechado,
      abre: `${h.abre}:00`,
      fecha: `${h.fecha}:00`,
      intervalo_inicio:
        !h.fechado && h.intervaloInicio && h.intervaloFim ? `${h.intervaloInicio}:00` : null,
      intervalo_fim:
        !h.fechado && h.intervaloInicio && h.intervaloFim ? `${h.intervaloFim}:00` : null,
    }));
    const { error } = await context.supabase
      .from("horarios_de_funcionamento")
      .upsert(linhas, { onConflict: "tenant_id,dia_semana" });
    if (error) throw new Error(error.message);
    if (data.fuso) {
      const { error: erroFuso } = await context.supabase
        .from("tenants")
        .update({ fuso: data.fuso })
        .eq("id", tenantId);
      if (erroFuso) throw new Error(erroFuso.message);
      const { esquecerFusoDoTenant } = await import("@/lib/fuso.server");
      esquecerFusoDoTenant(tenantId);
    }
    return { ok: true };
  });

export const salvarServicos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z.object({ servicos: z.array(servicoSchema).min(1).max(40) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "alterar_dados_barbearia");
    const db = context.supabase;

    const novos = data.servicos.filter((s) => !s.id);
    const existentes = data.servicos.filter((s) => s.id);

    if (novos.length) {
      const { error } = await db.from("servicos").insert(
        novos.map((s, i) => ({
          tenant_id: tenantId,
          nome: s.nome,
          duracao_min: s.duracaoMin,
          preco_centavos: s.precoCentavos,
          categoria: s.categoria ?? null,
          profissional_ids: s.profissionalIds ?? [],
          retorno_dias: s.retornoDias ?? null,
          foto_url: s.fotoUrl ?? null,
          ordem: i,
        })),
      );
      if (error) throw new Error(error.message);
    }
    for (const s of existentes) {
      if (!s.id) continue;
      const { error } = await db
        .from("servicos")
        .update({
          nome: s.nome,
          duracao_min: s.duracaoMin,
          preco_centavos: s.precoCentavos,
          ...(s.categoria !== undefined ? { categoria: s.categoria } : {}),
          ...(s.profissionalIds !== undefined ? { profissional_ids: s.profissionalIds } : {}),
          ...(s.retornoDias !== undefined ? { retorno_dias: s.retornoDias } : {}),
          ...(s.fotoUrl !== undefined ? { foto_url: s.fotoUrl } : {}),
        })
        .eq("id", s.id)
        .eq("tenant_id", tenantId);
      if (error) throw new Error(error.message);
    }

    const itens = await lerItens(context, tenantId);
    await gravarOnboarding(context, tenantId, { itens: { ...itens, servicos: true } });
    return { ok: true, criados: novos.length, atualizados: existentes.length };
  });

export const removerServico = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "alterar_dados_barbearia");
    const { error } = await context.supabase
      .from("servicos")
      .update({ ativo: false })
      .eq("id", data.id)
      .eq("tenant_id", tenantId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

async function lerItens(
  context: { supabase: any },
  tenantId: string,
): Promise<Record<string, boolean>> {
  const { data } = await context.supabase
    .from("onboarding_do_tenant")
    .select("itens")
    .eq("tenant_id", tenantId)
    .maybeSingle();
  return (data?.itens ?? {}) as Record<string, boolean>;
}

export const concluirConfiguracao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "alterar_dados_barbearia");
    const itens = await lerItens(context, tenantId);
    await gravarOnboarding(context, tenantId, {
      etapa: "pronto",
      concluido_em: new Date().toISOString(),
      itens: { ...itens, configurar: true, publicar: true },
    });
    return { ok: true };
  });

export const marcarItemDoChecklist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({ chave: z.string().trim().min(2).max(30), feito: z.boolean().default(true) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const tenantId = await tenantIdDoMembro(context);
    const permitido =
      data.chave === "sozinho" || ITENS_DO_CHECKLIST.some((i) => i.chave === data.chave);
    if (!permitido) throw new Error("Item desconhecido.");
    await exigirPermissao(context, tenantId, "alterar_dados_barbearia");
    const itens = await lerItens(context, tenantId);
    await gravarOnboarding(context, tenantId, { itens: { ...itens, [data.chave]: data.feito } });
    return { ok: true };
  });

export const marcarTourVisto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "alterar_dados_barbearia");
    await gravarOnboarding(context, tenantId, { tour_visto: true });
    return { ok: true };
  });

/* ---------------------- IMPLANTAÇÃO GUIADA (onboarding) ------------------ */

/** Ordem do onboarding. As etapas antigas continuam aceitas para quem parou no meio. */
export const ETAPAS_DO_ONBOARDING = [
  "dados",
  "equipe",
  "servicos",
  "horarios",
  "regras",
  "canais",
  "link",
  "pronto",
] as const;
export const ETAPAS_DA_IMPLANTACAO = [
  ...ETAPAS_DO_ONBOARDING,
  "boas_vindas",
  "agenda",
  "canais",
  "recursos",
] as const;

export type EtapaDaImplantacao = (typeof ETAPAS_DA_IMPLANTACAO)[number];

export type ProfissionalDaImplantacao = { id: string; nome: string; ativo: boolean };

export type Implantacao = ConfiguracaoInicial & {
  tenant: ConfiguracaoInicial["tenant"] & {
    telefone: string | null;
    endereco: string | null;
    logoAssinada: string | null;
  };
  regras: RegrasDeAgendamento;
  trabalhaSozinho: boolean;
  profissionais: ProfissionalDaImplantacao[];
  capacidades: CapacidadesDoTenant;
  permissoes: string[];
  whatsappConectado: boolean;
  modoAgendamento: "tradicional" | "conversa";
};

/** Leitura única com tudo que a implantação precisa. Evita telas em cascata. */
export const getImplantacao = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Implantacao> => {
    const tenantId = await tenantIdDoMembro(context);
    const db = context.supabase;

    const [
      tenantRes,
      horariosRes,
      servicosRes,
      onbRes,
      profRes,
      conexaoRes,
      acessoRes,
      paginaRes,
      capacidades,
    ] = await Promise.all([
      db
        .from("tenants")
        .select(
          "id, nome, slug, whatsapp, logo_url, fuso, telefone, endereco, segmento, antecedencia_min_minutos, cancelamento_min_horas, intervalo_entre_min, aceita_encaixe, janela_agendamento_dias, passo_horarios_min",
        )
        .eq("id", tenantId)
        .maybeSingle(),
      db
        .from("horarios_de_funcionamento")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("dia_semana"),
      db.from("servicos").select("*").eq("tenant_id", tenantId).order("ordem").order("nome"),
      db.from("onboarding_do_tenant").select("*").eq("tenant_id", tenantId).maybeSingle(),
      db.from("profissionais").select("id, nome, ativo").eq("tenant_id", tenantId).order("nome"),
      db
        .from("conexoes_whatsapp")
        .select("status")
        .eq("tenant_id", tenantId)
        .order("tipo", { ascending: true })
        .limit(1)
        .maybeSingle(),
      db.rpc("meu_acesso_no_tenant", { _tenant_id: tenantId }),
      db
        .from("tenant_page_configs")
        .select("draft_config, published_config")
        .eq("tenant_id", tenantId)
        .maybeSingle(),
      capacidadesDoTenant(db, tenantId),
    ]);

    const tenant = tenantRes.data;
    if (!tenant) throw new Error("Negócio não encontrado.");

    const segmento = segmentoParaApresentacao((tenant as Record<string, unknown>)["segmento"]);
    const horarios: HorarioSugerido[] = (horariosRes.data ?? []).length
      ? (horariosRes.data ?? []).map(paraHorario)
      : SEGMENTOS_CONFIG[segmento].horariosPadrao.map((horario) => ({ ...horario }));

    const servicos: ServicoDaBarbearia[] = (servicosRes.data ?? []).map(paraServico);
    const t = tenant as Record<string, any>;
    let logoAssinada: string | null = null;
    if (t["logo_url"]) {
      const caminho = String(t["logo_url"]);
      if (/^https?:/.test(caminho)) logoAssinada = caminho;
      else {
        const { data: assinada } = await db.storage
          .from("tenant-logos")
          .createSignedUrl(caminho, 60 * 60);
        logoAssinada = assinada?.signedUrl ?? null;
      }
    }

    const onb = onbRes.data as Record<string, any> | null;
    const itens = (onb?.["itens"] ?? {}) as Record<string, boolean>;
    const acesso = Array.isArray(acessoRes.data)
      ? (acessoRes.data[0] as Record<string, any> | undefined)
      : null;
    const paginaContainer = (paginaRes.data?.draft_config ?? paginaRes.data?.published_config) as {
      pagina?: unknown;
    } | null;

    return {
      tenant: {
        id: tenant.id as string,
        nome: tenant.nome as string,
        slug: tenant.slug as string,
        whatsapp: (tenant.whatsapp as string) ?? null,
        logoUrl: (tenant.logo_url as string) ?? null,
        fuso: normalizarFuso(tenant.fuso as string | null),
        telefone: (tenant.telefone as string) ?? null,
        endereco: (tenant.endereco as string) ?? null,
        logoAssinada,
        segmento,
      },
      regras: {
        antecedenciaMinMinutos: Number(
          t["antecedencia_min_minutos"] ?? REGRAS_RECOMENDADAS.antecedenciaMinMinutos,
        ),
        cancelamentoMinHoras: Number(
          t["cancelamento_min_horas"] ?? REGRAS_RECOMENDADAS.cancelamentoMinHoras,
        ),
        intervaloEntreMin: Number(
          t["intervalo_entre_min"] ?? REGRAS_RECOMENDADAS.intervaloEntreMin,
        ),
        aceitaEncaixe: t["aceita_encaixe"] == null ? true : Boolean(t["aceita_encaixe"]),
        janelaDias: Number(t["janela_agendamento_dias"] ?? 30),
        passoMin: passoValido(t["passo_horarios_min"] ?? 30),
      },
      trabalhaSozinho: Boolean(itens["sozinho"]),
      horarios,
      servicos,
      etapa: (onb?.["etapa"] as string) ?? "dados",
      itens: {
        ...itens,
        servicos: itens["servicos"] ?? servicos.length > 0,
        configurar: itens["configurar"] ?? Boolean(onb?.["concluido_em"]),
      },
      tourVisto: Boolean(onb?.["tour_visto"]),
      concluidoEm: (onb?.["concluido_em"] as string) ?? null,
      profissionais: (profRes.data ?? []).map((p: Record<string, any>) => ({
        id: p["id"] as string,
        nome: p["nome"] as string,
        ativo: Boolean(p["ativo"]),
      })),
      capacidades,
      // Dono enxerga tudo; os demais papéis seguem exatamente as permissões gravadas.
      permissoes:
        (acesso?.["papel"] as string | undefined) === "dono"
          ? Object.keys(PERMISSOES)
          : (((acesso?.["permissoes"] as string[] | undefined) ?? []) as string[]),

      whatsappConectado: (conexaoRes.data?.status as string | undefined) === "conectado",
      modoAgendamento: normalizarPagina(paginaContainer?.pagina).chat.modo,
    };
  });

export const salvarModoAgendamento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z.object({ modo: z.enum(["tradicional", "conversa"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "alterar_dados_barbearia");
    const { data: existente } = await context.supabase
      .from("tenant_page_configs")
      .select("draft_config, published_config")
      .eq("tenant_id", tenantId)
      .maybeSingle();
    const draftContainer = (existente?.draft_config ?? existente?.published_config) as {
      pagina?: unknown;
      marca?: unknown;
    } | null;
    const publishedContainer = (existente?.published_config ?? existente?.draft_config) as {
      pagina?: unknown;
      marca?: unknown;
    } | null;
    const draftPagina = normalizarPagina(draftContainer?.pagina);
    const publishedPagina = normalizarPagina(publishedContainer?.pagina);
    const draftConfig = {
      ...(draftContainer ?? {}),
      pagina: { ...draftPagina, chat: { ...draftPagina.chat, modo: data.modo } },
    } as unknown as Json;
    const publishedConfig = {
      ...(publishedContainer ?? {}),
      pagina: { ...publishedPagina, chat: { ...publishedPagina.chat, modo: data.modo } },
    } as unknown as Json;
    const { error } = await context.supabase.from("tenant_page_configs").upsert(
      {
        tenant_id: tenantId,
        draft_config: draftConfig,
        published_config: publishedConfig,
        draft_by: context.userId,
        published_by: context.userId,
        published_at: new Date().toISOString(),
      },
      { onConflict: "tenant_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getFilaDeChegadaConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const tenantId = await tenantIdDoMembro(context);
    const { filaDeChegadaAtiva, contarFilaDeChegada } = await import("@/lib/fila-chegada.server");
    const [ativa, naFila] = await Promise.all([
      filaDeChegadaAtiva(context.supabase, tenantId),
      contarFilaDeChegada(context.supabase, tenantId),
    ]);
    return { ativa, naFila };
  });

export const salvarFilaDeChegada = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ ativa: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "alterar_dados_barbearia");
    const { data: existente } = await context.supabase
      .from("tenant_page_configs")
      .select("draft_config, published_config")
      .eq("tenant_id", tenantId)
      .maybeSingle();
    const draftContainer = (existente?.draft_config ?? existente?.published_config) as {
      pagina?: unknown;
    } | null;
    const publishedContainer = (existente?.published_config ?? existente?.draft_config) as {
      pagina?: unknown;
    } | null;
    const draftConfig = {
      ...(draftContainer ?? {}),
      pagina: { ...normalizarPagina(draftContainer?.pagina), filaDeChegada: data.ativa },
    } as unknown as Json;
    const publishedConfig = {
      ...(publishedContainer ?? {}),
      pagina: { ...normalizarPagina(publishedContainer?.pagina), filaDeChegada: data.ativa },
    } as unknown as Json;
    const { error } = await context.supabase.from("tenant_page_configs").upsert(
      {
        tenant_id: tenantId,
        draft_config: draftConfig,
        published_config: publishedConfig,
        draft_by: context.userId,
        published_by: context.userId,
        published_at: new Date().toISOString(),
      },
      { onConflict: "tenant_id" },
    );
    if (error) throw new Error(error.message);
    const { contarFilaDeChegada } = await import("@/lib/fila-chegada.server");
    return { ok: true, naFila: await contarFilaDeChegada(context.supabase, tenantId) };
  });

export const alterarSegmento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        segmento: z.enum([
          "barbearia",
          "salao",
          "cabeleireiro",
          "esmalteria",
          "sobrancelha_cilios",
          "estetica",
          "outro",
        ]),
        aplicarCores: z.boolean().default(false),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "alterar_dados_barbearia");
    const definicao = SEGMENTOS_CONFIG[data.segmento];
    const campos = data.aplicarCores
      ? {
          segmento: data.segmento,
          identidade_app: definicao.identidade,
          modo: definicao.modoPadrao,
        }
      : { segmento: data.segmento };
    const { error } = await context.supabase.from("tenants").update(campos).eq("id", tenantId);
    if (error) throw new Error("Não foi possível alterar o tipo de negócio.");
    const { data: t } = await context.supabase
      .from("tenants")
      .select("chips_ficha")
      .eq("id", tenantId)
      .maybeSingle();
    const ofereceTrocarAtalhos =
      data.segmento !== "barbearia" && chipsSaoPadraoBarbearia(t?.chips_ficha);
    return {
      ok: true,
      identidade: definicao.identidade,
      modo: definicao.modoPadrao,
      ofereceTrocarAtalhos,
    };
  });

/** Troca os atalhos da ficha pelos do segmento — só se ainda forem os padrão da barbearia. */
export const trocarAtalhosDaFicha = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "alterar_dados_barbearia");
    const { data: t } = await context.supabase
      .from("tenants")
      .select("chips_ficha, segmento")
      .eq("id", tenantId)
      .maybeSingle();
    if (!t || !chipsSaoPadraoBarbearia(t.chips_ficha)) return { ok: false };
    const chips = SEGMENTOS_CONFIG[segmentoParaApresentacao(t.segmento)].chipsFicha;
    const { error } = await context.supabase
      .from("tenants")
      .update({ chips_ficha: chips })
      .eq("id", tenantId);
    if (error) throw new Error("Não foi possível trocar os atalhos da ficha.");
    return { ok: true };
  });

/** Guarda a etapa alcançada, para a pessoa poder sair e voltar sem perder nada. */
export const salvarEtapaDaImplantacao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ etapa: z.enum(ETAPAS_DA_IMPLANTACAO) }).parse(input))
  .handler(async ({ data, context }) => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "alterar_dados_barbearia");
    await gravarOnboarding(context, tenantId, { etapa: data.etapa });
    return { ok: true };
  });

/** Cadastra o primeiro profissional (e os próximos) respeitando o limite do plano. */
export const adicionarProfissional = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ nome: z.string().trim().min(2).max(60) }).parse(input))
  .handler(async ({ data, context }) => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "gerenciar_profissionais");
    const capacidades = await capacidadesDoTenant(context.supabase, tenantId);
    const limite = capacidades.limites.profissionais;
    if (limite != null && capacidades.uso.profissionais >= limite) {
      throw new Error(
        `Seu plano ${capacidades.plano.nome} permite ${limite} profissional(is). Fale com o Flow para liberar mais.`,
      );
    }
    const { error } = await context.supabase
      .from("profissionais")
      .insert({ tenant_id: tenantId, nome: data.nome, ativo: true });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Regras de agendamento da barbearia (antecedência, cancelamento, intervalo e encaixe). */
export const salvarRegrasDeAgendamento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => esquemaRegrasDeAgendamento.parse(input))
  .handler(async ({ data, context }) => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "alterar_dados_barbearia");
    const { error } = await context.supabase
      .from("tenants")
      .update({
        antecedencia_min_minutos: data.antecedenciaMinMinutos,
        cancelamento_min_horas: data.cancelamentoMinHoras,
        intervalo_entre_min: data.intervaloEntreMin,
        aceita_encaixe: data.aceitaEncaixe,
        janela_agendamento_dias: data.janelaDias,
        passo_horarios_min: data.passoMin,
      })
      .eq("id", tenantId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Aviso do painel: barbearia sem nenhum dia aberto não aparece para agendamento online. */
export const getAvisoDeHorarios = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ semHorarioAberto: boolean }> => {
    const tenantId = await tenantIdDoMembro(context);
    const { data } = await context.supabase
      .from("horarios_de_funcionamento")
      .select("dia_semana")
      .eq("tenant_id", tenantId)
      .eq("fechado", false)
      .limit(1);
    return { semHorarioAberto: (data ?? []).length === 0 };
  });

/** Interruptor da recuperação automática de vagas (separado da Fila de chegada). */
export const getListaEsperaAutomatica = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const tenantId = await tenantIdDoMembro(context);
    const { data } = await context.supabase
      .from("tenants")
      .select("lista_espera_automatica")
      .eq("id", tenantId)
      .maybeSingle();
    return { ativa: data?.lista_espera_automatica !== false };
  });

export const salvarListaEsperaAutomatica = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ ativa: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "alterar_dados_barbearia");
    const { error } = await context.supabase.rpc("definir_lista_espera_automatica", {
      _tenant_id: tenantId,
      _ativo: data.ativa,
    });
    if (error) throw new Error("Não consegui salvar agora.");
    return { ativa: data.ativa };
  });
