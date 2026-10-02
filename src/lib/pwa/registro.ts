/**
 * Único lugar que registra o service worker. Só no domínio de produção e fora
 * de iframe; em qualquer outro lugar remove um registro que tenha sobrado.
 */
const HOSTS_DE_PRODUCAO = new Set(["cortai.dev", "www.cortai.dev"]);

export function podeRegistrar(opcoes: { host: string; emIframe: boolean; producao: boolean }) {
  return opcoes.producao && !opcoes.emIframe && HOSTS_DE_PRODUCAO.has(opcoes.host);
}

export async function removerServiceWorkers() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const registros = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      registros
        .filter((r) => (r.active ?? r.waiting ?? r.installing)?.scriptURL.endsWith("/sw.js"))
        .map((r) => r.unregister()),
    );
  } catch {
    /* sem service worker o app funciona igual */
  }
}

export async function iniciarServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  let emIframe = true;
  try {
    emIframe = window.self !== window.top;
  } catch {
    emIframe = true;
  }
  const ok = podeRegistrar({
    host: window.location.hostname,
    emIframe,
    producao: import.meta.env.PROD,
  });
  if (!ok) {
    await removerServiceWorkers();
    return;
  }
  try {
    await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  } catch {
    /* registro opcional: nunca atrapalha o uso */
  }
}
