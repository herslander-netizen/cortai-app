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
        const negado = await authenticateCronRequest(request);
        if (negado) return negado;
        const { processarAutomacoesDeWhatsapp } = await import("@/lib/whatsapp/notificacoes.server");
        const resumo = await processarAutomacoesDeWhatsapp();
        return Response.json({ ok: true, ...resumo });
      },
    },
  },
});
