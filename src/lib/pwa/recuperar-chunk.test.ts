import { describe, expect, it } from "vitest";
import { classificarErro, ehErroDeChunk, JANELA_MS, podeRecuperar } from "./recuperar-chunk";

describe("recuperação de chunk", () => {
  it("reconhece falhas de importação dinâmica dos navegadores", () => {
    expect(ehErroDeChunk(new TypeError("Failed to fetch dynamically imported module: /assets/A.js"))).toBe(true);
    expect(ehErroDeChunk(new TypeError("Importing a module script failed."))).toBe(true);
    expect(ehErroDeChunk({ name: "ChunkLoadError", message: "x" })).toBe(true);
    expect(ehErroDeChunk(new Error("Loading chunk 12 failed."))).toBe(true);
    expect(ehErroDeChunk(new Error("Cannot read properties of undefined"))).toBe(false);
  });

  it("classifica os tipos de erro", () => {
    expect(classificarErro(new TypeError("Failed to fetch dynamically imported module"))).toBe("chunk");
    expect(classificarErro(new Error("Unauthorized"))).toBe("autenticacao");
    expect(classificarErro(new Error("Sem permissão para esta área"))).toBe("permissao");
    expect(classificarErro(new TypeError("Failed to fetch"))).toBe("rede");
    expect(classificarErro({ status: 503, message: "x" })).toBe("servidor");
    expect(classificarErro(new Error("algo"))).toBe("desconhecido");
  });

  it("trava recarga repetida por 30 s (sem loop)", () => {
    const agora = 1_000_000;
    const vazio = { getItem: () => null };
    const recente = { getItem: () => String(agora - 1000) };
    const antigo = { getItem: () => String(agora - JANELA_MS - 1) };
    expect(podeRecuperar(agora, vazio)).toBe(true);
    expect(podeRecuperar(agora, recente)).toBe(false);
    expect(podeRecuperar(agora, antigo)).toBe(true);
  });
});
