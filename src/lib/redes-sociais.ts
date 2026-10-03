/**
 * Conexão de contas Instagram e TikTok — parte compartilhada (segura no navegador).
 * Nenhum token ou segredo passa por aqui: só rótulos, estados e a URL de autorização.
 */

export const PLATAFORMAS = ["instagram", "tiktok"] as const;
export type PlataformaSocial = (typeof PLATAFORMAS)[number];

export type StatusConexao = "conectada" | "simulada" | "expirada" | "erro";

/** Visão segura para a tela: nunca inclui tokens. */
export type ConexaoSocial = {
  id: string;
  plataforma: PlataformaSocial;
  status: StatusConexao;
  conta_nome: string | null;
  avatar_url: string | null;
  expira_em: string | null;
  criado_em: string;
};

export const ROTULO_PLATAFORMA: Record<PlataformaSocial, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
};

export function rotuloDoStatus(status: StatusConexao): string {
  switch (status) {
    case "conectada":
      return "Conectada";
    case "simulada":
      return "Demonstração";
    case "expirada":
      return "Expirada — reconecte";
    case "erro":
      return "Erro na conexão";
  }
}

/** Monta a URL de autorização de cada plataforma. */
export function urlDeAutorizacao(
  plataforma: PlataformaSocial,
  params: { clientId: string; redirectUri: string; state: string },
): string {
  const { clientId, redirectUri, state } = params;
  if (plataforma === "instagram") {
    const url = new URL("https://www.facebook.com/v21.0/dialog/oauth");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "instagram_basic,instagram_content_publish");
    return url.toString();
  }
  const url = new URL("https://www.tiktok.com/v2/auth/authorize/");
  url.searchParams.set("client_key", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "user.info.basic,video.publish");
  return url.toString();
}
