import { describe, expect, it } from "vitest";
import { lerCorpoLimitado } from "./read-limited-body.server";

describe("lerCorpoLimitado", () => {
  it("lê corpo válido respeitando o limite em bytes", async () => {
    const request = new Request("https://example.test/webhook", {
      method: "POST",
      body: "á",
    });
    await expect(lerCorpoLimitado(request, 2)).resolves.toEqual({ corpo: "á" });
  });

  it("conta bytes UTF-8, não caracteres", async () => {
    const request = new Request("https://example.test/webhook", {
      method: "POST",
      body: "áá",
    });
    await expect(lerCorpoLimitado(request, 3)).resolves.toEqual({ status: 413 });
  });

  it("rejeita UTF-8 inválido", async () => {
    const request = new Request("https://example.test/webhook", {
      method: "POST",
      body: new Uint8Array([0xff, 0xfe]),
    });
    await expect(lerCorpoLimitado(request, 10)).resolves.toEqual({ status: 400 });
  });

  it("rejeita requisição sem corpo", async () => {
    const request = new Request("https://example.test/webhook");
    await expect(lerCorpoLimitado(request, 10)).resolves.toEqual({ status: 400 });
  });

  it("rejeita limite inválido", async () => {
    const request = new Request("https://example.test/webhook", {
      method: "POST",
      body: "ok",
    });
    await expect(lerCorpoLimitado(request, -1)).rejects.toThrow(RangeError);
  });
});
