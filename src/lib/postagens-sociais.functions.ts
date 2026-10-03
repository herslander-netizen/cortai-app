import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { tenantIdDoMembro, exigirPermissao } from "@/lib/tenant";
import { PLATAFORMAS } from "@/lib/redes-sociais";

export type PostagemSocial = {
  id: string;
  plataforma: (typeof PLATAFORMAS)[number];
  legenda: string;
  agendado_para: string;
  status: "agendada" | "publicando" | "publicada" | "falha" | "cancelada";
  simulada: boolean;
  erro: string | null;
  publicado_em: string | null;
};

const esquemaCriar = z.object({
  plataformas: z.array(z.enum(PLATAFORMAS)).min(1).max(2),
  legenda: z.string().max(2200),
  imagemBase64: z.string().min(100).max(3_000_000),
  /** ISO; ausente = publicar agora. */
  agendadoPara: z.string().datetime().optional(),
});

/** Lista as postagens recentes e agendadas do negócio. */
export const getPostagensSociais = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ postagens: PostagemSocial[] }> => {
    const tenantId = await tenantIdDoMembro(context);
    const { data, error } = await context.supabase
      .from("postagens_sociais")
      .select("id, plataforma, legenda, agendado_para, status, simulada, erro, publicado_em")
      .eq("tenant_id", tenantId)
      .order("agendado_para", { ascending: false })
      .limit(30);
    if (error) throw new Error("Não foi possível carregar as postagens agora.");
    return { postagens: (data ?? []) as PostagemSocial[] };
  });

/** Cria a postagem para cada rede escolhida; publica na hora quando não há data. */
export const criarPostagemSocial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => esquemaCriar.parse(input))
  .handler(async ({ data, context }) => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "alterar_dados_barbearia");

    const quando = data.agendadoPara ? new Date(data.agendadoPara) : new Date();
    if (data.agendadoPara) {
      const diff = quando.getTime() - Date.now();
      if (diff < 5 * 60_000) throw new Error("Escolha um horário pelo menos 5 minutos à frente.");
      if (diff > 60 * 24 * 3600_000) throw new Error("Agende no máximo 60 dias à frente.");
    }

    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { BUCKET_POSTAGENS, publicarPostagem } = await import("@/lib/postagens-sociais.server");

    const caminho = `${tenantId}/postagens/${crypto.randomUUID()}.jpg`;
    const bytes = Buffer.from(data.imagemBase64.replace(/^data:image\/\w+;base64,/, ""), "base64");
    const { error: erroUpload } = await db.storage
      .from(BUCKET_POSTAGENS)
      .upload(caminho, bytes, { contentType: "image/jpeg", upsert: false });
    if (erroUpload) throw new Error("Não foi possível salvar a imagem. Tente de novo.");

    const { data: criadas, error } = await db
      .from("postagens_sociais")
      .insert(
        data.plataformas.map((plataforma) => ({
          tenant_id: tenantId,
          plataforma,
          legenda: data.legenda,
          midia_url: caminho,
          agendado_para: quando.toISOString(),
          criado_por: context.userId,
        })),
      )
      .select("id, plataforma");
    if (error || !criadas) throw new Error("Não foi possível criar a postagem. Tente de novo.");

    if (data.agendadoPara) return { agendada: true as const, resultados: [] };
    const resultados = await Promise.all(
      criadas.map(async (c) => ({ plataforma: c.plataforma, status: await publicarPostagem(c.id) })),
    );
    return { agendada: false as const, resultados };
  });

/** Cancela uma postagem ainda não publicada. */
export const cancelarPostagemSocial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "alterar_dados_barbearia");
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { error } = await db
      .from("postagens_sociais")
      .update({ status: "cancelada" })
      .eq("id", data.id)
      .eq("tenant_id", tenantId)
      .eq("status", "agendada");
    if (error) throw new Error("Não foi possível cancelar agora.");
    return { ok: true as const };
  });
