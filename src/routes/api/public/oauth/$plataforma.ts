import { createFileRoute } from "@tanstack/react-router";

import { PLATAFORMAS, type PlataformaSocial } from "@/lib/redes-sociais";

function redirecionar(destino: string) {
  return new Response(null, { status: 302, headers: { Location: destino } });
}

/**
 * Callback OAuth do Instagram/TikTok. Público por natureza (a plataforma chama),
 * mas o state assinado garante que só uma conexão iniciada pelo dono grava algo.
 */
export const Route = createFileRoute("/api/public/oauth/$plataforma")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const plataforma = params.plataforma as PlataformaSocial;
        if (!PLATAFORMAS.includes(plataforma)) return new Response("Not found", { status: 404 });

        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const volta = `${url.origin}/barbeiro/redes`;

        const { credenciaisDaPlataforma, verificarEstado, trocarCodigoPorToken } = await import(
          "@/lib/redes-sociais.server"
        );
        const creds = credenciaisDaPlataforma(plataforma);
        if (!creds) return redirecionar(`${volta}?erro=configuracao`);
        if (!code || !state) return redirecionar(`${volta}?erro=cancelado`);

        const tenantId = verificarEstado(state, creds.clientSecret);
        if (!tenantId) return redirecionar(`${volta}?erro=estado`);

        try {
          const redirectUri = `${url.origin}/api/public/oauth/${plataforma}`;
          const token = await trocarCodigoPorToken(plataforma, code, redirectUri, creds);
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { error } = await supabaseAdmin.from("conexoes_sociais").upsert(
            {
              tenant_id: tenantId,
              plataforma,
              status: "conectada",
              conta_nome: token.contaNome,
              conta_id_externo: token.contaId,
              token_acesso: token.accessToken,
              token_refresh: token.refreshToken,
              expira_em: token.expiraEm,
            },
            { onConflict: "tenant_id,plataforma" },
          );
          if (error) return redirecionar(`${volta}?erro=salvar`);
          return redirecionar(`${volta}?conectada=${plataforma}`);
        } catch {
          return redirecionar(`${volta}?erro=troca`);
        }
      },
    },
  },
});
