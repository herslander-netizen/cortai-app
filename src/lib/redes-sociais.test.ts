import { describe, expect, it } from "vitest";

import { rotuloDoStatus, urlDeAutorizacao } from "@/lib/redes-sociais";
import {
  VALIDADE_DO_ESTADO_MS,
  criarEstado,
  lerCookie,
  verificarEstado,
} from "@/lib/redes-sociais.server";

describe("urlDeAutorizacao", () => {
  const params = {
    clientId: "abc123",
    redirectUri: "https://cortai.dev/api/public/oauth/instagram",
    state: "tenant-1.assinatura",
  };

  it("instagram usa o diálogo da Meta com client_id e state", () => {
    const url = new URL(urlDeAutorizacao("instagram", params));
    expect(url.origin + url.pathname).toBe("https://www.facebook.com/v21.0/dialog/oauth");
    expect(url.searchParams.get("client_id")).toBe("abc123");
    expect(url.searchParams.get("state")).toBe("tenant-1.assinatura");
    expect(url.searchParams.get("response_type")).toBe("code");
  });

  it("tiktok usa client_key e o endpoint v2", () => {
    const url = new URL(urlDeAutorizacao("tiktok", params));
    expect(url.origin + url.pathname).toBe("https://www.tiktok.com/v2/auth/authorize/");
    expect(url.searchParams.get("client_key")).toBe("abc123");
    expect(url.searchParams.get("state")).toBe("tenant-1.assinatura");
  });
});

describe("estado assinado do OAuth", () => {
  const dados = { tenantId: "tenant-1", userId: "user-1", plataforma: "instagram" as const };
  const agora = 1_800_000_000_000;

  it("com o cookie do mesmo navegador, dentro do prazo, devolve negócio e pessoa", () => {
    const { state, nonce } = criarEstado(dados, "segredo", agora);
    expect(
      verificarEstado(state, "segredo", { plataforma: "instagram", nonceDoCookie: nonce }, agora),
    ).toEqual({ tenantId: "tenant-1", userId: "user-1" });
  });

  it("cada início gera um state e um nonce diferentes", () => {
    const a = criarEstado(dados, "segredo", agora);
    const b = criarEstado(dados, "segredo", agora);
    expect(a.state).not.toBe(b.state);
    expect(a.nonce).not.toBe(b.nonce);
  });

  it("sem o cookie, com cookie de outro início ou depois do prazo é rejeitado", () => {
    const { state, nonce } = criarEstado(dados, "segredo", agora);
    const outro = criarEstado(dados, "segredo", agora).nonce;
    const ok = { plataforma: "instagram" as const, nonceDoCookie: nonce };
    expect(verificarEstado(state, "segredo", { ...ok, nonceDoCookie: null }, agora)).toBeNull();
    expect(verificarEstado(state, "segredo", { ...ok, nonceDoCookie: outro }, agora)).toBeNull();
    expect(verificarEstado(state, "segredo", ok, agora + VALIDADE_DO_ESTADO_MS + 1)).toBeNull();
  });

  it("state de outra plataforma, adulterado ou com outro segredo é rejeitado", () => {
    const { state, nonce } = criarEstado(dados, "segredo", agora);
    const ok = { plataforma: "instagram" as const, nonceDoCookie: nonce };
    expect(verificarEstado(state, "segredo", { ...ok, plataforma: "tiktok" }, agora)).toBeNull();
    expect(verificarEstado(state, "outro-segredo", ok, agora)).toBeNull();
    const [corpo, assinatura] = state.split(".");
    const trocado = Buffer.from(
      JSON.stringify({ ...JSON.parse(Buffer.from(corpo!, "base64url").toString()), t: "tenant-2" }),
    ).toString("base64url");
    expect(verificarEstado(`${trocado}.${assinatura}`, "segredo", ok, agora)).toBeNull();
    expect(verificarEstado("lixo", "segredo", ok, agora)).toBeNull();
    expect(verificarEstado("", "segredo", ok, agora)).toBeNull();
  });
});

describe("lerCookie", () => {
  it("acha o cookie pelo nome exato", () => {
    expect(lerCookie("a=1; cortai_oauth_instagram=abc; b=2", "cortai_oauth_instagram")).toBe("abc");
    expect(lerCookie("xcortai_oauth_instagram=abc", "cortai_oauth_instagram")).toBeNull();
    expect(lerCookie(null, "cortai_oauth_instagram")).toBeNull();
  });
});

describe("rotuloDoStatus", () => {
  it("cobre todos os estados", () => {
    expect(rotuloDoStatus("conectada")).toBe("Conectada");
    expect(rotuloDoStatus("simulada")).toBe("Demonstração");
    expect(rotuloDoStatus("expirada")).toContain("reconecte");
    expect(rotuloDoStatus("erro")).toContain("Erro");
  });
});
