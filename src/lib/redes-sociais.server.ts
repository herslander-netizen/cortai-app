/**
 * Conexão de contas sociais — parte exclusiva do servidor.
 * Lê segredos do ambiente dentro das funções (nunca no escopo do módulo).
 */
import { createHmac, randomBytes, timingSafeEqual } from "crypto";

import type { PlataformaSocial } from "@/lib/redes-sociais";

export type CredenciaisDaPlataforma = { clientId: string; clientSecret: string };

/** Devolve as chaves da plataforma, ou null quando ainda não foram configuradas. */
export function credenciaisDaPlataforma(
  plataforma: PlataformaSocial,
): CredenciaisDaPlataforma | null {
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

function iguais(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Validade do state: tempo de autorizar na Meta/TikTok, sem deixar o link valer para sempre. */
export const VALIDADE_DO_ESTADO_MS = 10 * 60 * 1000;

/** Cookie que prende o state ao navegador de quem iniciou a conexão (uso único). */
export function nomeDoCookieDoEstado(plataforma: PlataformaSocial): string {
  return `cortai_oauth_${plataforma}`;
}

export type DadosDoEstado = { tenantId: string; userId: string; plataforma: PlataformaSocial };

/**
 * state do OAuth (achado C3 de 16/10): negócio, pessoa, plataforma, prazo e um nonce aleatório,
 * assinados. O nonce também vai num cookie HttpOnly do navegador de quem iniciou; o callback só
 * aceita o state junto com esse cookie, e o cookie é apagado no retorno. Assim quem viu o state
 * (histórico, logs, ex-funcionário) não consegue ligar a própria conta ao negócio.
 */
export function criarEstado(
  dados: DadosDoEstado,
  segredo: string,
  agora: number = Date.now(),
): { state: string; nonce: string } {
  const nonce = randomBytes(16).toString("hex");
  const corpo = Buffer.from(
    JSON.stringify({
      t: dados.tenantId,
      u: dados.userId,
      p: dados.plataforma,
      e: agora + VALIDADE_DO_ESTADO_MS,
      n: nonce,
    }),
  ).toString("base64url");
  return { state: `${corpo}.${hmac(corpo, segredo)}`, nonce };
}

export function verificarEstado(
  state: string,
  segredo: string,
  esperado: { plataforma: PlataformaSocial; nonceDoCookie: string | null },
  agora: number = Date.now(),
): Omit<DadosDoEstado, "plataforma"> | null {
  const [corpo, assinatura, sobra] = state.split(".");
  if (!corpo || !assinatura || sobra !== undefined) return null;
  if (!iguais(assinatura, hmac(corpo, segredo))) return null;
  let dados: { t?: unknown; u?: unknown; p?: unknown; e?: unknown; n?: unknown };
  try {
    dados = JSON.parse(Buffer.from(corpo, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  const { t, u, p, e, n } = dados;
  if (typeof t !== "string" || typeof u !== "string" || typeof n !== "string") return null;
  if (typeof e !== "number" || e < agora) return null;
  if (p !== esperado.plataforma) return null;
  if (!esperado.nonceDoCookie || !iguais(n, esperado.nonceDoCookie)) return null;
  return { tenantId: t, userId: u };
}

/** Lê um cookie do cabeçalho da requisição. */
export function lerCookie(cabecalho: string | null, nome: string): string | null {
  if (!cabecalho) return null;
  for (const parte of cabecalho.split(";")) {
    const i = parte.indexOf("=");
    if (i > 0 && parte.slice(0, i).trim() === nome) return parte.slice(i + 1).trim() || null;
  }
  return null;
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
