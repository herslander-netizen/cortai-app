import { describe, expect, it } from "vitest";

import { canvasParaJpg } from "./desenhar-ticket";

describe("canvasParaJpg", () => {
  it("gera a comanda em JPG (pedido do dono), com o nome do arquivo .jpg", async () => {
    let pedido: { tipo: string | undefined; qualidade: number | undefined } = {
      tipo: undefined,
      qualidade: undefined,
    };
    const canvas = {
      toBlob(cb: (b: Blob | null) => void, tipo?: string, qualidade?: number) {
        pedido = { tipo, qualidade };
        cb(new Blob(["x"], { type: tipo ?? "" }));
      },
    } as unknown as HTMLCanvasElement;
    const f = await canvasParaJpg(canvas, "comanda-AB12.jpg");
    expect(pedido.tipo).toBe("image/jpeg");
    expect(pedido.qualidade).toBeGreaterThan(0.8);
    expect(f?.type).toBe("image/jpeg");
    expect(f?.name).toBe("comanda-AB12.jpg");
  });

  it("devolve null se o navegador não gerar a imagem", async () => {
    const canvas = {
      toBlob: (cb: (b: Blob | null) => void) => cb(null),
    } as unknown as HTMLCanvasElement;
    expect(await canvasParaJpg(canvas, "x.jpg")).toBeNull();
  });
});
