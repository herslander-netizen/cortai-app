import { afterEach, describe, expect, it, vi } from "vitest";

import { handleMcpRequest } from "./handler.server";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("handler MCP — bordas de autenticação", () => {
  it("recusa pedido sem bearer antes de acessar o backend", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const response = await handleMcpRequest(new Request("https://cortai.example/mcp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} }),
    }));

    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toContain(
      "https://cortai.example/.well-known/oauth-protected-resource",
    );
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toMatchObject({ error: "unauthorized" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejeita métodos não suportados antes de autenticar", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const response = await handleMcpRequest(new Request("https://cortai.example/mcp", {
      method: "PUT",
      headers: { authorization: "Bearer token-falso" },
    }));

    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("GET, POST, DELETE");
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
