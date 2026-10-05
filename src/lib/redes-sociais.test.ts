import { describe, expect, it } from "vitest";

import { rotuloDoStatus, urlDeAutorizacao } from "@/lib/redes-sociais";
import { assinarEstado, verificarEstado } from "@/lib/redes-sociais.server";

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
  it("assinatura válida devolve o tenant", () => {
    const state = assinarEstado("tenant-1", "segredo");
    expect(verificarEstado(state, "segredo")).toBe("tenant-1");
  });

  it("state adulterado ou com outro segredo é rejeitado", () => {
    const state = assinarEstado("tenant-1", "segredo");
    expect(verificarEstado(state, "outro-segredo")).toBeNull();
    expect(verificarEstado("tenant-2." + state.split(".")[1], "segredo")).toBeNull();
    expect(verificarEstado("lixo", "segredo")).toBeNull();
    expect(verificarEstado("", "segredo")).toBeNull();
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
