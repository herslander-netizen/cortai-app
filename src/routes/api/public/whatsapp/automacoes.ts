/**
 * Varredura periódica das automações de WhatsApp (lembretes 24h/2h e
 * retentativas controladas). Sem IA: só eventos, regras, banco e templates.
 *
 * Protegido pela autenticação de tarefas agendadas do Cortaí: sem o segredo,
 * ninguém dispara mensagens por aqui.
 */
import { createFileRoute } from "@tanstack/react-router";

import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

export const Route = createFileRoute("/api/public/whatsapp/automacoes")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const guard = await import("@/lib/webhook-guard.server");
        const abuso = await guard.barrarAbusivo(request, "whatsapp/automacoes");
        if (abuso) return abuso;
        const negado = await authenticateCronRequest(request);
        if (negado) {
          await guard.rejeitar(request, "whatsapp/automacoes", "cron sem autenticacao");
          return negado;
        }
        const { processarAutomacoesDeWhatsapp } = await import("@/lib/whatsapp/notificacoes.server");
        const resumo = await processarAutomacoesDeWhatsapp();
        return Response.json({ ok: true, ...resumo });
      },
    },
  },
});
