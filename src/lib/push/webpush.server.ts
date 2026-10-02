/**
 * Web Push com WebCrypto (RFC 8291 aes128gcm + VAPID RFC 8292).
 * Roda no runtime de borda sem dependências de Node.
 * Nunca registra chaves nem conteúdo em log.
 */

export type ChavesVapid = { publica: string; jwk: JsonWebKey };
export type InscricaoPush = { endpoint: string; p256dh: string; auth: string };

const enc = new TextEncoder();

export function b64url(bytes: ArrayBuffer | Uint8Array) {
  const u = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (const b of u) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function deB64url(texto: string) {
  const base = texto.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(base + "===".slice((base.length + 3) % 4));
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function juntar(...partes: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const total = partes.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(new ArrayBuffer(total));
  let i = 0;
  for (const p of partes) {
    out.set(p, i);
    i += p.length;
  }
  return out;
}

async function hmac(chave: Uint8Array<ArrayBuffer>, dados: Uint8Array<ArrayBuffer>) {
  const k = await crypto.subtle.importKey("raw", chave, { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, dados));
}

export async function gerarChavesVapid(): Promise<ChavesVapid> {
  const par = (await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, [
    "sign",
    "verify",
  ])) as CryptoKeyPair;
  const jwk = await crypto.subtle.exportKey("jwk", par.privateKey);
  const bruta = await crypto.subtle.exportKey("raw", par.publicKey);
  return { publica: b64url(bruta), jwk };
}

async function jwtVapid(endpoint: string, chaves: ChavesVapid, assunto: string) {
  const aud = new URL(endpoint).origin;
  const cabecalho = b64url(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const corpo = b64url(
    enc.encode(
      JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: assunto }),
    ),
  );
  const chave = await crypto.subtle.importKey(
    "jwk",
    { ...chaves.jwk, key_ops: ["sign"] },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const assinatura = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    chave,
    enc.encode(`${cabecalho}.${corpo}`),
  );
  return `${cabecalho}.${corpo}.${b64url(assinatura)}`;
}

/** Cifra o conteúdo para uma inscrição (aes128gcm, um registro só). */
export async function cifrarConteudo(inscricao: InscricaoPush, texto: string) {
  const uaPublica = deB64url(inscricao.p256dh);
  const segredo = deB64url(inscricao.auth);
  const local = (await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, [
    "deriveBits",
  ])) as CryptoKeyPair;
  const asPublica = new Uint8Array(await crypto.subtle.exportKey("raw", local.publicKey));
  const chaveUa = await crypto.subtle.importKey(
    "raw",
    uaPublica,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );
  const ecdh = new Uint8Array(
    await crypto.subtle.deriveBits({ name: "ECDH", public: chaveUa }, local.privateKey, 256),
  );
  const prkChave = await hmac(segredo, ecdh);
  const info = juntar(enc.encode("WebPush: info\0"), uaPublica, asPublica, new Uint8Array([1]));
  const ikm = await hmac(prkChave, info);
  const sal = crypto.getRandomValues(new Uint8Array(16));
  const prk = await hmac(sal, ikm);
  const cek = (
    await hmac(prk, juntar(enc.encode("Content-Encoding: aes128gcm\0"), new Uint8Array([1])))
  ).slice(0, 16);
  const nonce = (
    await hmac(prk, juntar(enc.encode("Content-Encoding: nonce\0"), new Uint8Array([1])))
  ).slice(0, 12);
  const chaveAes = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const claro = juntar(enc.encode(texto), new Uint8Array([2]));
  const cifrado = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, chaveAes, claro),
  );
  const rs = new Uint8Array([0, 0, 16, 0]);
  return juntar(sal, rs, new Uint8Array([asPublica.length]), asPublica, cifrado);
}

export async function enviarPush(
  inscricao: InscricaoPush,
  conteudo: object,
  chaves: ChavesVapid,
  opcoes: { ttl: number; urgente: boolean; topico?: string },
): Promise<number> {
  const corpo = await cifrarConteudo(inscricao, JSON.stringify(conteudo));
  const jwt = await jwtVapid(inscricao.endpoint, chaves, "mailto:contato@cortai.dev");
  const cabecalhos: Record<string, string> = {
    "Content-Encoding": "aes128gcm",
    "Content-Type": "application/octet-stream",
    TTL: String(opcoes.ttl),
    Urgency: opcoes.urgente ? "high" : "normal",
    Authorization: `vapid t=${jwt}, k=${chaves.publica}`,
  };
  if (opcoes.topico)
    cabecalhos["Topic"] = opcoes.topico.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 32);
  try {
    const resposta = await fetch(inscricao.endpoint, {
      method: "POST",
      headers: cabecalhos,
      body: corpo,
    });
    return resposta.status;
  } catch {
    return 0;
  }
}
