import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

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
    cor_primaria: string;
    cor_secundaria: string | null;
    cor_accent: string | null;
    assinatura_visivel: boolean;
    logo_signed_url: string | null;
    capa_signed_url: string | null;
    fotos_signed_urls: string[];
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
  produtos: { id: string; nome: string; categoria: string; preco_centavos: number; foto_url: string | null }[];
};

async function signedUrl(client: any, path: string | null) {
  if (!path) return null;
  if (path.startsWith("https://")) return path;
  const { data } = await client.storage.from("tenant-logos").createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

export const getPaginaPublica = createServerFn({ method: "GET" })
  .validator((input: unknown) => z.object({ slug: z.string().trim().min(1).max(100) }).parse(input))
  .handler(async ({ data }): Promise<PaginaPublica | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("id, nome, slug, plano, loja_ativa, descricao, endereco, telefone, whatsapp, instagram, texto_boas_vindas, cor_primaria, cor_secundaria, cor_accent, assinatura_visivel, logo_url, capa_url, fotos")
      .eq("slug", data.slug)
      .eq("ativo", true)
      .maybeSingle();
    if (!tenant) return null;

    const [{ data: servicos }, { data: profissionais }, { data: produtos }] = await Promise.all([
      supabaseAdmin.from("servicos").select("id, nome, duracao_min, preco_centavos").eq("tenant_id", tenant.id).eq("ativo", true).order("ordem"),
      supabaseAdmin.from("profissionais").select("id, nome, avatar_url, descricao, portfolio").eq("tenant_id", tenant.id).eq("ativo", true).order("criado_em"),
      supabaseAdmin.from("produtos").select("id, nome, categoria, preco_centavos, foto_url").eq("tenant_id", tenant.id).eq("ativo", true).eq("disponivel_venda", true).gt("preco_centavos", 0).order("nome"),
    ]);
    const { data: regraLoja } = await supabaseAdmin
      .from("recursos_de_plano")
      .select("liberado")
      .eq("chave", "loja_online")
      .eq("plano", tenant.plano)
      .maybeSingle();
    const lojaAtiva = Boolean(tenant.loja_ativa) && (regraLoja?.liberado ?? true);

    const fotos = Array.isArray(tenant.fotos) ? tenant.fotos.filter((item): item is string => typeof item === "string") : [];
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
    };
  });