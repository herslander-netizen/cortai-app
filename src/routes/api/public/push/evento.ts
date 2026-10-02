/**
 * Recebe do banco (gatilho dos avisos do sino) um acontecimento da agenda e
 * envia o push para a equipe certa. Só aceita a chave interna do banco.
 */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { TIPOS_DE_PUSH } from "@/lib/push/regras";

const Corpo = z.object({
  agendamentoId: z.string().uuid(),
  tipo: z.enum(TIPOS_DE_PUSH),
  ator: z.string().uuid().nullable().optional(),
});

export const Route = createFileRoute("/api/public/push/evento")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const guard = await import("@/lib/webhook-guard.server");
        const abuso = await guard.barrarAbusivo(request, "push/evento");
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
          await guard.rejeitar(request, "push/evento", "chave invalida");
          return new Response("Unauthorized", { status: 401 });
        }
        const corpo = Corpo.safeParse(await request.json().catch(() => null));
        if (!corpo.success) return new Response("Bad request", { status: 400 });
        const { processarEventoDePush } = await import("@/lib/push/eventos.server");
        const resultado = await processarEventoDePush({
          agendamentoId: corpo.data.agendamentoId,
          tipo: corpo.data.tipo,
          ator: corpo.data.ator ?? null,
        }).catch(() => ({ enviados: 0 }));
        return Response.json({ ok: true, ...resultado });
      },
    },
  },
});
