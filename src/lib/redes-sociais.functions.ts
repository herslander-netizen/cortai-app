import { createServerFn } from "@tanstack/react-start";
import { getRequest, setCookie } from "@tanstack/react-start/server";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { tenantIdDoMembro, exigirPermissao } from "@/lib/tenant";
import {
  PLATAFORMAS,
  urlDeAutorizacao,
  type ConexaoSocial,
  type PlataformaSocial,
  type StatusConexao,
} from "@/lib/redes-sociais";

const esquemaPlataforma = z.object({ plataforma: z.enum(PLATAFORMAS) });

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Lista as conexões do negócio sem expor tokens ao navegador. */
export const getConexoesSociais = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ conexoes: ConexaoSocial[] }> => {
    const tenantId = await tenantIdDoMembro(context);
    const { data, error } = await context.supabase
      .from("conexoes_sociais")
      .select("id, plataforma, status, conta_nome, avatar_url, expira_em, criado_em")
      .eq("tenant_id", tenantId);
    if (error) throw new Error("Não foi possível carregar as conexões agora.");
    return { conexoes: (data ?? []) as ConexaoSocial[] };
  });

/**
 * Inicia a conexão. Com as chaves de desenvolvedor configuradas, devolve a URL
 * de autorização da plataforma; sem elas, cria uma conexão de demonstração.
 */
export const iniciarConexaoSocial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => esquemaPlataforma.parse(input))
  .handler(
    async ({
      data,
      context,
    }): Promise<{ simulada: boolean; url?: string; plataforma: PlataformaSocial }> => {
      const tenantId = await tenantIdDoMembro(context);
      await exigirPermissao(context, tenantId, "alterar_dados_barbearia");

      const { credenciaisDaPlataforma, criarEstado, nomeDoCookieDoEstado, VALIDADE_DO_ESTADO_MS } =
        await import("@/lib/redes-sociais.server");
      const creds = credenciaisDaPlataforma(data.plataforma);

      if (!creds) {
        const db = await admin();
        const { error } = await db.from("conexoes_sociais").upsert(
          {
            tenant_id: tenantId,
            plataforma: data.plataforma,
            status: "simulada" satisfies StatusConexao,
            conta_nome: "Conta de demonstração",
            conectado_por: context.userId,
          },
          { onConflict: "tenant_id,plataforma" },
        );
        if (error) throw new Error("Não foi possível conectar agora. Tente de novo.");
        return { simulada: true, plataforma: data.plataforma };
      }

      const origem = new URL(getRequest().url).origin;
      const redirectUri = `${origem}/api/public/oauth/${data.plataforma}`;
      const { state, nonce } = criarEstado(
        { tenantId, userId: context.userId, plataforma: data.plataforma },
        creds.clientSecret,
      );
      setCookie(nomeDoCookieDoEstado(data.plataforma), nonce, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/api/public/oauth",
        maxAge: VALIDADE_DO_ESTADO_MS / 1000,
      });
      const url = urlDeAutorizacao(data.plataforma, {
        clientId: creds.clientId,
        redirectUri,
        state,
      });
      return { simulada: false, url, plataforma: data.plataforma };
    },
  );

/** Remove a conexão da plataforma. Não toca em nenhum outro dado do negócio. */
export const desconectarRedeSocial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => esquemaPlataforma.parse(input))
  .handler(async ({ data, context }) => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "alterar_dados_barbearia");
    const db = await admin();
    const { error } = await db
      .from("conexoes_sociais")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("plataforma", data.plataforma);
    if (error) throw new Error("Não foi possível desconectar agora. Tente de novo.");
    return { ok: true as const };
  });
