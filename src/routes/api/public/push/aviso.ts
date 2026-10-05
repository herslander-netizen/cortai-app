/**
 * Recebe do banco (gatilho de inserção no sininho) um aviso da equipe e envia
 * o push para quem deve recebê-lo. Só aceita a chave interna do banco.
 */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";


const Corpo = z.object({ notificacaoId: z.string().uuid() });

export const Route = createFileRoute("/api/public/push/aviso")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const guard = await import("@/lib/webhook-guard.server");
        const abuso = await guard.barrarAbusivo(request, "push/aviso");
        if (abuso) return abuso;
        const recebida = request.headers.get("x-cortai-push") ?? "";
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data } = await supabaseAdmin
          .from("chaves_internas")
          .select("valor")
          .eq("nome", "push_eventos")
          .maybeSingle();
        const esperada = (data as { valor?: string } | null)?.valor ?? "";
        const { timingSafeEqual } = await import("node:crypto");
        const ok =
          esperada.length >= 32 &&
          recebida.length === esperada.length &&
          timingSafeEqual(Buffer.from(recebida), Buffer.from(esperada));
        if (!ok) {
          await guard.rejeitar(request, "push/aviso", "chave invalida");
          return new Response("Unauthorized", { status: 401 });
        }
        const corpo = Corpo.safeParse(await request.json().catch(() => null));
        if (!corpo.success) return new Response("Bad request", { status: 400 });
        const { processarAvisoDoSininho } = await import("@/lib/push/aviso-sininho.server");
        const resultado = await processarAvisoDoSininho(corpo.data.notificacaoId).catch(() => ({ enviados: 0 }));
        return Response.json({ ok: true, ...resultado });
      },
    },
  },
});
