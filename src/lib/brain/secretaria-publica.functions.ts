/**
 * Flow IA no site de agendamento — mesmo cérebro, só leitura.
 * Público por natureza: limite por visitante e por negócio, guarda de abuso
 * e nenhum dado de cliente. O agendamento continua pela tela oficial.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Entrada = z.object({
  slug: z.string().trim().min(1).max(80),
  mensagem: z.string().trim().min(1).max(500),
  historico: z
    .array(z.object({ autor: z.enum(["usuario", "assistente"]), texto: z.string().max(600) }))
    .max(8)
    .default([]),
});

/** Perguntas por IP a cada minuto, somadas ao limite por hora e ao diário do cérebro. */
const LIMITE_POR_MINUTO = 6;

export const perguntarSecretariaPublica = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Entrada.parse(input))
  .handler(async ({ data }): Promise<{ texto: string | null }> => {
    const { getRequest } = await import("@tanstack/react-start/server");
    const request = getRequest();
    const guard = await import("@/lib/webhook-guard.server");
    if (await guard.barrarAbusivo(request, "cortai/site")) return { texto: null };
    // Rajada por IP (contador no banco): protege a cota diária do negócio e o custo.
    if (!(await guard.dentroDoLimitePublico(request, "cortai_site", LIMITE_POR_MINUTO)))
      return { texto: null };

    const { iaDisponivel } = await import("./gateway.server");
    if (!iaDisponivel("site")) return { texto: null };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: alvo } = await supabaseAdmin.rpc("resolver_tenant_por_slug", {
      _slug: data.slug,
    });
    const tenantId = (alvo as { tenant_id: string }[] | null)?.[0]?.tenant_id;
    if (!tenantId) return { texto: null };

    const ip = guard.ipDaChamada(request) ?? guard.BALDE_SEM_IP;

    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("nome, segmento")
      .eq("id", tenantId)
      .maybeSingle();
    const { pensarCortai } = await import("./agente.server");
    const r = await pensarCortai({
      ctx: { tenantId, canal: "site", ator: ip },
      persona: {
        nome: `a recepção de ${tenant?.nome ?? "o negócio"}`,
        negocio: tenant?.nome ?? "o negócio",
        segmento: tenant?.segmento ?? null,
      },
      historico: data.historico,
      mensagem: data.mensagem,
      pendente: null,
    });
    return { texto: r.indisponivel ? null : r.texto };
  });
