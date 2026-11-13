/**
 * Suporte de QA somente no Vite isolado: nunca é importado pelo app publicado.
 * O useServerFn apenas devolve o backend falso da bancada.
 */
export function useServerFn<T>(fn: T): T {
  return fn;
}
