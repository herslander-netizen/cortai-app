/**
 * Autenticação do webhook da Evolution (pura, testável).
 * Fail-closed: sem segredo no ambiente recusa tudo (503); com segredo, toda
 * sessão precisa enviá-lo por cabeçalho (`x-webhook-secret` ou `apikey`).
 * Nunca pela URL (aparece em log) e sem exceção por instância.
 */
import { timingSafeEqual } from "node:crypto";

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
  if (!segredoConfere(recebido, segredo)) return { ok: false, status: 401, motivo: "token invalido" };
  return { ok: true };
}
