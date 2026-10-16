import { createFileRoute } from "@tanstack/react-router";

import { PLATAFORMAS, type PlataformaSocial } from "@/lib/redes-sociais";

/**
 * Callback OAuth do Instagram/TikTok. Público por natureza (a plataforma chama), mas só grava
 * com o state assinado, dentro do prazo, no mesmo navegador que iniciou (cookie de uso único,
 * apagado em toda resposta) e se a pessoa que iniciou ainda tem a permissão de alterar o negócio.
 */
export const Route = createFileRoute("/api/public/oauth/$plataforma")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const plataforma = params.plataforma as PlataformaSocial;
        if (!PLATAFORMAS.includes(plataforma)) return new Response("Not found", { status: 404 });

        const {
          credenciaisDaPlataforma,
          verificarEstado,
          trocarCodigoPorToken,
          nomeDoCookieDoEstado,
          lerCookie,
        } = await import("@/lib/redes-sociais.server");
        const cookie = nomeDoCookieDoEstado(plataforma);
        const redirecionar = (destino: string) =>
          new Response(null, {
            status: 302,
            headers: {
              Location: destino,
              "Set-Cookie": `${cookie}=; Path=/api/public/oauth; Max-Age=0; HttpOnly; Secure; SameSite=Lax`,
            },
          });

        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const volta = `${url.origin}/barbeiro/redes`;

        const creds = credenciaisDaPlataforma(plataforma);
        if (!creds) return redirecionar(`${volta}?erro=configuracao`);
        if (!code || !state) return redirecionar(`${volta}?erro=cancelado`);

        const estado = verificarEstado(state, creds.clientSecret, {
          plataforma,
          nonceDoCookie: lerCookie(request.headers.get("cookie"), cookie),
        });
        if (!estado) return redirecionar(`${volta}?erro=estado`);
        const { tenantId, userId } = estado;

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: permitido } = await supabaseAdmin.rpc("permissao_efetiva", {
            _user: userId,
            _tenant: tenantId,
            _perm: "alterar_dados_barbearia",
          });
          if (permitido !== true) return redirecionar(`${volta}?erro=estado`);

          const redirectUri = `${url.origin}/api/public/oauth/${plataforma}`;
          const token = await trocarCodigoPorToken(plataforma, code, redirectUri, creds);
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
              conectado_por: userId,
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
