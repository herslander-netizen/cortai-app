import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { clienteDoUsuarioOpcional } from "@/lib/cliente";
import { segmentoParaApresentacao, type Segmento } from "@/lib/segmentos";

export type ContextoClienteAtual = {
  nome: string;
  slug: string;
  endereco: string | null;
  texto_boas_vindas: string | null;
  logo_signed_url: string | null;
  capa_signed_url: string | null;
  segmento: Segmento;
  loja: {
    ativa: boolean;
    destaques: { id: string; nome: string; preco_centavos: number; foto_url: string | null }[];
  };
};

async function assinada(db: any, caminho: string | null) {
  if (!caminho) return null;
  if (caminho.startsWith("https://")) return caminho;
  const { data } = await db.storage.from("tenant-logos").createSignedUrl(caminho, 60 * 60);
  return data?.signedUrl ?? null;
}

/**
 * Negócio do contexto atual do cliente: o slug da navegação ou uma ficha já existente.
 * Retorna null quando não há contexto — a tela então mostra a descoberta.
 */
export const getContextoCliente = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z.object({ slug: z.string().trim().max(100).optional() }).parse(input ?? {}),
  )
  .handler(async ({ data, context }): Promise<ContextoClienteAtual | null> => {
    const resolvido = await clienteDoUsuarioOpcional(context, { slug: data.slug ?? null });
    if (!resolvido) return null;
    const { db, tenant } = resolvido;
    const { data: linha } = await db
      .from("tenants")
      .select(
        "nome, slug, segmento, plano, loja_ativa, endereco, texto_boas_vindas, logo_url, capa_url",
      )
      .eq("id", tenant.id)
      .maybeSingle();
    if (!linha) return null;

    let lojaAtiva = Boolean(linha.loja_ativa);
    if (lojaAtiva) {
      const { data: regra } = await db
        .from("recursos_de_plano")
        .select("liberado")
        .eq("chave", "loja_online")
        .eq("plano", linha.plano)
        .maybeSingle();
      lojaAtiva = regra?.liberado ?? true;
    }
    const { data: destaques } = lojaAtiva
      ? await db
          .from("produtos")
          .select("id, nome, preco_centavos, foto_url")
          .eq("tenant_id", tenant.id)
          .eq("ativo", true)
          .eq("disponivel_venda", true)
          .gt("preco_centavos", 0)
          .order("destaque", { ascending: false })
          .order("nome")
          .limit(4)
      : { data: [] };

    // `foto_url` guarda o caminho da foto no armazenamento (ou um link antigo): assina o link para mostrar.
    const destaquesComFoto = await Promise.all(
      (destaques ?? []).map(async (d) => ({ ...d, foto_url: await assinada(db, d.foto_url) })),
    );

    return {
      nome: linha.nome,
      slug: linha.slug,
      endereco: linha.endereco,
      texto_boas_vindas: linha.texto_boas_vindas,
      logo_signed_url: await assinada(db, linha.logo_url),
      capa_signed_url: await assinada(db, linha.capa_url),
      segmento: segmentoParaApresentacao(linha.segmento),
      loja: { ativa: lojaAtiva && (destaques?.length ?? 0) > 0, destaques: destaquesComFoto },
    };
  });
