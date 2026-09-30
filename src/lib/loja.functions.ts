import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { segmentoParaApresentacao, type Segmento } from "@/lib/segmentos";

export type ProdutoPublico = {
  id: string;
  nome: string;
  categoria: string;
  preco_centavos: number;
  foto_url: string | null;
  descricao: string | null;
  destaque: boolean;
};

export type LojaPublica = {
  tenant: {
    id: string;
    nome: string;
    slug: string;
    whatsapp: string | null;
    telefone: string | null;
    cor_primaria: string | null;
    logo_url: string | null;
    segmento: Segmento;
  };
  produtos: ProdutoPublico[];
  destaques: ProdutoPublico[];
};

/**
 * Produtos visíveis ao público de UMA barbearia.
 * Só entram quando: barbearia ativa + loja ligada + recurso liberado no plano
 * + produto ativo + marcado como disponível para venda + preço válido.
 */
export const getLojaPublica = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ slug: z.string().trim().min(1).max(100) }).parse(input))
  .handler(async ({ data }): Promise<LojaPublica | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { resolverTenantPorSlug } = await import("@/lib/tenant-slug");
    const resolvido = await resolverTenantPorSlug(supabaseAdmin, data.slug);
    if (!resolvido) return null;
    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("id, nome, slug, segmento, plano, loja_ativa, whatsapp, telefone, cor_primaria, logo_url")
      .eq("id", resolvido.tenant_id)
      .eq("ativo", true)
      .maybeSingle();
    if (!tenant || !tenant.loja_ativa) return null;

    const { data: regra } = await supabaseAdmin
      .from("recursos_de_plano")
      .select("liberado")
      .eq("chave", "loja_online")
      .eq("plano", tenant.plano)
      .maybeSingle();
    if (regra && !regra.liberado) return null;

    const { data: produtos } = await supabaseAdmin
      .from("produtos")
      .select("id, nome, categoria, preco_centavos, foto_url, descricao, destaque")
      .eq("tenant_id", tenant.id)
      .eq("ativo", true)
      .eq("disponivel_venda", true)
      .gt("preco_centavos", 0)
      .order("destaque", { ascending: false })
      .order("nome");

    let logo = tenant.logo_url;
    if (logo && !logo.startsWith("https://")) {
      const { data: assinada } = await supabaseAdmin.storage.from("tenant-logos").createSignedUrl(logo, 60 * 60);
      logo = assinada?.signedUrl ?? null;
    }

    return {
      tenant: {
        id: tenant.id,
        nome: tenant.nome,
        slug: tenant.slug,
        whatsapp: tenant.whatsapp,
        telefone: tenant.telefone,
        cor_primaria: tenant.cor_primaria,
        logo_url: logo,
        segmento: segmentoParaApresentacao(tenant.segmento),
      },
      produtos: produtos ?? [],
      destaques: (produtos ?? []).filter((p) => p.destaque),
    };
  });
