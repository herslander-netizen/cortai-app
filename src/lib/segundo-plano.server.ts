/**
 * Trabalho que continua depois da resposta HTTP (Cloudflare `ctx.waitUntil`).
 * O `ctx` da requisição é guardado por `server.ts`; fora do worker (dev/testes)
 * não existe e quem chama decide rodar na hora.
 */
import { AsyncLocalStorage } from "node:async_hooks";

type Contexto = { waitUntil?: (p: Promise<unknown>) => void };

const armazenamento = new AsyncLocalStorage<Contexto | undefined>();

export function comContextoDaRequisicao<T>(ctx: unknown, fn: () => T): T {
  const c = ctx && typeof (ctx as Contexto).waitUntil === "function" ? (ctx as Contexto) : undefined;
  return armazenamento.run(c, fn);
}

/** Agenda a promessa para depois da resposta. Devolve false se não houver como. */
export function emSegundoPlano(promessa: Promise<unknown>): boolean {
  const ctx = armazenamento.getStore();
  if (!ctx?.waitUntil) return false;
  ctx.waitUntil(promessa);
  return true;
}
