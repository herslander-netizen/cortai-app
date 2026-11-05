/**
 * Autenticação do webhook da Evolution (pura, testável).
 * Fail-closed: sem segredo no ambiente recusa tudo (503); com segredo, toda
 * sessão precisa enviá-lo por cabeçalho (`x-webhook-secret` ou `apikey`).
 * Nunca pela URL (aparece em log) e sem exceção por instância.
 *
 * Segredo por instância (dono, 05/11/2026): cada instância recebe um segredo DERIVADO do segredo do ambiente
 * (HMAC-SHA256 com o nome da instância). O segredo do ambiente nunca vai para a Evolution, o de uma instância não serve
 * para outra e nada fica gravado no banco. O segredo do ambiente ainda é aceito só para instâncias configuradas antes
 * (legado), até reconectarem — elas passam ao derivado sozinhas em `criarSessao`.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export function segredoDoCabecalho(headers: Headers): string | null {
  return headers.get("x-webhook-secret") ?? headers.get("apikey") ?? null;
}

export function segredoConfere(recebido: string | null, segredo: string): boolean {
  if (!recebido) return false;
  const a = Buffer.from(recebido, "utf8");
  const b = Buffer.from(segredo, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export type AutorizacaoDoWebhook =
  | { ok: true }
  | { ok: false; status: 503; motivo: "sem segredo no ambiente" }
  | { ok: false; status: 401; motivo: "sem token" | "token invalido" };

export function autorizarWebhook(headers: Headers, segredo: string | null): AutorizacaoDoWebhook {
  if (!segredo) return { ok: false, status: 503, motivo: "sem segredo no ambiente" };
  const recebido = segredoDoCabecalho(headers);
  if (!recebido) return { ok: false, status: 401, motivo: "sem token" };
  if (!segredoConfere(recebido, segredo))
    return { ok: false, status: 401, motivo: "token invalido" };
  return { ok: true };
}

/** Segredo do webhook de UMA instância: HMAC do segredo do ambiente com o nome dela. */
export function segredoDaInstancia(segredo: string, sessaoId: string): string {
  return createHmac("sha256", segredo).update(`evolution-webhook:${sessaoId}`).digest("hex");
}

export type AutorizacaoDaInstancia =
  | { ok: true; origem: "instancia" | "ambiente_legado" }
  | { ok: false; status: 401; motivo: "sem token" | "token invalido" };

/** Confere o cabeçalho contra o segredo DESTA instância (ou, legado, o do ambiente). Chamar depois do 503. */
export function autorizarInstancia(
  headers: Headers,
  segredo: string,
  sessaoId: string,
): AutorizacaoDaInstancia {
  const recebido = segredoDoCabecalho(headers);
  if (!recebido) return { ok: false, status: 401, motivo: "sem token" };
  if (segredoConfere(recebido, segredoDaInstancia(segredo, sessaoId)))
    return { ok: true, origem: "instancia" };
  if (segredoConfere(recebido, segredo)) return { ok: true, origem: "ambiente_legado" };
  return { ok: false, status: 401, motivo: "token invalido" };
}
