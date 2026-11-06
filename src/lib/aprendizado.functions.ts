/**
 * Painel "Para melhorar" (WhatsApp → Atividade): conversas que saíram do fluxo nos últimos 30 dias, agrupadas por
 * frase parecida e motivo. Leitura e baixa só da equipe do próprio negócio, conferidas no servidor.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { exigirPermissao, tenantIdDoMembro } from "@/lib/tenant";
import { MOTIVOS_DE_OCORRENCIA, type MotivoDeOcorrencia } from "@/lib/whatsapp/aprendizado";

export type GrupoParaMelhorar = {
  chave: string;
  motivo: MotivoDeOcorrencia;
  exemplo: string;
  etapa: string | null;
  total: number;
  ultimaVez: string;
};

export type ParaMelhorar = {
  grupos: GrupoParaMelhorar[];
  porMotivo: Partial<Record<MotivoDeOcorrencia, number>>;
  total: number;
};

const DIAS = 30;

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export const getParaMelhorar = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ParaMelhorar> => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "ver_cortai");
    const db = await admin();
    const desde = new Date(Date.now() - DIAS * 86_400_000).toISOString();
    const { data, error } = await db
      .from("atendimento_ocorrencias")
      .select("motivo, texto, texto_normalizado, etapa, criado_em")
      .eq("tenant_id", tenantId)
      .eq("status", "nova")
      .gte("criado_em", desde)
      .order("criado_em", { ascending: false })
      .limit(1000);
    // Migração ainda não aplicada neste banco: painel vazio, nunca erro na tela.
    if (error?.code === "42P01") return { grupos: [], porMotivo: {}, total: 0 };
    if (error) throw new Error("Não foi possível carregar agora.");

    const grupos = new Map<string, GrupoParaMelhorar>();
    const porMotivo: ParaMelhorar["porMotivo"] = {};
    for (const o of data ?? []) {
      const motivo = o.motivo as MotivoDeOcorrencia;
      porMotivo[motivo] = (porMotivo[motivo] ?? 0) + 1;
      const chave = `${motivo}|${o.texto_normalizado}`;
      const atual = grupos.get(chave);
      if (atual) atual.total += 1;
      else
        grupos.set(chave, {
          chave,
          motivo,
          exemplo: o.texto,
          etapa: o.etapa,
          total: 1,
          ultimaVez: o.criado_em,
        });
    }
    return {
      grupos: [...grupos.values()].sort((a, b) => b.total - a.total).slice(0, 50),
      porMotivo,
      total: data?.length ?? 0,
    };
  });

/** Marca o grupo como resolvido (a equipe já ajustou algo) ou ignorado (não precisa de ajuste). */
export const marcarParaMelhorar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        chave: z.string().min(3).max(400),
        status: z.enum(["resolvida", "ignorada"]),
      })
      .parse(d),
  )
  .handler(async ({ context, data }): Promise<{ ok: boolean }> => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "gerenciar_whatsapp");
    const corte = data.chave.indexOf("|");
    const motivo = data.chave.slice(0, corte);
    const normalizado = data.chave.slice(corte + 1);
    if (!(MOTIVOS_DE_OCORRENCIA as readonly string[]).includes(motivo)) return { ok: false };
    const db = await admin();
    const { error } = await db
      .from("atendimento_ocorrencias")
      .update({
        status: data.status,
        resolvido_em: new Date().toISOString(),
        resolvido_por: context.userId,
      })
      .eq("tenant_id", tenantId)
      .eq("status", "nova")
      .eq("motivo", motivo)
      .eq("texto_normalizado", normalizado);
    return { ok: !error };
  });
