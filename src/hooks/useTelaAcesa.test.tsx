// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";

import { useTelaAcesa } from "./useTelaAcesa";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

function navFalso(falha = false) {
  const release = vi.fn(async () => undefined);
  const request = vi.fn(async () => {
    if (falha) throw new Error("negado");
    return { release, released: false };
  });
  return { nav: { wakeLock: { request } } as unknown as Navigator, request, release };
}

function Teste({ ativo, nav }: { ativo: boolean; nav: Navigator }) {
  useTelaAcesa(ativo, nav);
  return null;
}

async function montar(ativo: boolean, nav: Navigator) {
  const root = createRoot(document.createElement("div"));
  await act(async () => root.render(<Teste ativo={ativo} nav={nav} />));
  return root;
}

describe("useTelaAcesa", () => {
  it("pede ao entrar e solta ao sair", async () => {
    const { nav, request, release } = navFalso();
    const root = await montar(true, nav);
    expect(request).toHaveBeenCalledWith("screen");
    await act(async () => root.render(<Teste ativo={false} nav={nav} />));
    expect(release).toHaveBeenCalled();
    root.unmount();
  });

  it("solta em segundo plano e pede de novo ao voltar", async () => {
    const { nav, request, release } = navFalso();
    const root = await montar(true, nav);
    const vis = vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    await act(async () => void document.dispatchEvent(new Event("visibilitychange")));
    expect(release).toHaveBeenCalledTimes(1);
    vis.mockReturnValue("visible");
    await act(async () => void document.dispatchEvent(new Event("visibilitychange")));
    expect(request).toHaveBeenCalledTimes(2);
    vis.mockRestore();
    act(() => root.unmount());
  });

  it("não pede quando inativo", async () => {
    const { nav, request } = navFalso();
    const root = await montar(false, nav);
    expect(request).not.toHaveBeenCalled();
    act(() => root.unmount());
  });

  it("sem suporte ou recusa, segue sem erro", async () => {
    const r1 = await montar(true, {} as Navigator);
    const { nav, request } = navFalso(true);
    const r2 = await montar(true, nav);
    expect(request).toHaveBeenCalled();
    act(() => {
      r1.unmount();
      r2.unmount();
    });
  });
});
