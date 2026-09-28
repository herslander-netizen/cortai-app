import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/asaas/varredura")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const guard = await import("@/lib/webhook-guard.server");
        const abuso = await guard.barrarAbusivo(request, "asaas/varredura");
        if (abuso) return abuso;
        const chave = request.headers.get("x-cortai-varredura") ?? "";
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data } = await (supabaseAdmin as any).from("chaves_internas").select("valor").eq("nome", "varredura_asaas").maybeSingle();
        const { safeEqual } = await import("@/lib/asaas.server");
        if (!data?.valor || !safeEqual(chave, data.valor)) {
          await guard.rejeitar(request, "asaas/varredura", "sem chave");
          return new Response("Unauthorized", { status: 401 });
        }
        const { varreduraDeCobranca } = await import("@/lib/cobranca.server");
        return Response.json({ ok: true, ...(await varreduraDeCobranca()) });
      },
    },
  },
});
