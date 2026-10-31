import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { montarPacotes, type PacoteDoNegocio } from "@/lib/pacotes";
import { normalizarPagina, type PaginaConfig } from "@/lib/pagina-config";
import { paginaPublicaDisponivel } from "@/lib/pagina-publica-status";
import { segmentoParaApresentacao, type Segmento } from "@/lib/segmentos";

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
  /** `popularidade` = atendimentos finalizados nos últimos 90 dias (só para destacar os mais pedidos). */
  servicos: {
    id: string;
    nome: string;
    duracao_min: number;
    preco_centavos: number;
    categoria: string | null;
    popularidade: number;
  }[];
  profissionais: {
    id: string;
    nome: string;
    avatar_url: string | null;
    descricao: string | null;
    portfolio: string[];
  }[];
  /** Pacotes e combos ativos (layout Raízes). Vazio enquanto a migração 0046 não foi aplicada. */
  pacotes: PacoteDoNegocio[];
  loja_ativa: boolean;
  produtos: {
    id: string;
    nome: string;
    categoria: string;
    preco_centavos: number;
    foto_url: string | null;
  }[];
  horarios: { dia_semana: number; fechado: boolean; abre: string; fecha: string }[];
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

    const [
      { data: servicos },
      { data: profissionais },
      { data: produtos },
      { data: horarios },
      { data: avaliacoes },
      { data: pageConfig },
      { data: recentes },
    ] = await Promise.all([
      supabaseAdmin
        .from("servicos")
        .select("id, nome, duracao_min, preco_centavos, categoria")
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
        .select("dia_semana, fechado, abre, fecha")
        .eq("tenant_id", tenant.id)
        .order("dia_semana"),
      supabaseAdmin.from("avaliacoes").select("nota").eq("tenant_id", tenant.id),
      supabaseAdmin
        .from("tenant_page_configs")
        .select("published_config, is_online")
        .eq("tenant_id", tenant.id)
        .maybeSingle(),
      supabaseAdmin
        .from("agendamentos")
        .select("servico_id")
        .eq("tenant_id", tenant.id)
        .eq("status", "finalizado")
        .gte("inicio", new Date(Date.now() - 90 * 86_400_000).toISOString())
        .limit(2000),
    ]);
    const contagem = new Map<string, number>();
    for (const r of recentes ?? []) {
      if (r.servico_id) contagem.set(r.servico_id, (contagem.get(r.servico_id) ?? 0) + 1);
    }
    if (!paginaPublicaDisponivel(pageConfig?.is_online)) return null;

    const { data: regraLoja } = await supabaseAdmin
      .from("recursos_de_plano")
      .select("liberado")
      .eq("chave", "loja_online")
      .eq("plano", tenant.plano)
      .maybeSingle();
    const lojaAtiva = Boolean(tenant.loja_ativa) && (regraLoja?.liberado ?? true);

    // As tabelas chegam com a migração 0046: sem elas (ou com erro), a página simplesmente não mostra pacotes.
    const pacotes = await (async (): Promise<PacoteDoNegocio[]> => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const db = supabaseAdmin as any;
        const [linhas, itens] = await Promise.all([
          db
            .from("pacotes")
            .select("id, tipo, nome, descricao, preco_centavos, validade_dias, destaque, ativo")
            .eq("tenant_id", tenant.id)
            .eq("ativo", true)
            .order("ordem")
            .order("criado_em")
            .limit(24),
          db
            .from("pacote_itens")
            .select("pacote_id, servico_id, quantidade")
            .eq("tenant_id", tenant.id),
        ]);
        if (linhas.error || itens.error) return [];
        return montarPacotes(linhas.data ?? [], itens.data ?? [], servicos ?? []).filter(
          (p) => p.itens.length > 0,
        );
      } catch {
        return [];
      }
    })();

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
        segmento: segmentoParaApresentacao(tenant.segmento),
        fuso: tenant.fuso,
      },
      servicos: (servicos ?? []).map((sv) => ({ ...sv, popularidade: contagem.get(sv.id) ?? 0 })),
      // O portfólio guarda caminhos de foto do negócio (ou links antigos): o link para mostrar é assinado aqui.
      profissionais: await Promise.all(
        (profissionais ?? []).map(async (p) => {
          const itens = Array.isArray(p.portfolio)
            ? (p.portfolio as unknown[]).filter((f): f is string => typeof f === "string")
            : [];
          const links = await Promise.all(itens.map((f) => signedUrl(supabaseAdmin, f)));
          return {
            id: p.id,
            nome: p.nome,
            avatar_url: await signedUrl(supabaseAdmin, p.avatar_url),
            descricao: p.descricao,
            portfolio: links.filter((l): l is string => Boolean(l)),
          };
        }),
      ),
      pacotes,
      loja_ativa: lojaAtiva,
      produtos: lojaAtiva
        ? await Promise.all(
            (produtos ?? []).map(async (p) => ({
              ...p,
              foto_url: await signedUrl(supabaseAdmin, p.foto_url),
            })),
          )
        : [],
      horarios: horarios ?? [],
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
