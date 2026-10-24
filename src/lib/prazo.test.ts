import { afterEach, describe, expect, it, vi } from "vitest";

import { comPrazo, PrazoEsgotado } from "./prazo";

afterEach(() => {
  vi.useRealTimers();
});

describe("comPrazo", () => {
  it("retorna o resultado normal e limpa o temporizador", async () => {
    vi.useFakeTimers();

    await expect(comPrazo(Promise.resolve("ok"), 1_000, "carregar dados")).resolves.toBe("ok");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("rejeita quando uma operação nunca termina", async () => {
    vi.useFakeTimers();
    const pendente = new Promise<string>(() => undefined);
    const resultado = expect(comPrazo(pendente, 500, "carregar a página")).rejects.toThrow(
      "Tempo esgotado ao carregar a página.",
    );

    await vi.advanceTimersByTimeAsync(500);
    await resultado;
  });

  it("expõe um tipo específico para diferenciar timeout de falta de permissão", async () => {
    vi.useFakeTimers();
    const pendente = new Promise<string>(() => undefined);
    const resultado = expect(comPrazo(pendente, 250, "validar acesso")).rejects.toBeInstanceOf(
      PrazoEsgotado,
    );

    await vi.advanceTimersByTimeAsync(250);
    await resultado;
  });
});
