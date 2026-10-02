/**
 * Fonte do service worker mínimo do Cortaí (servido em /sw.js sem cache longo).
 * Rede para tudo; só /assets/* com hash fica em cache, e navegação sem rede
 * mostra a página offline. Nunca guarda HTML, server functions, /api ou banco.
 */
import { VERSAO_INSTALADA } from "@/lib/versao";
import { decidirExibicao, passaNoModoFoco, primeiroNome, textoDoPush } from "@/lib/push/regras";

export const ICONE_OFFLINE = "/icone-cortai-oficial-192-v2.png";

export function paginaOffline() {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#021A46"><title>Sem conexão · Cortaí</title><style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#021A46;color:#F7FAFF;font-family:Manrope,system-ui,sans-serif;padding:24px;box-sizing:border-box;text-align:center}img{width:72px;height:72px;border-radius:18px}h1{font-size:20px;margin:20px 0 8px}p{font-size:15px;line-height:1.5;color:#C9D6EA;margin:0 0 24px}button{min-height:48px;padding:0 28px;border:0;border-radius:12px;background:#00B7F4;color:#021A46;font-size:16px;font-weight:700}</style></head><body><main><img src="${ICONE_OFFLINE}" alt="Cortaí"><h1>Sem conexão</h1><p>Confira a internet do aparelho e tente de novo.</p><button type="button" onclick="location.reload()">Tentar de novo</button></main></body></html>`;
}

export function fonteDoServiceWorker() {
  return `/* Cortaí ${VERSAO_INSTALADA} — gerado; não editar à mão. */
const CACHE_ASSETS = "cortai-assets-${VERSAO_INSTALADA}";
const CACHE_OFFLINE = "cortai-offline-v1";
const CACHE_ESTADO = "cortai-estado-v1";
const MANTER = [CACHE_ASSETS, CACHE_OFFLINE, CACHE_ESTADO];
const ICONE = ${JSON.stringify(ICONE_OFFLINE)};
const OFFLINE = ${JSON.stringify(paginaOffline())};
const passaNoModoFoco = ${passaNoModoFoco.toString()};
const decidirExibicao = ${decidirExibicao.toString()};
const primeiroNome = ${primeiroNome.toString()};
const VERBO = {agendamento_novo:"agendou",agendamento_cancelado:"cancelou",agendamento_remarcado:"remarcou",cliente_chegou:"chegou"};
const tipoDePushValido = (v) => typeof v === "string" && v in VERBO;
const textoDoPush = ${textoDoPush.toString()};

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE_OFFLINE).then((c) => c.add(ICONE)).catch(() => undefined));
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

async function lerEstado() {
  try {
    const c = await caches.open(CACHE_ESTADO);
    const r = await c.match("/__cortai-estado");
    return r ? await r.json() : { foco: false, discreto: false };
  } catch { return { foco: false, discreto: false }; }
}

self.addEventListener("message", (e) => {
  const d = e.data || {};
  if (d.tipo !== "cortai-estado") return;
  const estado = { foco: !!d.foco, discreto: !!d.discreto };
  e.waitUntil(caches.open(CACHE_ESTADO).then((c) => c.put("/__cortai-estado", new Response(JSON.stringify(estado)))));
});

self.addEventListener("push", (e) => {
  e.waitUntil((async () => {
    let d = {};
    try { d = e.data ? e.data.json() : {}; } catch { d = {}; }
    if (self.navigator.setAppBadge && typeof d.naoLidas === "number") {
      (d.naoLidas > 0 ? self.navigator.setAppBadge(d.naoLidas) : self.navigator.clearAppBadge()).catch(() => undefined);
    }
    const estado = await lerEstado();
    const janelas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const visivel = janelas.find((j) => j.visibilityState === "visible" && j.focused);
    const decisao = decidirExibicao({ appVisivel: !!visivel, foco: estado.foco, tipo: d.tipo, proximo: !!d.proximo });
    if (decisao === "nada") return;
    if (decisao === "no_app") { visivel.postMessage({ tipo: "cortai-push", aviso: d }); return; }
    const corpo = textoDoPush({ tipo: d.tipo, nome: d.nome || "", quando: d.quando || "", discreto: estado.discreto });
    await self.registration.showNotification("Cortaí", { body: corpo, tag: d.tag || d.tipo, renotify: true, icon: ICONE, badge: ICONE, data: { link: d.link || "/barbeiro/agenda" } });
  })());
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const link = (e.notification.data && e.notification.data.link) || "/barbeiro/agenda";
  e.waitUntil((async () => {
    const janelas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const janela = janelas[0];
    if (janela) { await janela.focus(); return janela.navigate(link).catch(() => undefined); }
    return self.clients.openWindow(link);
  })());
});
`;
}
