import { createServerFn } from "@tanstack/react-start";
import {
  haAlteracoesPendentes,
  lacunasDaPagina,
  mesmoConteudo,
  type Lacuna,
} from "@/lib/pagina-pendencias";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database, Json } from "@/integrations/supabase/types";
import { exigirRecurso } from "@/lib/planos";
import { escolherVinculo } from "@/lib/vinculo-ativo";
import {
  normalizarPagina,
  paginaConfigSchema,
  VERSAO_DA_PAGINA,
  preservarFilaDeChegada,
  type PaginaConfig,
} from "@/lib/pagina-config";
import { SEGMENTOS_CONFIG, segmentoValido, type Segmento } from "@/lib/segmentos";

const hex = z.string().regex(/^#[0-9A-Fa-f]{6}$/);
const nullableText = z.string().trim().max(500).nullable();

const TEMAS_MARCA = [
  "cortai",
  "classica",
  "dourada",
  "vibrante",
  "escura",
  "quente",
  "clara",
  "personalizada",
] as const;

function corValida(valor: unknown): valor is string {
  return typeof valor === "string" && /^#[0-9A-Fa-f]{6}$/.test(valor);
}

function temaConhecido(valor: unknown): valor is (typeof TEMAS_MARCA)[number] {
  return typeof valor === "string" && (TEMAS_MARCA as readonly string[]).includes(valor);
}

const marcaSchema = z.object({
  nome: z.string().trim().min(2).max(100),
  endereco: nullableText,
  telefone: nullableText,
  instagram: nullableText,
  whatsapp: nullableText,
  facebook: nullableText,
  tema: z.enum(TEMAS_MARCA),
  cor_primaria: hex,
  cor_secundaria: hex,
  cor_accent: hex,
  rotulo_carteira: nullableText,
  texto_boas_vindas: nullableText,
  descricao: nullableText,
  capa_url: z.string().max(500).nullable(),
  fotos: z.array(z.string().max(500)).max(8),
  assinatura_visivel: z.boolean(),
  logo_url: z.string().max(500).nullable(),
});

export type MarcaForm = z.infer<typeof marcaSchema>;

export type MarcaData = MarcaForm & {
  id: string;
  plano: string;
  logo_signed_url: string | null;
  capa_signed_url: string | null;
  avatar_signed_url: string | null;
  slug: string;
  pagina: PaginaConfig;
  publicada: PaginaConfig;
  alteracoes_pendentes: boolean;
  pagina_online: boolean;
  lacunas: Lacuna[];
  segmento: Segmento;
};

export type MarcaVersion = {
  id: string;
  versao: number;
  criado_em: string;
  restaurado_de: string | null;
  snapshot: MarcaForm;
  pagina: PaginaConfig | null;
};

const editorSchema = z.object({ marca: marcaSchema, pagina: paginaConfigSchema });

/** Container salvo atual (publicado tem prioridade), para preservar a fila de chegada. */
async function containerSalvo(db: SupabaseClient<Database>, tenantId: string) {
  const { data } = await db
    .from("tenant_page_configs")
    .select("draft_config, published_config")
    .eq("tenant_id", tenantId)
    .maybeSingle();
  return (data?.published_config ?? data?.draft_config ?? null) as unknown;
}

async function tenantDoDono(supabase: SupabaseClient<Database>, userId: string) {
  const [{ data: vinculosDono }, { data: perfil }] = await Promise.all([
    supabase
      .from("tenant_usuarios")
      .select("tenant_id, papel, ativo")
      .eq("user_id", userId)
      .eq("papel", "dono")
      .order("criado_em", { ascending: true }),
    supabase.from("perfis").select("tenant_ativo").eq("user_id", userId).maybeSingle(),
  ]);

  // O fluxo normal continua exigindo vínculo ativo de dono.
  const vinculoDono = escolherVinculo(vinculosDono ?? [], perfil?.tenant_ativo);
  if (vinculoDono?.ativo) return vinculoDono.tenant_id;

  // Exceção restrita à demo: um membro ativo pode personalizar apenas o tenant
  // explicitamente identificado pelo slug reservado "demonstracao".
  const { data: vinculosAtivos } = await supabase
    .from("tenant_usuarios")
    .select("tenant_id, papel, ativo")
    .eq("user_id", userId)
    .eq("ativo", true)
    .order("criado_em", { ascending: true });

  const ids = [...new Set((vinculosAtivos ?? []).map((v) => v.tenant_id))];
  if (ids.length) {
    const { data: tenantDemo } = await supabase
      .from("tenants")
      .select("id")
      .eq("slug", "demonstracao")
      .in("id", ids)
      .maybeSingle();
    if (tenantDemo?.id) return tenantDemo.id;
  }

  throw new Error("Apenas o dono pode configurar a marca.");
}

function snapshot(row: Database["public"]["Tables"]["tenants"]["Row"]): MarcaForm {
  return marcaSchema.parse({
    nome: row.nome,
    endereco: row.endereco ?? null,
    telefone: row.telefone ?? null,
    instagram: row.instagram ?? null,
    whatsapp: row.whatsapp ?? null,
    facebook: row.facebook ?? null,
    tema: row.tema,
    cor_primaria: row.cor_primaria ?? "#1653A1",
    cor_secundaria: row.cor_secundaria ?? "#1F2024",
    cor_accent: row.cor_accent ?? "#C41F61",
    rotulo_carteira: row.rotulo_carteira ?? null,
    texto_boas_vindas: row.texto_boas_vindas ?? null,
    descricao: row.descricao ?? null,
    capa_url: row.capa_url ?? null,
    fotos: Array.isArray(row.fotos)
      ? row.fotos.filter((item): item is string => typeof item === "string")
      : [],
    assinatura_visivel: row.assinatura_visivel,
    logo_url: row.logo_url ?? null,
  });
}

async function signedLogo(supabase: any, path: string | null) {
  if (!path) return null;
  const { data } = await supabase.storage.from("tenant-logos").createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

export const getMarca = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ marca: MarcaData; versoes: MarcaVersion[] } | null> => {
    // Quem não é dono vê o aviso da tela, sem erro.
    const tenantId = await tenantDoDono(context.supabase, context.userId).catch(() => null);
    if (!tenantId) return null;
    const [
      { data: tenant },
      { data: versoes },
      { data: pagina },
      { count: servicosAtivos },
      { count: profissionais },
      { count: diasAbertos },
    ] = await Promise.all([
      context.supabase.from("tenants").select("*").eq("id", tenantId).single(),
      context.supabase
        .from("tenant_branding_versions")
        .select("id, versao, criado_em, restaurado_de, snapshot")
        .eq("tenant_id", tenantId)
        .order("versao", { ascending: false })
        .limit(12),
      context.supabase
        .from("tenant_page_configs")
        .select("draft_config, published_config, updated_at, published_at, is_online")
        .eq("tenant_id", tenantId)
        .maybeSingle(),
      context.supabase
        .from("servicos")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("ativo", true),
      context.supabase
        .from("profissionais")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId),
      context.supabase
        .from("horarios_de_funcionamento")
        .select("dia_semana", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("fechado", false),
    ]);
    if (!tenant) throw new Error("Negócio não encontrado.");
    const atual = snapshot(tenant);
    const draftContainer = pagina?.draft_config as { pagina?: unknown; marca?: unknown } | null;
    const publishedContainer = pagina?.published_config as {
      pagina?: unknown;
      marca?: unknown;
    } | null;
    const marcaRascunho = marcaSchema.safeParse(draftContainer?.marca);
    const paginaRascunho = normalizarPagina(draftContainer?.pagina, {
      frase: tenant.texto_boas_vindas ?? "Cuidado, estilo e horário reservado para você.",
      sobre: tenant.descricao ?? "",
    });
    return {
      marca: {
        id: tenant.id,
        plano: tenant.plano,
        ...(marcaRascunho.success ? marcaRascunho.data : atual),
        logo_signed_url: await signedLogo(
          context.supabase,
          marcaRascunho.success ? marcaRascunho.data.logo_url : atual.logo_url,
        ),
        capa_signed_url: await signedLogo(context.supabase, atual.capa_url),
        avatar_signed_url: await signedLogo(context.supabase, paginaRascunho.chat.avatarUrl),
        slug: tenant.slug,
        pagina: paginaRascunho,
        publicada: normalizarPagina(publishedContainer?.pagina, {
          frase: tenant.texto_boas_vindas ?? "Cuidado, estilo e horário reservado para você.",
          sobre: tenant.descricao ?? "",
        }),
        alteracoes_pendentes: haAlteracoesPendentes(pagina),
        pagina_online: pagina?.is_online ?? true,
        lacunas: lacunasDaPagina({
          servicosAtivos: servicosAtivos ?? 0,
          profissionais: profissionais ?? 0,
          diasAbertos: diasAbertos ?? 0,
        }),
        segmento: segmentoValido(tenant.segmento),
      },
      versoes: (versoes ?? [])
        .map((item) => {
          // Versões antigas podem ter cores nulas ou temas que não existem mais:
          // o histórico nunca pode derrubar a tela de personalização.
          const composto = z
            .object({ marca: marcaSchema, pagina: paginaConfigSchema.optional() })
            .safeParse(item.snapshot);
          if (composto.success) {
            return { ...item, snapshot: composto.data.marca, pagina: composto.data.pagina ?? null };
          }
          const cru = (item.snapshot ?? {}) as Record<string, unknown>;
          const bruto = (cru["marca"] ?? cru) as Record<string, unknown>;
          const legado = marcaSchema.safeParse({
            ...atual,
            ...bruto,
            tema: temaConhecido(bruto["tema"]) ? bruto["tema"] : atual.tema,
            cor_primaria: corValida(bruto["cor_primaria"])
              ? bruto["cor_primaria"]
              : atual.cor_primaria,
            cor_secundaria: corValida(bruto["cor_secundaria"])
              ? bruto["cor_secundaria"]
              : atual.cor_secundaria,
            cor_accent: corValida(bruto["cor_accent"]) ? bruto["cor_accent"] : atual.cor_accent,
          });
          if (!legado.success) return null;
          return { ...item, snapshot: legado.data, pagina: null };
        })
        .filter((item): item is MarcaVersion => item !== null),
    };
  });

export const salvarMarca = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => marcaSchema.parse(input))
  .handler(async ({ data, context }) => {
    const tenantId = await tenantDoDono(context.supabase, context.userId);
    // Marca avançada é recurso de plano: a liberação é conferida no servidor.
    await exigirRecurso(context.supabase, tenantId, "branding_avancado");
    const { data: atual } = await context.supabase
      .from("tenants")
      .select("*")
      .eq("id", tenantId)
      .single();
    if (!atual) throw new Error("Negócio não encontrado.");

    const assinatura = atual.plano === "essencial" ? true : data.assinatura_visivel;
    const { data: ultima } = await context.supabase
      .from("tenant_branding_versions")
      .select("versao")
      .eq("tenant_id", tenantId)
      .order("versao", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { error: historyError } = await context.supabase.from("tenant_branding_versions").insert({
      tenant_id: tenantId,
      versao: (ultima?.versao ?? 0) + 1,
      snapshot: snapshot(atual) as unknown as Json,
      criado_por: context.userId,
    });
    if (historyError) throw new Error(historyError.message);

    const { error } = await context.supabase
      .from("tenants")
      .update({ ...data, assinatura_visivel: assinatura })
      .eq("id", tenantId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const salvarRascunhoPagina = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => editorSchema.parse(input))
  .handler(async ({ data, context }) => {
    const tenantId = await tenantDoDono(context.supabase, context.userId);
    await exigirRecurso(context.supabase, tenantId, "branding_avancado");
    const { error } = await context.supabase.from("tenant_page_configs").upsert(
      {
        tenant_id: tenantId,
        draft_config: {
          pagina: {
            ...preservarFilaDeChegada(
              data.pagina,
              await containerSalvo(context.supabase, tenantId),
            ),
            versao: VERSAO_DA_PAGINA,
          },
          marca: data.marca,
        } as unknown as Json,
        draft_by: context.userId,
      },
      { onConflict: "tenant_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const descartarRascunhoPagina = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const tenantId = await tenantDoDono(context.supabase, context.userId);
    await exigirRecurso(context.supabase, tenantId, "branding_avancado");
    const { data: linha } = await context.supabase
      .from("tenant_page_configs")
      .select("draft_config, published_config, published_at")
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (!linha?.published_at) throw new Error("Ainda não há página publicada para voltar.");
    if (mesmoConteudo(linha.draft_config, linha.published_config))
      return { ok: true, descartou: false };
    // O rascunho descartado vira uma versão: nada se perde, dá para restaurar.
    const { data: ultima } = await context.supabase
      .from("tenant_branding_versions")
      .select("versao")
      .eq("tenant_id", tenantId)
      .order("versao", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { error: erroVersao } = await context.supabase.from("tenant_branding_versions").insert({
      tenant_id: tenantId,
      versao: (ultima?.versao ?? 0) + 1,
      snapshot: linha.draft_config as Json,
      criado_por: context.userId,
    });
    if (erroVersao) throw new Error(erroVersao.message);
    const { error } = await context.supabase
      .from("tenant_page_configs")
      .update({ draft_config: linha.published_config, draft_by: context.userId })
      .eq("tenant_id", tenantId);
    if (error) throw new Error(error.message);
    return { ok: true, descartou: true };
  });

export const alterarLinkPublico = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        slug: z
          .string()
          .trim()
          .min(3, "Use pelo menos 3 caracteres.")
          .max(60, "Use no máximo 60 caracteres.")
          .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use letras minúsculas, números e hífens."),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const tenantId = await tenantDoDono(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: slug, error } = await supabaseAdmin.rpc("alterar_slug_do_tenant", {
      _tenant_id: tenantId,
      _novo_slug: data.slug,
      _ator: context.userId,
    });
    if (error) throw new Error(error.message);
    return { slug };
  });

export const alterarStatusPaginaPublica = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ online: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    const tenantId = await tenantDoDono(context.supabase, context.userId);
    await exigirRecurso(context.supabase, tenantId, "branding_avancado");

    const { data: existente, error: leituraErro } = await context.supabase
      .from("tenant_page_configs")
      .select("tenant_id")
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (leituraErro) throw new Error(leituraErro.message);

    if (existente) {
      const { error } = await context.supabase
        .from("tenant_page_configs")
        .update({ is_online: data.online })
        .eq("tenant_id", tenantId);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase
        .from("tenant_page_configs")
        .insert({ tenant_id: tenantId, is_online: data.online, draft_by: context.userId });
      if (error) {
        // Se outra requisição criou a linha simultaneamente, atualize somente o estado.
        if (error.code !== "23505") throw new Error(error.message);
        const { error: atualizarErro } = await context.supabase
          .from("tenant_page_configs")
          .update({ is_online: data.online })
          .eq("tenant_id", tenantId);
        if (atualizarErro) throw new Error(atualizarErro.message);
      }
    }

    return { online: data.online };
  });

export const publicarPagina = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => editorSchema.parse(input))
  .handler(async ({ data, context }) => {
    const tenantId = await tenantDoDono(context.supabase, context.userId);
    await exigirRecurso(context.supabase, tenantId, "branding_avancado");
    const { data: tenant } = await context.supabase
      .from("tenants")
      .select("plano")
      .eq("id", tenantId)
      .single();
    if (!tenant) throw new Error("Negócio não encontrado.");
    const marca = {
      ...data.marca,
      assinatura_visivel: tenant.plano === "essencial" ? true : data.marca.assinatura_visivel,
    };
    const pagina = {
      ...preservarFilaDeChegada(data.pagina, await containerSalvo(context.supabase, tenantId)),
      versao: VERSAO_DA_PAGINA,
    };
    const configuracao = { pagina, marca } as unknown as Json;
    const { error } = await context.supabase.rpc("publish_tenant_page", {
      _tenant_id: tenantId,
      _config: configuracao,
      _nome: marca.nome,
      _endereco: marca.endereco ?? "",
      _telefone: marca.telefone ?? "",
      _instagram: marca.instagram ?? "",
      _whatsapp: marca.whatsapp ?? "",
      _facebook: marca.facebook ?? "",
      _tema: marca.tema,
      _cor_primaria: marca.cor_primaria,
      _cor_secundaria: marca.cor_secundaria,
      _cor_accent: marca.cor_accent,
      _rotulo_carteira: marca.rotulo_carteira ?? "",
      _texto_boas_vindas: marca.texto_boas_vindas ?? "",
      _descricao: marca.descricao ?? "",
      _capa_url: marca.capa_url ?? "",
      _fotos: marca.fotos,
      _assinatura_visivel: marca.assinatura_visivel,
      _logo_url: marca.logo_url ?? "",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const restaurarMarca = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ versaoId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const tenantId = await tenantDoDono(context.supabase, context.userId);
    // Restaurar uma versão também grava a marca avançada: mesma checagem de plano.
    await exigirRecurso(context.supabase, tenantId, "branding_avancado");
    const [{ data: atual }, { data: versao }] = await Promise.all([
      context.supabase.from("tenants").select("*").eq("id", tenantId).single(),
      context.supabase
        .from("tenant_branding_versions")
        .select("id, snapshot")
        .eq("id", data.versaoId)
        .eq("tenant_id", tenantId)
        .single(),
    ]);
    if (!atual || !versao) throw new Error("Versão não encontrada.");

    const { data: ultima } = await context.supabase
      .from("tenant_branding_versions")
      .select("versao")
      .eq("tenant_id", tenantId)
      .order("versao", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { error: historyError } = await context.supabase.from("tenant_branding_versions").insert({
      tenant_id: tenantId,
      versao: (ultima?.versao ?? 0) + 1,
      snapshot: snapshot(atual) as unknown as Json,
      restaurado_de: versao.id,
      criado_por: context.userId,
    });
    if (historyError) throw new Error(historyError.message);

    const composta = z
      .object({ marca: marcaSchema, pagina: paginaConfigSchema.optional() })
      .safeParse(versao.snapshot);
    const restaurada = composta.success ? composta.data.marca : marcaSchema.parse(versao.snapshot);
    const { error } = await context.supabase
      .from("tenants")
      .update({
        ...restaurada,
        assinatura_visivel: atual.plano === "essencial" ? true : restaurada.assinatura_visivel,
      })
      .eq("id", tenantId);
    if (error) throw new Error(error.message);
    if (composta.success && composta.data.pagina) {
      const { error: pageError } = await context.supabase.from("tenant_page_configs").upsert(
        {
          tenant_id: tenantId,
          draft_config: {
            pagina: preservarFilaDeChegada(
              composta.data.pagina,
              await containerSalvo(context.supabase, tenantId),
            ),
            marca: restaurada,
          } as unknown as Json,
          draft_by: context.userId,
        },
        { onConflict: "tenant_id" },
      );
      if (pageError) throw new Error(pageError.message);
    }
    return { ok: true };
  });

export const getMarcaCliente = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("tenants")
    .select(
      "nome, slug, endereco, descricao, capa_url, fotos, logo_url, cor_primaria, cor_secundaria, cor_accent, texto_boas_vindas, rotulo_carteira, assinatura_visivel",
    )
    .eq("ativo", true)
    .order("criado_em", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return {
    ...data,
    logo_signed_url: await signedLogo(supabaseAdmin, data.logo_url),
    capa_signed_url: await signedLogo(supabaseAdmin, data.capa_url),
  };
});

export type LogoDisponivel = { path: string; url: string; criado_em: string | null };

/** Logos já enviadas pelo próprio negócio (pasta do negócio no armazenamento). */
export const listarLogosDoNegocio = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<LogoDisponivel[]> => {
    const tenantId = await tenantDoDono(context.supabase, context.userId).catch(() => null);
    if (!tenantId) return [];
    const { data: arquivos } = await context.supabase.storage
      .from("tenant-logos")
      .list(tenantId, { limit: 100, sortBy: { column: "created_at", order: "desc" } });
    const logos = (arquivos ?? []).filter((a) => a.name.startsWith("logo-")).slice(0, 12);
    if (!logos.length) return [];
    const paths = logos.map((a) => `${tenantId}/${a.name}`);
    const { data: assinadas } = await context.supabase.storage
      .from("tenant-logos")
      .createSignedUrls(paths, 60 * 60);
    return logos
      .map((a, i) => ({
        path: paths[i]!,
        url: assinadas?.[i]?.signedUrl ?? "",
        criado_em: a.created_at ?? null,
      }))
      .filter((l) => l.url);
  });
