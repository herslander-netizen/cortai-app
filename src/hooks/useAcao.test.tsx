// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useAcao } from "./useAcao";
import { useSucessoDoBotao } from "./useSucessoDoBotao";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let acao: ReturnType<typeof useAcao>;
let botao: ReturnType<typeof useSucessoDoBotao>;
function Exemplo() {
  acao = useAcao();
  botao = useSucessoDoBotao();
  return null;
}

let desmontar = () => {};
beforeEach(() => {
  vi.useFakeTimers();
  const raiz = createRoot(document.createElement("div"));
  act(() => raiz.render(createElement(Exemplo)));
  desmontar = () => act(() => raiz.unmount());
});
afterEach(() => {
  desmontar();
  vi.useRealTimers();
});

describe("✓ do botão depois de salvar (Figaro, 700 ms)", () => {
  it("useAcao: concluiu só depois de sucesso e por 700 ms", async () => {
    await act(() => acao.executar("salvar", async () => 1));
    expect(acao.concluiu("salvar")).toBe(true);
    expect(acao.concluiu("outra")).toBe(false);
    act(() => vi.advanceTimersByTime(699));
    expect(acao.concluiu("salvar")).toBe(true);
    act(() => vi.advanceTimersByTime(1));
    expect(acao.concluiu("salvar")).toBe(false);
  });

  it("useAcao: com erro nunca mostra ✓", async () => {
    await act(() =>
      acao.executar("salvar", async () => {
        throw new Error("falhou");
      }),
    );
    expect(acao.concluiu("salvar")).toBe(false);
    expect(acao.estaEm("salvar")).toBe(false);
  });

  it("useSucessoDoBotao: confirmar liga por 700 ms", () => {
    expect(botao.sucesso).toBe(false);
    act(() => botao.confirmar());
    expect(botao.sucesso).toBe(true);
    act(() => vi.advanceTimersByTime(700));
    expect(botao.sucesso).toBe(false);
  });
});
