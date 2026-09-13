/**
 * Entrada de eventos da futura ALVO IA.
 *
 * Enquanto `ALVO_IA_WEBHOOK_SECRET` não existir, o endpoint responde 503 — não
 * existe caminho aberto nem integração simulada. Com o segredo configurado:
 * - a assinatura HMAC é conferida em tempo constante;
 * - a barbearia é descoberta pelo `external_tenant_id` gravado na integração,
 *   nunca por um tenant_id qualquer enviado no corpo;
 * - a mesma entrega nunca é processada duas vezes;
 * - tudo fica registrado; nada altera o banco de negócio direto por aqui.
 */
import { createFileRoute } from "@tanstack/react-router";

import { PROVEDOR_PADRAO } from "@/lib/ia/contrato";

async function assinaturaValida(corpo: string, assinatura: string | null, segredo: string) {
  if (!assinatura) return false;
  const { createHmac, timingSafeEqual } = await import("node:crypto");
  const esperado = createHmac("sha256", segredo).update(corpo, "utf8").digest("hex");
  const a = Buffer.from(assinatura.replace(/^sha256=/, ""), "utf8");
  const b = Buffer.from(esperado, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export const Route = createFileRoute("/api/public/alvo-ia")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { segredoDeWebhook, provedorDeIA } = await import("@/lib/ia/alvo-ia.server");
        const segredo = segredoDeWebhook();
        if (!segredo) return new Response("Integration not enabled", { status: 503 });

        const corpo = await request.text();
        if (!(await assinaturaValida(corpo, request.headers.get("x-alvo-signature"), segredo))) {
          return new Response("Invalid signature", { status: 401 });
        }

        let evento;
        try {
          evento = provedorDeIA().normalizarEventoRecebido(JSON.parse(corpo));
        } catch {
          return new Response("Invalid payload", { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: integracao } = await supabaseAdmin
          .from("integracoes_de_ia")
          .select("tenant_id, status")
          .eq("provedor", PROVEDOR_PADRAO)
          .eq("external_tenant_id", evento.externalTenantId)
          .maybeSingle();
        if (!integracao || integracao.status === "suspenso") {
          return new Response("Unknown tenant", { status: 404 });
        }

        const { error } = await supabaseAdmin.from("eventos_recebidos_de_ia").insert({
          tenant_id: integracao.tenant_id,
          provedor: PROVEDOR_PADRAO,
          evento_externo_id: evento.eventoExternoId,
          tipo: evento.tipo,
          payload: evento.payload,
        });
        // 23505 = já recebemos esta entrega; responder ok evita reentrega infinita.
        if (error && error.code !== "23505") {
          console.error("[alvo-ia] falha ao gravar evento recebido", error);
          return new Response("Storage error", { status: 500 });
        }

        await supabaseAdmin.from("auditoria_da_barbearia").insert({
          tenant_id: integracao.tenant_id,
          ator_user_id: null,
          acao: "alvo_ia.evento_recebido",
          alvo: evento.eventoExternoId,
          detalhes: { tipo: evento.tipo, duplicado: Boolean(error) },
        });

        return Response.json({ ok: true, duplicado: Boolean(error) });
      },
    },
  },
});
