/**
 * Fonte do service worker mínimo do Flow (servido em /sw.js sem cache longo).
 * Rede para tudo; só /assets/* com hash fica em cache, e navegação sem rede
 * mostra a página offline. Nunca guarda HTML, server functions, /api ou banco.
 */
import { VERSAO_INSTALADA } from "@/lib/versao";

export const ICONE_OFFLINE = "/icone-flow-192.png";

export function paginaOffline() {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#1A1F1C"><title>Sem conexão · Flow</title><style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#1A1F1C;color:#E3EAE6;font-family:Inter,system-ui,sans-serif;padding:24px;box-sizing:border-box;text-align:center}img{width:72px;height:72px;border-radius:18px}h1{font-size:20px;margin:20px 0 8px}p{font-size:15px;line-height:1.5;color:#A9B3AE;margin:0 0 24px}button{min-height:48px;padding:0 28px;border:0;border-radius:999px;background:#00B7F4;color:#1A1F1C;font-size:16px;font-weight:700}</style></head><body><main><img src="${ICONE_OFFLINE}" alt="Flow"><h1>Sem conexão</h1><p>Confira a internet do aparelho e tente de novo.</p><button type="button" onclick="location.reload()">Tentar de novo</button></main></body></html>`;
}

export function fonteDoServiceWorker() {
  return `/* Flow ${VERSAO_INSTALADA} — gerado; não editar à mão. */
const CACHE_ASSETS = "cortai-assets-${VERSAO_INSTALADA}";
const CACHE_OFFLINE = "cortai-offline-v1";
const MANTER = [CACHE_ASSETS, CACHE_OFFLINE];
const ICONE = ${JSON.stringify(ICONE_OFFLINE)};
const OFFLINE = ${JSON.stringify(paginaOffline())};

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE_OFFLINE).then((c) => c.add(ICONE)).catch(() => undefined));
});

self.addEventListener("message", (e) => {
  if (e.data && e.data.tipo === "cortai-ativar") self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const nomes = await caches.keys();
    await Promise.all(nomes.filter((n) => n.startsWith("cortai-") && !MANTER.includes(n)).map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname === ICONE) {
    e.respondWith(caches.match(ICONE, { cacheName: CACHE_OFFLINE }).then((r) => r || fetch(req)));
    return;
  }
  if (url.pathname.startsWith("/assets/")) {
    e.respondWith((async () => {
      const cache = await caches.open(CACHE_ASSETS);
      const achado = await cache.match(req);
      if (achado) return achado;
      const resp = await fetch(req);
      if (resp.ok) cache.put(req, resp.clone()).catch(() => undefined);
      return resp;
    })());
    return;
  }
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).catch(() => new Response(OFFLINE, { headers: { "Content-Type": "text/html; charset=utf-8" } })));
  }
  /* Todo o resto segue direto para a rede. */
});

self.addEventListener("push", (e) => {
  e.waitUntil((async () => {
    let d = {};
    try { d = e.data ? e.data.json() : {}; } catch { d = {}; }
    if (self.navigator.setAppBadge && typeof d.naoLidas === "number") {
      (d.naoLidas > 0 ? self.navigator.setAppBadge(d.naoLidas) : self.navigator.clearAppBadge()).catch(() => undefined);
    }
    /* Foco e modo discreto já foram decididos no servidor. Todo push mostra notificação
       (sem isso o iPhone revoga a inscrição e o Chrome mostra um aviso genérico). */
    let visivel = null;
    try {
      const janelas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      visivel = janelas.find((j) => j.visibilityState === "visible" && j.focused) || null;
    } catch { visivel = null; }
    const corpo = typeof d.corpo === "string" && d.corpo ? d.corpo : "Novo aviso na agenda";
    if (visivel) { try { visivel.postMessage({ tipo: "cortai-push", aviso: { tipo: d.tipo, corpo } }); } catch { /* segue */ } }
    await self.registration.showNotification("Flow", { body: corpo, tag: d.tag || d.tipo || "cortai", renotify: !visivel, silent: !!visivel, icon: ICONE, badge: ICONE, data: { link: d.link || "/barbeiro/agenda" } });
  })());
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const link = (e.notification.data && e.notification.data.link) || "/barbeiro/agenda";
  e.waitUntil((async () => {
    const janelas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const janela = janelas[0];
    if (janela) {
      try {
        await janela.focus();
        /* navigate só funciona em janela controlada por este service worker. */
        const navegou = await janela.navigate(link);
        if (navegou) return;
      } catch { /* abre uma nova */ }
    }
    return self.clients.openWindow(link);
  })());
});
`;
}
