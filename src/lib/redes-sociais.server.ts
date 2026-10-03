/**
 * Conexão de contas sociais — parte exclusiva do servidor.
 * Lê segredos do ambiente dentro das funções (nunca no escopo do módulo).
 */
import { createHmac, timingSafeEqual } from "crypto";

import type { PlataformaSocial } from "@/lib/redes-sociais";

export type CredenciaisDaPlataforma = { clientId: string; clientSecret: string };

/** Devolve as chaves da plataforma, ou null quando ainda não foram configuradas. */
export function credenciaisDaPlataforma(plataforma: PlataformaSocial): CredenciaisDaPlataforma | null {
  const clientId =
    plataforma === "instagram" ? process.env["META_APP_ID"] : process.env["TIKTOK_CLIENT_KEY"];
  const clientSecret =
    plataforma === "instagram"
      ? process.env["META_APP_SECRET"]
      : process.env["TIKTOK_CLIENT_SECRET"];
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

function hmac(valor: string, segredo: string): string {
  return createHmac("sha256", segredo).update(valor).digest("hex");
}

/** state do OAuth: tenant_id assinado, para o callback saber de qual negócio é a conexão. */
export function assinarEstado(tenantId: string, segredo: string): string {
  return `${tenantId}.${hmac(tenantId, segredo)}`;
}

export function verificarEstado(state: string, segredo: string): string | null {
  const [tenantId, assinatura] = state.split(".");
  if (!tenantId || !assinatura) return null;
  const esperada = hmac(tenantId, segredo);
  const a = Buffer.from(assinatura);
  const b = Buffer.from(esperada);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return tenantId;
}

export type TokenTrocado = {
  accessToken: string;
  refreshToken: string | null;
  expiraEm: string | null;
  contaId: string | null;
  contaNome: string | null;
};

/** Troca o code do OAuth pelos tokens e busca o nome da conta. Lança erro em falha. */
export async function trocarCodigoPorToken(
  plataforma: PlataformaSocial,
  code: string,
  redirectUri: string,
  creds: CredenciaisDaPlataforma,
): Promise<TokenTrocado> {
  if (plataforma === "instagram") {
    const corpo = new URLSearchParams({
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      redirect_uri: redirectUri,
      code,
      grant_type: "authorization_code",
    });
    const res = await fetch("https://graph.facebook.com/v21.0/oauth/access_token", {
      method: "POST",
      body: corpo,
    });
    if (!res.ok) throw new Error("Falha ao trocar o código com a Meta.");
    const json = (await res.json()) as { access_token?: string };
    if (!json.access_token) throw new Error("A Meta não devolveu o token de acesso.");

    let contaNome: string | null = null;
    let contaId: string | null = null;
    try {
      const perfil = await fetch(
        `https://graph.instagram.com/me?fields=user_id,username&access_token=${encodeURIComponent(json.access_token)}`,
      );
      if (perfil.ok) {
        const p = (await perfil.json()) as { user_id?: string; username?: string };
        contaId = p.user_id ?? null;
        contaNome = p.username ?? null;
      }
    } catch {
      // Nome da conta é complementar; a conexão já vale pelo token.
    }
    return {
      accessToken: json.access_token,
      refreshToken: null,
      expiraEm: null,
      contaId,
      contaNome,
    };
  }

  const corpo = new URLSearchParams({
    client_key: creds.clientId,
    client_secret: creds.clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  });
  const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: corpo,
  });
  if (!res.ok) throw new Error("Falha ao trocar o código com o TikTok.");
  const json = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    open_id?: string;
    expires_in?: number;
  };
  if (!json.access_token) throw new Error("O TikTok não devolveu o token de acesso.");
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? null,
    expiraEm: json.expires_in ? new Date(Date.now() + json.expires_in * 1000).toISOString() : null,
    contaId: json.open_id ?? null,
    contaNome: null,
  };
}
