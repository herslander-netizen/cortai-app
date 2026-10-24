import { describe, expect, it } from "vitest";

import {
  caminhoDoNegocio,
  ehArquivoDeImagem,
  fotoValida,
  novoCaminhoDeFoto,
  tipoDaImagem,
} from "./fotos-do-negocio";

const T = "11111111-1111-4111-8111-111111111111";

describe("fotos do negócio", () => {
  it("aceita só caminhos da pasta do próprio negócio", () => {
    expect(caminhoDoNegocio(`${T}/produto-1.jpg`, T)).toBe(true);
    expect(caminhoDoNegocio(`22222222-2222-4222-8222-222222222222/produto-1.jpg`, T)).toBe(false);
    expect(caminhoDoNegocio(`${T}/../outro/x.jpg`, T)).toBe(false);
    expect(caminhoDoNegocio(`${T}/documento.pdf`, T)).toBe(false);
  });
  it("links https antigos continuam válidos; outros textos não", () => {
    expect(fotoValida("https://exemplo.com/a.png", T)).toBe(true);
    expect(fotoValida("javascript:alert(1)", T)).toBe(false);
    expect(fotoValida("foto.jpg", T)).toBe(false);
  });
  it("o caminho novo é do negócio, é imagem e muda a cada envio", () => {
    const a = novoCaminhoDeFoto(T, "produto", "jpg", 0.123456);
    const b = novoCaminhoDeFoto(T, "produto", "jpg", 0.654321);
    expect(caminhoDoNegocio(a, T)).toBe(true);
    expect(a).not.toBe(b);
    expect(ehArquivoDeImagem(a)).toBe(true);
  });
  it("reconhece JPEG, PNG e WebP pelos bytes e recusa o resto", () => {
    expect(tipoDaImagem(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]))).toBe("image/jpeg");
    expect(tipoDaImagem(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0]))).toBe("image/png");
    const webp = [..."RIFF"]
      .map((c) => c.charCodeAt(0))
      .concat(
        [0, 0, 0, 0],
        [..."WEBP"].map((c) => c.charCodeAt(0)),
      );
    expect(tipoDaImagem(Uint8Array.from(webp))).toBe("image/webp");
    expect(
      tipoDaImagem(new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'/>")),
    ).toBeNull();
    expect(tipoDaImagem(new TextEncoder().encode("GIF89a......"))).toBeNull();
  });
});
