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
        // Aceita o segredo de tarefas da plataforma ou a chave interna do agendador do banco.
        const chaveInterna = request.headers.get("x-cortai-varredura");
        let autorizado = false;
        if (chaveInterna && chaveInterna.length >= 32) {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data } = await supabaseAdmin
            .from("chaves_internas" as never)
            .select("valor")
            .eq("nome", "varredura_whatsapp")
            .maybeSingle();
          const valor = (data as { valor?: string } | null)?.valor ?? "";
          if (valor.length === chaveInterna.length) {
            const { timingSafeEqual } = await import("node:crypto");
            autorizado = timingSafeEqual(Buffer.from(valor), Buffer.from(chaveInterna));
          }
        }
        if (!autorizado) {
          const negado = await authenticateCronRequest(request);
          if (negado) {
            await guard.rejeitar(request, "whatsapp/automacoes", "cron sem autenticacao");
            return negado;
          }
        }
        const { processarAutomacoesDeWhatsapp } =
          await import("@/lib/whatsapp/notificacoes.server");
        const resumo = await processarAutomacoesDeWhatsapp();
        // Teste grátis: rebaixa vencidos e envia a régua (idempotente por dia).
        const teste = await import("@/lib/teste-gratis.server");
        const testesRebaixados = await teste.rebaixarTestesVencidos().catch(() => 0);
        const avisosDoTeste = await teste.processarReguaDoTeste().catch(() => 0);
        // Postagens agendadas nas redes: mesma varredura, sem agendador paralelo.
        const redes = await import("@/lib/postagens-sociais.server");
        const postagensPublicadas = await redes.processarPostagensVencidas().catch(() => 0);
        return Response.json({ ok: true, ...resumo, testesRebaixados, avisosDoTeste, postagensPublicadas });
      },
    },
  },
});
