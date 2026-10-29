// @vitest-environment jsdom
import type { QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  INTERVALO_MINIMO_RETORNO_AGENDA_MS,
  registrarAtualizacaoAoRetomarAgenda,
} from "./atualizacao-ao-voltar";

let visibilidade: DocumentVisibilityState = "visible";
const limpezas: Array<() => void> = [];

function configurarVisibilidade() {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => visibilidade,
  });
}

function criarCliente() {
  const invalidateQueries = vi.fn().mockResolvedValue(undefined);
  return {
    client: { invalidateQueries } as unknown as QueryClient,
    invalidateQueries,
  };
}

function retomarPelaVisibilidade() {
  visibilidade = "hidden";
  document.dispatchEvent(new Event("visibilitychange"));
  visibilidade = "visible";
  document.dispatchEvent(new Event("visibilitychange"));
}

function retomarPeloFoco() {
  window.dispatchEvent(new Event("blur"));
  window.dispatchEvent(new Event("focus"));
}

afterEach(() => {
  for (const limpar of limpezas.splice(0).reverse()) limpar();
  vi.useRealTimers();
  vi.restoreAllMocks();
  delete (document as unknown as { visibilityState?: DocumentVisibilityState }).visibilityState;
  visibilidade = "visible";
});

describe("atualização da Agenda ao retomar o app", () => {
  it("invalida agenda e período depois de voltar do segundo plano", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-29T10:00:00Z"));
    configurarVisibilidade();
    visibilidade = "hidden";
    const { client, invalidateQueries } = criarCliente();
    limpezas.push(registrarAtualizacaoAoRetomarAgenda(client));

    visibilidade = "visible";
    document.dispatchEvent(new Event("visibilitychange"));

    expect(invalidateQueries).toHaveBeenCalledTimes(2);
    expect(invalidateQueries).toHaveBeenNthCalledWith(1, { queryKey: ["agenda-dia"] });
    expect(invalidateQueries).toHaveBeenNthCalledWith(2, { queryKey: ["agenda-periodo"] });
  });

  it("respeita o intervalo mínimo entre eventos de retomada", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-29T10:00:00Z"));
    configurarVisibilidade();
    const { client, invalidateQueries } = criarCliente();
    limpezas.push(registrarAtualizacaoAoRetomarAgenda(client));

    retomarPeloFoco();
    expect(invalidateQueries).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(INTERVALO_MINIMO_RETORNO_AGENDA_MS - 1);
    retomarPeloFoco();
    expect(invalidateQueries).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(1);
    retomarPelaVisibilidade();
    expect(invalidateQueries).toHaveBeenCalledTimes(4);
  });

  it("compartilha listeners e não refaz a atualização a cada componente montado", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-29T10:00:00Z"));
    configurarVisibilidade();
    const { client, invalidateQueries } = criarCliente();
    const limpar1 = registrarAtualizacaoAoRetomarAgenda(client);
    const limpar2 = registrarAtualizacaoAoRetomarAgenda(client);
    limpezas.push(limpar1, limpar2);

    retomarPeloFoco();
    expect(invalidateQueries).toHaveBeenCalledTimes(2);

    limpar1();
    limpar1(); // cleanup repetido não pode soltar o listener do segundo componente.
    vi.advanceTimersByTime(INTERVALO_MINIMO_RETORNO_AGENDA_MS);
    retomarPeloFoco();
    expect(invalidateQueries).toHaveBeenCalledTimes(4);

    limpar2();
    vi.advanceTimersByTime(INTERVALO_MINIMO_RETORNO_AGENDA_MS);
    retomarPeloFoco();
    expect(invalidateQueries).toHaveBeenCalledTimes(4);
  });
});
