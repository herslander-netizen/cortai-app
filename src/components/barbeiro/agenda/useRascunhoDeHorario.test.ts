// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useRascunhoDeHorario } from "./useRascunhoDeHorario";

const fuso = "America/Sao_Paulo";
const agora = Date.UTC(2026, 9, 9, 15, 0); // 12:00 em São Paulo
const item = {
  id: "a1",
  inicio: "2026-10-09T17:00:00.000Z", // 14:00
  fim: "2026-10-09T17:30:00.000Z",
};

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

type Retorno = ReturnType<typeof useRascunhoDeHorario<typeof item>>;
const raizes: Array<() => void> = [];
afterEach(() => {
  while (raizes.length) raizes.pop()?.();
});

function montar(salvar = vi.fn().mockResolvedValue(true)) {
  const result = { current: null as unknown as Retorno };
  function Harness() {
    result.current = useRascunhoDeHorario({
      itens: [item],
      dia: "2026-10-09",
      fuso,
      agora,
      salvar,
      permanenciaDoSucesso: 0,
    });
    return null;
  }
  const raiz = createRoot(document.createElement("div"));
  act(() => raiz.render(createElement(Harness)));
  raizes.push(() => act(() => raiz.unmount()));
  return { result, salvar };
}

describe("rascunho de horário", () => {
  it("arrastar só propõe: o item exibido muda e nada é salvo", () => {
    const { result, salvar } = montar();
    act(() => result.current.propor("a1", 30));
    expect(result.current.aplicar([item])[0]?.inicio).toBe("2026-10-09T17:30:00.000Z");
    expect(salvar).not.toHaveBeenCalled();
  });
  it("voltar ao horário original deixa o rascunho aberto, mas sem nada para salvar", async () => {
    const { result, salvar } = montar();
    act(() => result.current.propor("a1", 30));
    act(() => result.current.propor("a1", -30));
    expect(result.current.rascunho).not.toBeNull();
    expect(result.current.semMudanca).toBe(true);
    await act(async () => result.current.confirmar());
    expect(salvar).not.toHaveBeenCalled();
  });
  it("toque longo sem arrastar entra no modo de edição sem mudança", () => {
    const { result } = montar();
    act(() => result.current.iniciar("a1"));
    expect(result.current.rascunho?.id).toBe("a1");
    expect(result.current.semMudanca).toBe(true);
  });
  it("para o passado: recusa com a mensagem e não salva", async () => {
    const { result, salvar } = montar();
    act(() => result.current.propor("a1", -180));
    expect(result.current.textoDoMotivo).toBe("Deve ser após agora");
    await act(async () => result.current.confirmar());
    expect(salvar).not.toHaveBeenCalled();
  });
  it("Salvar grava o novo horário com o aviso escolhido (começa desligado)", async () => {
    const { result, salvar } = montar();
    act(() => result.current.propor("a1", 30, 15));
    expect(result.current.rascunho?.avisar).toBe(false);
    act(() => result.current.definirAviso(true));
    await act(async () => result.current.confirmar());
    expect(salvar).toHaveBeenCalledWith(
      item,
      { inicio: "2026-10-09T17:30:00.000Z", fim: "2026-10-09T18:15:00.000Z" },
      true,
    );
    expect(result.current.rascunho).toBeNull();
  });
  it("com permanência, mostra o salvo por 1 s antes de fechar (Figaro)", async () => {
    vi.useFakeTimers();
    const salvar = vi.fn().mockResolvedValue(true);
    const result = { current: null as unknown as Retorno };
    function Harness() {
      result.current = useRascunhoDeHorario({
        itens: [item],
        dia: "2026-10-09",
        fuso,
        agora,
        salvar,
      });
      return null;
    }
    const alvo = document.createElement("div");
    const raiz = createRoot(alvo);
    act(() => raiz.render(createElement(Harness)));
    act(() => result.current.propor("a1", 30));
    let fim: Promise<void> | undefined;
    await act(async () => {
      fim = result.current.confirmar();
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(result.current.salvo).toBe(true);
    expect(result.current.rascunho).not.toBeNull();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
      await fim;
    });
    expect(result.current.salvo).toBe(false);
    expect(result.current.rascunho).toBeNull();
    act(() => raiz.unmount());
    vi.useRealTimers();
  });
  it("se salvar falhar, o rascunho continua para ajustar", async () => {
    const { result } = montar(vi.fn().mockResolvedValue(false));
    act(() => result.current.propor("a1", 30));
    await act(async () => result.current.confirmar());
    expect(result.current.rascunho).not.toBeNull();
  });
  it("Descartar volta ao original", () => {
    const { result } = montar();
    act(() => result.current.propor("a1", 30));
    act(() => result.current.descartar());
    expect(result.current.aplicar([item])[0]?.inicio).toBe(item.inicio);
  });
});
