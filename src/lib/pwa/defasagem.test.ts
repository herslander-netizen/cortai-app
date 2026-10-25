import { describe, expect, it } from "vitest";

import { buscarBuildPublicado, estaDefasado } from "./defasagem";

const json = (corpo: unknown, tipo = "application/json") =>
  new Response(JSON.stringify(corpo), { headers: { "content-type": tipo } });

describe("defasagem da publicação", () => {
  it("só há defasagem quando as duas identidades existem e diferem", () => {
    expect(estaDefasado("abc", "abc")).toBe(false);
    expect(estaDefasado("abc", "def")).toBe(true);
    expect(estaDefasado(null, "def")).toBe(false);
    expect(estaDefasado("abc", null)).toBe(false);
  });

  it("lê a identidade publicada e ignora respostas que não são o arquivo", async () => {
    expect(await buscarBuildPublicado((async () => json({ id: "x1" })) as typeof fetch)).toBe("x1");
    // O servidor devolve a página HTML quando o arquivo não existe: não é identidade.
    expect(
      await buscarBuildPublicado((async () => json({ id: "x1" }, "text/html")) as typeof fetch),
    ).toBeNull();
    expect(
      await buscarBuildPublicado((async () => new Response("", { status: 404 })) as typeof fetch),
    ).toBeNull();
    expect(
      await buscarBuildPublicado((async () => {
        throw new Error("rede");
      }) as typeof fetch),
    ).toBeNull();
  });
});
