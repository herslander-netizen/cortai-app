import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  BUCKET_FOTOS,
  MAX_FOTOS_NA_GALERIA,
  ehArquivoDeImagem,
  novoCaminhoDeFoto,
  tipoDaImagem,
} from "@/lib/fotos-do-negocio";
import { exigirPermissao, tenantIdDoMembro, type ContextoAutenticado } from "@/lib/tenant";

/** Quem mexe em fotos: quem cuida de produtos ou da equipe (o dono tem as duas). */
const PERMISSOES_DE_FOTO = ["alterar_estoque", "gerenciar_profissionais"] as const;
const LIMITE_DO_ARQUIVO = 2 * 1024 * 1024;

async function tenantComPermissaoDeFoto(context: ContextoAutenticado) {
  const tenantId = await tenantIdDoMembro(context);
  let ultimoErro: unknown = null;
  for (const chave of PERMISSOES_DE_FOTO) {
    try {
      await exigirPermissao(context, tenantId, chave);
      return tenantId;
    } catch (e) {
      ultimoErro = e;
    }
  }
  throw ultimoErro instanceof Error ? ultimoErro : new Error("Sem permissão para enviar fotos.");
}

export type FotoDaGaleria = { path: string; url: string; criado_em: string | null };

/** Fotos já enviadas pelo negócio (mais recentes primeiro), com link temporário para mostrar na galeria. */
export const listarFotosDoNegocio = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<FotoDaGaleria[]> => {
    const tenantId = await tenantComPermissaoDeFoto(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: arquivos } = await supabaseAdmin.storage.from(BUCKET_FOTOS).list(tenantId, {
      limit: 200,
      sortBy: { column: "created_at", order: "desc" },
    });
    const imagens = (arquivos ?? [])
      .filter((a) => a.id && ehArquivoDeImagem(a.name))
      .slice(0, MAX_FOTOS_NA_GALERIA);
    if (!imagens.length) return [];
    const caminhos = imagens.map((a) => `${tenantId}/${a.name}`);
    const { data: assinadas } = await supabaseAdmin.storage
      .from(BUCKET_FOTOS)
      .createSignedUrls(caminhos, 60 * 60);
    return imagens
      .map((a, i) => ({
        path: caminhos[i]!,
        url: assinadas?.[i]?.signedUrl ?? "",
        criado_em: a.created_at ?? null,
      }))
      .filter((f) => f.url);
  });

const envioSchema = z.object({
  /** Imagem já reduzida no aparelho, em base64 (sem o prefixo `data:`). */
  base64: z.string().min(100).max(3_200_000),
  prefixo: z.enum(["produto", "profissional", "foto"]).default("foto"),
});

/** Guarda a foto na pasta do negócio e devolve o caminho (é ele que vai para o banco) e um link para mostrar. */
export const enviarFotoDoNegocio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => envioSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ path: string; url: string }> => {
    const tenantId = await tenantComPermissaoDeFoto(context);
    const bytes = Uint8Array.from(Buffer.from(data.base64, "base64"));
    if (bytes.length > LIMITE_DO_ARQUIVO)
      throw new Error("A foto passa de 2 MB. Escolha uma menor.");
    const tipo = tipoDaImagem(bytes);
    if (!tipo) throw new Error("Use uma foto JPG, PNG ou WebP.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const extensao = tipo === "image/png" ? "png" : tipo === "image/webp" ? "webp" : "jpg";
    const path = novoCaminhoDeFoto(tenantId, data.prefixo, extensao);
    const { error } = await supabaseAdmin.storage
      .from(BUCKET_FOTOS)
      .upload(path, bytes, { contentType: tipo, upsert: false });
    if (error) throw new Error("Não foi possível guardar a foto. Tente de novo.");
    const { data: assinada } = await supabaseAdmin.storage
      .from(BUCKET_FOTOS)
      .createSignedUrl(path, 60 * 60);
    return { path, url: assinada?.signedUrl ?? "" };
  });
