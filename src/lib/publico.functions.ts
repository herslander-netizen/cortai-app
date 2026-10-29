import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { normalizarPagina, type PaginaConfig } from "@/lib/pagina-config";
import { segmentoValido, type Segmento } from "@/lib/segmentos";
import { hojeNoFuso, normalizarFuso, somarDias, type ExcecaoIntervaloAgenda } from "@/lib/horarios";

export type PaginaPublica = {
  tenant: {
    id: string;
    nome: string;
    slug: string;
    descricao: string | null;
    endereco: string | null;
    telefone: string | null;
    whatsapp: string | null;
    instagram: string | null;
    texto_boas_vindas: string | null;
    cor_primaria: string | null;
    cor_secundaria: string | null;
    cor_accent: string | null;
    assinatura_visivel: boolean;
    logo_signed_url: string | null;
    capa_signed_url: string | null;
    fotos_signed_urls: string[];
    segmento: Segmento;
    fuso: string;
  };
  servicos: { id: string; nome: string; duracao_min: number; preco_centavos: number }[];
  profissionais: {
    id: string;
    nome: string;
    avatar_url: string | null;
    descricao: string | null;
    portfolio: string[];
  }[];
  loja_ativa: boolean;
  produtos: {
    id: string;
    nome: string;
    categoria: string;
    preco_centavos: number;
    foto_url: string | null;
  }[];
  horarios: { dia_semana: number; fechado: boolean; abre: string; fecha: string; intervalo_inicio: string | null; intervalo_fim: string | null }[];
  excecoesIntervalo: ExcecaoIntervaloAgenda[];
  avaliacoes: { media: number | null; quantidade: number };
  pagina: PaginaConfig;
  agendaOnline: "aberta" | "limite_atingido";
};

async function signedUrl(client: any, path: string | null) {
  if (!path) return null;
  if (path.startsWith("https://")) return path;
  const { data } = await client.storage.from("tenant-logos").createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const getPaginaPublica = createServerFn({ method: "GET" })
  .validator((input: unknown) => z.object({ slug: z.string().trim().min(1).max(100) }).parse(input))
  .handler(async ({ data }): Promise<PaginaPublica | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { resolverTenantPorSlug } = await import("@/lib/tenant-slug");
    const colunas =
      "id, nome, slug, plano, loja_ativa, descricao, endereco, telefone, whatsapp, instagram, texto_boas_vindas, cor_primaria, cor_secundaria, cor_accent, assinatura_visivel, logo_url, capa_url, fotos, segmento, fuso";
    const resolvido = UUID_RE.test(data.slug)
      ? { tenant_id: data.slug }
      : await resolverTenantPorSlug(supabaseAdmin, data.slug);
    if (!resolvido) return null;
    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select(colunas)
      .eq("id", resolvido.tenant_id)
      .eq("ativo", true)
      .maybeSingle();
    if (!tenant) return null;

    const fuso = normalizarFuso(tenant.fuso);
    const hoje = hojeNoFuso(fuso);
    const ontem = somarDias(hoje, -1);
    const [
      { data: servicos },
      { data: profissionais },
      { data: produtos },
      { data: horarios },
      { data: excecoesRes, error: erroExcecoes },
      { data: avaliacoes },
      { data: pageConfig },
    ] = await Promise.all([
      supabaseAdmin
        .from("servicos")
        .select("id, nome, duracao_min, preco_centavos")
        .eq("tenant_id", tenant.id)
        .eq("ativo", true)
        .order("ordem"),
      supabaseAdmin
        .from("profissionais")
        .select("id, nome, avatar_url, descricao, portfolio")
        .eq("tenant_id", tenant.id)
        .eq("ativo", true)
        .order("criado_em"),
      supabaseAdmin
        .from("produtos")
        .select("id, nome, categoria, preco_centavos, foto_url")
        .eq("tenant_id", tenant.id)
        .eq("ativo", true)
        .eq("disponivel_venda", true)
        .gt("preco_centavos", 0)
        .order("nome")
        .limit(8),
      supabaseAdmin
        .from("horarios_de_funcionamento")
        .select("dia_semana, fechado, abre, fecha, intervalo_inicio, intervalo_fim")
        .eq("tenant_id", tenant.id)
        .order("dia_semana"),
      supabaseAdmin
        .from("excecoes_intervalo_agenda")
        .select("dia, intervalo_inicio, intervalo_fim")
        .eq("tenant_id", tenant.id)
        .gte("dia", ontem)
        .lte("dia", hoje),
      supabaseAdmin.from("avaliacoes").select("nota").eq("tenant_id", tenant.id),
      supabaseAdmin
        .from("tenant_page_configs")
        .select("published_config")
        .eq("tenant_id", tenant.id)
        .maybeSingle(),
    ]);
    if (erroExcecoes) throw new Error("Não foi possível carregar os horários especiais deste negócio.");
    const { data: regraLoja } = await supabaseAdmin
      .from("recursos_de_plano")
      .select("liberado")
      .eq("chave", "loja_online")
      .eq("plano", tenant.plano)
      .maybeSingle();
    const lojaAtiva = Boolean(tenant.loja_ativa) && (regraLoja?.liberado ?? true);

    const fotos = Array.isArray(tenant.fotos)
      ? tenant.fotos.filter((item): item is string => typeof item === "string").slice(0, 8)
      : [];
    const [logo, capa, ...galeria] = await Promise.all([
      signedUrl(supabaseAdmin, tenant.logo_url),
      signedUrl(supabaseAdmin, tenant.capa_url),
      ...fotos.map((foto) => signedUrl(supabaseAdmin, foto)),
    ]);
    return {
      tenant: {
        id: tenant.id,
        nome: tenant.nome,
        slug: tenant.slug,
        descricao: tenant.descricao,
        endereco: tenant.endereco,
        telefone: tenant.telefone,
        whatsapp: tenant.whatsapp,
        instagram: tenant.instagram,
        texto_boas_vindas: tenant.texto_boas_vindas,
        cor_primaria: tenant.cor_primaria,
        cor_secundaria: tenant.cor_secundaria,
        cor_accent: tenant.cor_accent,
        assinatura_visivel: tenant.assinatura_visivel,
        logo_signed_url: logo,
        capa_signed_url: capa,
        fotos_signed_urls: galeria.filter((url): url is string => Boolean(url)),
        segmento: segmentoValido(tenant.segmento),
        fuso: tenant.fuso,
      },
      servicos: servicos ?? [],
      profissionais: (profissionais ?? []).map((p) => ({
        id: p.id,
        nome: p.nome,
        avatar_url: p.avatar_url,
        descricao: p.descricao,
        portfolio: Array.isArray(p.portfolio)
          ? (p.portfolio as unknown[]).filter((f): f is string => typeof f === "string")
          : [],
      })),
      loja_ativa: lojaAtiva,
      produtos: lojaAtiva ? (produtos ?? []) : [],
      horarios: horarios ?? [],
      excecoesIntervalo: (excecoesRes ?? []).map((linha) => ({
        dia: linha.dia,
        intervaloInicio: linha.intervalo_inicio ? String(linha.intervalo_inicio).slice(0, 5) : null,
        intervaloFim: linha.intervalo_fim ? String(linha.intervalo_fim).slice(0, 5) : null,
      })),
      avaliacoes: {
        media: avaliacoes?.length
          ? Number(
              (avaliacoes.reduce((sum, item) => sum + item.nota, 0) / avaliacoes.length).toFixed(1),
            )
          : null,
        quantidade: avaliacoes?.length ?? 0,
      },
      agendaOnline: await (
        await import("@/lib/agenda-online.server")
      )
        .usoDaAgendaOnline(supabaseAdmin, tenant.id)
        .then((r) => r.estado)
        .catch(() => "aberta" as const),
      pagina: normalizarPagina(
        (pageConfig?.published_config as { pagina?: unknown } | null)?.pagina,
        {
          frase: tenant.texto_boas_vindas ?? "Cuidado, estilo e horário reservado para você.",
          sobre: tenant.descricao ?? "",
        },
      ),
    };
  });
