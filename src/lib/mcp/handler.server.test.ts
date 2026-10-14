import { afterEach, describe, expect, it, vi } from "vitest";

import { consultarAgendamentosTenant, consultarServicosTenant, handleMcpRequest, validarPeriodoAgendamentos } from "./handler.server";

const { createClientMock, tenantLookupMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  tenantLookupMock: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({ createClient: createClientMock }));
vi.mock("@/lib/tenant", () => ({ tenantIdDoMembro: tenantLookupMock }));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  createClientMock.mockReset();
  tenantLookupMock.mockReset();
});

function mcpRequest(token = "test-token") {
  return new Request("https://cortai.example/mcp", {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} }),
  });
}

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
    expect(createClientMock).not.toHaveBeenCalled();
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
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it("recusa token inválido/expirado sem tentar resolver o negócio", async () => {
    vi.stubEnv("SUPABASE_URL", "https://backend.example");
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "publishable-test-key");
    createClientMock.mockReturnValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: { message: "Invalid JWT" } }) },
    });

    const response = await handleMcpRequest(mcpRequest("expired-token"));

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ error: "unauthorized" });
    expect(createClientMock).toHaveBeenCalledOnce();
    expect(tenantLookupMock).not.toHaveBeenCalled();
  });

  it("recusa usuário autenticado sem vínculo ativo com negócio", async () => {
    vi.stubEnv("SUPABASE_URL", "https://backend.example");
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "publishable-test-key");
    createClientMock.mockReturnValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-without-tenant" } }, error: null }) },
    });
    tenantLookupMock.mockRejectedValue(new Error("Sua conta ainda não está ligada a uma barbearia."));

    const response = await handleMcpRequest(mcpRequest());

    expect(response.status).toBe(403);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toMatchObject({ error: "forbidden" });
    expect(tenantLookupMock).toHaveBeenCalledWith({
      supabase: expect.any(Object),
      userId: "user-without-tenant",
    });
  });
});


describe("validação do período de agendamentos MCP", () => {
  it("aceita um período positivo de até 31 dias e normaliza datas", () => {
    const periodo = validarPeriodoAgendamentos("2026-10-01T10:00:00-03:00", "2026-11-01T10:00:00-03:00");

    expect(periodo.de.toISOString()).toBe("2026-10-01T13:00:00.000Z");
    expect(periodo.ate.toISOString()).toBe("2026-11-01T13:00:00.000Z");
  });

  it("rejeita fim igual ou anterior ao início", () => {
    expect(() => validarPeriodoAgendamentos("2026-10-01T10:00:00Z", "2026-10-01T10:00:00Z"))
      .toThrow("O fim precisa ser depois do início.");
    expect(() => validarPeriodoAgendamentos("2026-10-02T10:00:00Z", "2026-10-01T10:00:00Z"))
      .toThrow("O fim precisa ser depois do início.");
  });

  it("rejeita período superior a 31 dias", () => {
    expect(() => validarPeriodoAgendamentos("2026-10-01T00:00:00Z", "2026-11-01T00:00:00.001Z"))
      .toThrow("Período máximo de 31 dias.");
  });

  it("rejeita datas inválidas se chamado fora do schema MCP", () => {
    expect(() => validarPeriodoAgendamentos("não-é-data", "também-não"))
      .toThrow("Informe um período válido.");
  });
});


function queryMock(data: Record<string, unknown>[] = []) {
  const calls: Array<[string, ...unknown[]]> = [];
  const builder: any = {};
  for (const method of ["select", "eq", "gte", "lt", "order", "limit"]) {
    builder[method] = vi.fn((...args: unknown[]) => {
      calls.push([method, ...args]);
      return builder;
    });
  }
  builder.then = (resolve: (value: { data: Record<string, unknown>[]; error: null }) => unknown) =>
    Promise.resolve(resolve({ data, error: null }));
  return { builder, calls, db: { from: vi.fn(() => builder) } };
}

describe("isolamento por estabelecimento nas consultas MCP", () => {
  it("sempre filtra serviços pelo tenant autenticado e apenas ativos", async () => {
    const mock = queryMock([{ id: "s1", nome: "Corte", duracao_min: 30, preco_centavos: 4500, categoria: "Cabelo" }]);

    const result = await consultarServicosTenant(mock.db as any, "tenant-a");

    expect(mock.db.from).toHaveBeenCalledWith("servicos");
    expect(mock.calls).toContainEqual(["eq", "tenant_id", "tenant-a"]);
    expect(mock.calls).toContainEqual(["eq", "ativo", true]);
    expect(result).toEqual([{ id: "s1", nome: "Corte", duracaoMin: 30, precoReais: 45, categoria: "Cabelo" }]);
  });

  it("sempre filtra agendamentos pelo tenant, limita datas e quantidade", async () => {
    const mock = queryMock([{
      id: "a1",
      inicio: "2026-10-10T13:00:00.000Z",
      fim: "2026-10-10T13:30:00.000Z",
      status: "confirmado",
      valor_centavos: 4500,
      clientes: { nome: "Cliente teste" },
      servicos: { nome: "Corte" },
      profissionais: { nome: "Profissional teste" },
    }]);

    const result = await consultarAgendamentosTenant(
      mock.db as any,
      "tenant-b",
      "2026-10-10T10:00:00-03:00",
      "2026-10-11T10:00:00-03:00",
    );

    expect(mock.db.from).toHaveBeenCalledWith("agendamentos");
    expect(mock.calls).toContainEqual(["eq", "tenant_id", "tenant-b"]);
    expect(mock.calls).toContainEqual(["gte", "inicio", "2026-10-10T13:00:00.000Z"]);
    expect(mock.calls).toContainEqual(["lt", "inicio", "2026-10-11T13:00:00.000Z"]);
    expect(mock.calls).toContainEqual(["limit", 500]);
    expect(result[0]).toMatchObject({ id: "a1", cliente: "Cliente teste", servico: "Corte", profissional: "Profissional teste", valorReais: 45 });
  });

  it("não consulta o banco quando o período é inválido", async () => {
    const mock = queryMock();

    await expect(consultarAgendamentosTenant(
      mock.db as any,
      "tenant-b",
      "2026-10-10T10:00:00Z",
      "2026-11-11T10:00:00Z",
    )).rejects.toThrow("Período máximo de 31 dias.");
    expect(mock.db.from).not.toHaveBeenCalled();
  });
});
