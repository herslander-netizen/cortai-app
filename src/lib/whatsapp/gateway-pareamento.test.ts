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

  it("sem código depois das tentativas: erro claro, sem ficar preso", async () => {
    evolutionFalsa([{ pairingCode: null }, { pairingCode: null }, { pairingCode: null }, {}]);
    await expect(
      gatewayDoProvedor("evolution").obterCodigoDePareamento("s1", "5579991787208"),
    ).rejects.toThrow("O WhatsApp não devolveu o código");
  });
});
