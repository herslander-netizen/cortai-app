import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { fonteDoServiceWorker, paginaOffline } from "@/lib/pwa/service-worker";
import { podeRegistrar } from "@/lib/pwa/registro";
import {
  decidirExibicao,
  destinatariosDoPush,
  focoAtivo,
  passaNoModoFoco,
  inscricaoVencida,
  textoDoPush,
  type MembroDaEquipe,
} from "./regras";
import { b64url, cifrarConteudo, deB64url, gerarChavesVapid } from "./webpush.server";

describe("registro do service worker", () => {
  it("só no domínio de produção, fora de iframe e em build de produção", () => {
    expect(podeRegistrar({ host: "cortai.dev", emIframe: false, producao: true })).toBe(true);
    expect(podeRegistrar({ host: "www.cortai.dev", emIframe: false, producao: true })).toBe(true);
    expect(podeRegistrar({ host: "cortai.dev", emIframe: true, producao: true })).toBe(false);
    expect(podeRegistrar({ host: "cortai.dev", emIframe: false, producao: false })).toBe(false);
    expect(podeRegistrar({ host: "cortaiapp.pages.dev", emIframe: false, producao: true })).toBe(
      true,
    );
    for (const host of ["previa.cortaiapp.pages.dev", "outro-projeto.pages.dev", "localhost"])
      expect(podeRegistrar({ host, emIframe: false, producao: true })).toBe(false);
  });

  it("o arquivo gerado é JavaScript válido e não guarda HTML, API ou banco", () => {
    const fonte = fonteDoServiceWorker();
    expect(() => new Function(fonte)).not.toThrow();
    expect(fonte).toContain('url.pathname.startsWith("/assets/")');
    expect(fonte).toContain("skipWaiting");
    expect(fonte).toContain("clients.claim");
    // Só um ponto grava em cache, e ele fica antes do ramo de navegação (HTML nunca é guardado).
    expect(fonte.split("cache.put(req").length - 1).toBe(1);
    expect(fonte.indexOf("cache.put(req")).toBeLessThan(fonte.indexOf('req.mode === "navigate"'));
  });
});

describe("handler de push do service worker", () => {
  async function rodarPush(dados: unknown, janelas: unknown[] = []) {
    const ouvintes: Record<string, (e: unknown) => void> = {};
    const mostradas: { titulo: string; opcoes: Record<string, unknown> }[] = [];
    const mensagens: unknown[] = [];
    const janelasMock = janelas.map((j) => ({
      ...(j as object),
      postMessage: (m: unknown) => mensagens.push(m),
    }));
    const self = {
      addEventListener: (nome: string, fn: (e: unknown) => void) => (ouvintes[nome] = fn),
      clients: { matchAll: async () => janelasMock },
      registration: {
        showNotification: async (titulo: string, opcoes: Record<string, unknown>) => {
          mostradas.push({ titulo, opcoes });
        },
      },
      navigator: {},
      location: { origin: "https://cortai.dev" },
    };
    new Function("self", "caches", fonteDoServiceWorker())(self, {});
    let espera: Promise<unknown> = Promise.resolve();
    ouvintes["push"]!({
      data: { json: () => dados },
      waitUntil: (p: Promise<unknown>) => (espera = p),
    });
    await espera;
    return { mostradas, mensagens };
  }

  it("sempre mostra notificação, mesmo com conteúdo vazio", async () => {
    const r = await rodarPush({});
    expect(r.mostradas).toHaveLength(1);
  });

  it("com o app visível mostra em silêncio e manda o aviso para dentro do app", async () => {
    const r = await rodarPush({ tipo: "agendamento_novo", corpo: "Ana agendou · 10:00" }, [
      { visibilityState: "visible", focused: true },
    ]);
    expect(r.mostradas).toHaveLength(1);
    expect(r.mostradas[0]!.opcoes["silent"]).toBe(true);
    expect(r.mensagens).toHaveLength(1);
  });

  it("com o app fechado mostra com som", async () => {
    const r = await rodarPush({ tipo: "agendamento_novo", corpo: "Ana agendou · 10:00" });
    expect(r.mostradas[0]!.opcoes["silent"]).toBe(false);
    expect(r.mostradas[0]!.opcoes["body"]).toBe("Ana agendou · 10:00");
  });

  it("serve o ícone da página offline a partir do cache", () => {
    expect(fonteDoServiceWorker()).toContain("url.pathname === ICONE");
  });
});

describe("página offline", () => {
  it("tem a marca e o botão Tentar de novo", () => {
    const html = paginaOffline();
    expect(html).toContain("Flow");
    expect(html).toContain("Tentar de novo");
    expect(html).toContain("/icone-flow-192.png");
  });
});

describe("Foco informado pelo aparelho", () => {
  it("expira sozinho", () => {
    const agora = Date.parse("2026-10-02T12:00:00Z");
    expect(focoAtivo(null, agora)).toBe(false);
    expect(focoAtivo("2026-10-02T13:00:00Z", agora)).toBe(true);
    expect(focoAtivo("2026-10-02T11:59:00Z", agora)).toBe(false);
  });
  it("passaNoModoFoco", () => {
    expect(passaNoModoFoco("agendamento_novo", false)).toBe(false);
    expect(passaNoModoFoco("cliente_chegou", true)).toBe(true);
  });
});

describe("decidir exibição", () => {
  const base = { appVisivel: false, foco: false, tipo: "agendamento_novo", proximo: false };
  it("app visível vira aviso no app", () => {
    expect(decidirExibicao({ ...base, appVisivel: true })).toBe("no_app");
    expect(decidirExibicao(base)).toBe("sistema");
  });
  it("Modo Foco só deixa passar cancelamento, remarcação e chegada do próximo", () => {
    expect(decidirExibicao({ ...base, foco: true })).toBe("nada");
    expect(decidirExibicao({ ...base, foco: true, tipo: "agendamento_cancelado" })).toBe("sistema");
    expect(decidirExibicao({ ...base, foco: true, tipo: "agendamento_remarcado" })).toBe("sistema");
    expect(decidirExibicao({ ...base, foco: true, tipo: "cliente_chegou" })).toBe("nada");
    expect(decidirExibicao({ ...base, foco: true, tipo: "cliente_chegou", proximo: true })).toBe(
      "sistema",
    );
  });
});

describe("conteúdo do push", () => {
  it("primeiro nome e horário; modo discreto troca por Cliente", () => {
    expect(
      textoDoPush({
        tipo: "agendamento_cancelado",
        nome: "Ana Paula Souza",
        quando: "12:15",
        discreto: false,
      }),
    ).toBe("Ana cancelou · 12:15");
    expect(
      textoDoPush({ tipo: "cliente_chegou", nome: "Ana", quando: "12:15", discreto: true }),
    ).toBe("Cliente chegou · 12:15");
  });
  it("nunca leva telefone", () => {
    const t = textoDoPush({
      tipo: "agendamento_novo",
      nome: "Ana 11999998888",
      quando: "09:00",
      discreto: false,
    });
    expect(t).not.toMatch(/\d{8,}/);
  });
});

describe("quem recebe", () => {
  const equipe: MembroDaEquipe[] = [
    { userId: "dono", papel: "dono", ativo: true },
    { userId: "rec", papel: "recepcao", ativo: true },
    { userId: "davi", papel: "barbeiro", ativo: true },
    { userId: "joao", papel: "barbeiro", ativo: true },
    { userId: "saiu", papel: "barbeiro", ativo: false },
  ];
  it("profissional só os próprios; dono e recepção tudo", () => {
    const r = destinatariosDoPush(
      { tipo: "agendamento_novo", ator: null, profissionalUserId: "davi" },
      equipe,
    );
    expect(r.sort()).toEqual(["davi", "dono", "rec"]);
  });
  it("novo/cancelamento feito pela equipe não gera push", () => {
    expect(
      destinatariosDoPush(
        { tipo: "agendamento_cancelado", ator: "rec", profissionalUserId: "davi" },
        equipe,
      ),
    ).toEqual([]);
  });
  it("chegada marcada pela equipe avisa os outros, nunca quem marcou", () => {
    const r = destinatariosDoPush(
      { tipo: "cliente_chegou", ator: "rec", profissionalUserId: "davi" },
      equipe,
    );
    expect(r.sort()).toEqual(["davi", "dono"]);
  });
  it("respeita categoria desligada", () => {
    const r = destinatariosDoPush(
      { tipo: "agendamento_novo", ator: null, profissionalUserId: "davi" },
      equipe,
      new Set(["dono"]),
    );
    expect(r.sort()).toEqual(["davi", "rec"]);
  });
});

describe("limpeza de inscrições", () => {
  it("404 e 410 apagam; o resto só conta falha", () => {
    expect(inscricaoVencida(404)).toBe(true);
    expect(inscricaoVencida(410)).toBe(true);
    expect(inscricaoVencida(500)).toBe(false);
    expect(inscricaoVencida(429)).toBe(false);
  });
});

describe("cifra do push (RFC 8291)", () => {
  it("o aparelho consegue decifrar o conteúdo", async () => {
    const ua = (await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, [
      "deriveBits",
    ])) as CryptoKeyPair;
    const uaPub = new Uint8Array(await crypto.subtle.exportKey("raw", ua.publicKey));
    const segredo = crypto.getRandomValues(new Uint8Array(16));
    const corpo = await cifrarConteudo(
      { endpoint: "https://x", p256dh: b64url(uaPub), auth: b64url(segredo) },
      '{"ok":1}',
    );
    const sal = corpo.slice(0, 16);
    const idlen = corpo[20]!;
    const asPub = corpo.slice(21, 21 + idlen);
    const cifrado = corpo.slice(21 + idlen);
    const h = async (k: Uint8Array<ArrayBuffer>, d: Uint8Array<ArrayBuffer>) =>
      new Uint8Array(
        await crypto.subtle.sign(
          "HMAC",
          await crypto.subtle.importKey("raw", k, { name: "HMAC", hash: "SHA-256" }, false, [
            "sign",
          ]),
          d,
        ),
      );
    const te = new TextEncoder();
    const cat = (...p: Uint8Array[]): Uint8Array<ArrayBuffer> => {
      const o = new Uint8Array(p.reduce((s, x) => s + x.length, 0));
      let i = 0;
      for (const x of p) {
        o.set(x, i);
        i += x.length;
      }
      return o;
    };
    const asKey = await crypto.subtle.importKey(
      "raw",
      asPub,
      { name: "ECDH", namedCurve: "P-256" },
      false,
      [],
    );
    const ecdh = new Uint8Array(
      await crypto.subtle.deriveBits({ name: "ECDH", public: asKey }, ua.privateKey, 256),
    );
    const ikm = await h(
      await h(segredo, ecdh),
      cat(te.encode("WebPush: info\0"), uaPub, asPub, new Uint8Array([1])),
    );
    const prk = await h(sal, ikm);
    const cek = (
      await h(prk, cat(te.encode("Content-Encoding: aes128gcm\0"), new Uint8Array([1])))
    ).slice(0, 16);
    const nonce = (
      await h(prk, cat(te.encode("Content-Encoding: nonce\0"), new Uint8Array([1])))
    ).slice(0, 12);
    const claro = new Uint8Array(
      await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: nonce },
        await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["decrypt"]),
        cifrado,
      ),
    );
    expect(new TextDecoder().decode(claro.slice(0, -1))).toBe('{"ok":1}');
    expect(claro.at(-1)).toBe(2);
  });

  it("gera par VAPID com chave pública de 65 bytes", async () => {
    const c = await gerarChavesVapid();
    expect(deB64url(c.publica).length).toBe(65);
    expect(c.jwk.d).toBeTruthy();
  });
});

describe("RLS de push_inscricoes", () => {
  it("cada pessoa só lê e remove as próprias; gravação só pelo servidor", () => {
    const dir = "drizzle/migrations";
    const sql = readdirSync(dir)
      .filter((f) => f.endsWith(".sql"))
      .map((f) => readFileSync(`${dir}/${f}`, "utf8"))
      .join("\n");
    expect(sql).toContain("alter table public.push_inscricoes enable row level security");
    expect(sql).toContain("grant select, delete on public.push_inscricoes to authenticated");
    expect(sql).not.toMatch(/grant[^;]*insert[^;]*push_inscricoes to authenticated/i);
    expect(sql).toMatch(/for select to authenticated using \(user_id = auth\.uid\(\)\)/);
    expect(sql).toMatch(/for delete to authenticated using \(user_id = auth\.uid\(\)\)/);
  });
});
