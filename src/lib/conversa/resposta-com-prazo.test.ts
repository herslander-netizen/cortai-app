import { afterEach, describe, expect, it, vi } from "vitest";
import { respostaComPrazo } from "./resposta-com-prazo";

describe("respostaComPrazo", () => {
  afterEach(() => vi.useRealTimers());

  it("repassa respostas prontas", async () => {
    expect(await respostaComPrazo(Promise.resolve("ok"), 100)).toBe("ok");
  });

  it("recupera o chat quando a chamada fica pendurada", async () => {
    vi.useFakeTimers();
    const pendurada = new Promise<string>(() => undefined);
    const resposta = respostaComPrazo(pendurada, 80);
    await vi.advanceTimersByTimeAsync(80);
    expect(await resposta).toBeNull();
  });

  it("falha de rede também libera a conversa", async () => {
    expect(await respostaComPrazo(Promise.reject(new Error("sem rede")), 100)).toBeNull();
  });
});
