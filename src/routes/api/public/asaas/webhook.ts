import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/asaas/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const guard = await import("@/lib/webhook-guard.server");
        const abuso = await guard.barrarAbusivo(request, "asaas/webhook");
        if (abuso) return abuso;
        const { safeEqual, tokenDoWebhook } = await import("@/lib/asaas.server");
        const esperado = await tokenDoWebhook();
        const recebido = request.headers.get("asaas-access-token") ?? "";
        if (!esperado || !safeEqual(recebido, esperado)) {
          await guard.rejeitar(request, "asaas/webhook", "token invalido");
          return new Response("Unauthorized", { status: 401 });
        }
        let corpo: any;
        try {
          corpo = await request.json();
        } catch {
          return new Response("ok");
        }
        const eventId = String(corpo?.id ?? "");
        const evento = String(corpo?.event ?? "");
        if (!eventId || !evento) return new Response("ok");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: existente } = await (supabaseAdmin as any).from("eventos_asaas").select("status").eq("event_id", eventId).maybeSingle();
        if (existente?.status === "processado") return new Response("ok");
        if (!existente) {
          await (supabaseAdmin as any).from("eventos_asaas").insert({
            event_id: eventId, evento, payment_id: corpo?.payment?.id ?? null, corpo,
          });
        }
        const { processarEvento } = await import("@/lib/cobranca.server");
        await processarEvento(eventId);
        return new Response("ok");
      },
    },
  },
});
