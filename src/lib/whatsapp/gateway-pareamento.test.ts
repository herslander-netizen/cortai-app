import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { gatewayDoProvedor, pausaDoPareamento } from "./gateway.server";

/** Evolution falsa: devolve, em ordem, as respostas de /instance/connect e registra todas as chamadas. */
function evolutionFalsa(respostasDoConnect: unknown[]) {
  const chamadas: { metodo: string; caminho: string }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      const caminho = new URL(url).pathname + new URL(url).search;
      chamadas.push({ metodo: String(init.method), caminho });
      const corpo = caminho.startsWith("/instance/connect")
        ? (respostasDoConnect.shift() ?? {})
        : {};
      return new Response(JSON.stringify(corpo), { status: 200 });
    }),
  );
  return chamadas;
}

describe("código de pareamento por número (Evolution)", () => {
  beforeEach(() => {
    vi.stubEnv("EVOLUTION_API_URL", "https://evo.exemplo");
    vi.stubEnv("EVOLUTION_API_KEY", "chave");
    vi.spyOn(pausaDoPareamento, "ms").mockResolvedValue();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("instância livre: devolve o código na primeira tentativa, sem desconectar", async () => {
    const chamadas = evolutionFalsa([{ pairingCode: "WZYE-H1YY" }]);
    const r = await gatewayDoProvedor("evolution").obterCodigoDePareamento("s1", "5579991787208");
    expect(r.codigo).toBe("WZYEH1YY");
    expect(chamadas).toEqual([
      { metodo: "GET", caminho: "/instance/connect/s1?number=5579991787208" },
    ]);
  });

  it("QR já rodando (pairingCode null): fecha a tentativa por QR e pede de novo com o número", async () => {
    const chamadas = evolutionFalsa([
      { pairingCode: null, code: "2@qr", count: 15 },
      { pairingCode: null, code: "2@qr" },
      { pairingCode: "ABCD1234" },
    ]);
    const r = await gatewayDoProvedor("evolution").obterCodigoDePareamento("s1", "5579991787208");
    expect(r.codigo).toBe("ABCD1234");
    expect(chamadas.map((c) => `${c.metodo} ${c.caminho.split("?")[0]}`)).toEqual([
      "GET /instance/connect/s1",
      "DELETE /instance/logout/s1",
      "GET /instance/connect/s1",
      "GET /instance/connect/s1",
    ]);
  });

  it("código gerado vale o tempo de um QR (~45 s), não 2 minutos", async () => {
    evolutionFalsa([{ pairingCode: "WZYEH1YY" }]);
    const antes = Date.now();
    const r = await gatewayDoProvedor("evolution").obterCodigoDePareamento("s1", "557998181983");
    const segundos = (new Date(r.expiraEm).getTime() - antes) / 1000;
    expect(segundos).toBeGreaterThan(40);
    expect(segundos).toBeLessThanOrEqual(46);
  });

  it("sem código depois das tentativas: erro claro, sem ficar preso", async () => {
    evolutionFalsa([{ pairingCode: null }, { pairingCode: null }, { pairingCode: null }, {}]);
    await expect(
      gatewayDoProvedor("evolution").obterCodigoDePareamento("s1", "5579991787208"),
    ).rejects.toThrow("O WhatsApp não devolveu o código");
  });
});

/** Evolution falsa por caminho: estado da instância e o que o connect devolve. */
function evolutionComEstado(estado: string, connect: unknown) {
  const chamadas: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      const u = new URL(url);
      chamadas.push(`${String(init.method)} ${u.pathname}${u.search}`);
      const corpo = u.pathname.startsWith("/instance/connectionState")
        ? { instance: { state: estado } }
        : connect;
      return new Response(JSON.stringify(corpo), { status: 200 });
    }),
  );
  return chamadas;
}

describe("código em vigor (a Evolution troca a cada novo QR)", () => {
  beforeEach(() => {
    vi.stubEnv("EVOLUTION_API_URL", "https://evo.exemplo");
    vi.stubEnv("EVOLUTION_API_KEY", "chave");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("aguardando leitura: devolve o código atual, pedindo com o número", async () => {
    const chamadas = evolutionComEstado("connecting", { pairingCode: "FWN8JEMC", count: 25 });
    const r = await gatewayDoProvedor("evolution").codigoDePareamentoAtual("s1", "557998181983");
    expect(r).toEqual({ estado: "aguardando", codigo: "FWN8JEMC" });
    expect(chamadas).toEqual([
      "GET /instance/connectionState/s1",
      "GET /instance/connect/s1?number=557998181983",
    ]);
  });

  it("tentativa encerrada: não abre outra conexão", async () => {
    const chamadas = evolutionComEstado("close", {});
    const r = await gatewayDoProvedor("evolution").codigoDePareamentoAtual("s1", "557998181983");
    expect(r).toEqual({ estado: "encerrado" });
    expect(chamadas).toEqual(["GET /instance/connectionState/s1"]);
  });

  it("conectado: o status traz número e nome da conta pela ficha da instância", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        const u = new URL(url);
        const corpo = u.pathname.startsWith("/instance/connectionState")
          ? { instance: { state: "open" } }
          : [{ ownerJid: "557998181983:3@s.whatsapp.net", profileName: "Teste01" }];
        return new Response(JSON.stringify(corpo), { status: 200 });
      }),
    );
    const r = await gatewayDoProvedor("evolution").consultarStatus("s1");
    expect(r).toMatchObject({
      status: "conectado",
      numero: "557998181983",
      nomeExibicao: "Teste01",
    });
  });

  it("já conectou: avisa sem pedir código", async () => {
    const chamadas = evolutionComEstado("open", {});
    const r = await gatewayDoProvedor("evolution").codigoDePareamentoAtual("s1", "557998181983");
    expect(r).toEqual({ estado: "conectado" });
    expect(chamadas.filter((c) => c.includes("/instance/connect/"))).toEqual([]);
  });
});
