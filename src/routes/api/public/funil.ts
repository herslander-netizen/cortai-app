import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { ETAPAS_FUNIL, ORIGENS_FUNIL } from "@/lib/funil";

const esquema = z.object({
  slug: z.string().trim().min(1).max(100),
  etapa: z.enum(ETAPAS_FUNIL),
  experiencia: z.enum(["vitrine", "direta", "conversa"]),
  fluxo: z.enum(["passo_a_passo", "conversa"]).nullable(),
  origem: z.enum(ORIGENS_FUNIL),
});

// Limite simples por instância; o IP nunca é gravado.
const janelas = new Map<string, { inicio: number; total: number }>();
function excedeu(ip: string) {
  const agora = Date.now();
  const j = janelas.get(ip);
  if (!j || agora - j.inicio > 60_000) {
    if (janelas.size > 5000) janelas.clear();
    janelas.set(ip, { inicio: agora, total: 1 });
    return false;
  }
  j.total += 1;
  return j.total > 60;
}

const vazio = () => new Response(null, { status: 204 });

export const Route = createFileRoute("/api/public/funil")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { ipDaChamada } = await import("@/lib/webhook-guard.server");
          const ip = ipDaChamada(request) ?? "?";
          if (excedeu(ip)) return vazio();
          const texto = await request.text();
          if (texto.length > 1000) return vazio();
          const dados = esquema.safeParse(JSON.parse(texto));
          if (!dados.success) return vazio();
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { resolverTenantPorSlug } = await import("@/lib/tenant-slug");
          const resolvido = await resolverTenantPorSlug(supabaseAdmin, dados.data.slug);
          if (!resolvido) return vazio();
          await supabaseAdmin.from("eventos_funil").insert({
            tenant_id: resolvido.tenant_id,
            etapa: dados.data.etapa,
            experiencia: dados.data.experiencia,
            fluxo: dados.data.fluxo,
            origem: dados.data.origem,
          });
        } catch {
          /* medição nunca falha para quem visita */
        }
        return vazio();
      },
    },
  },
});
