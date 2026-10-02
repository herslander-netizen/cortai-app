import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useTelaAcesa } from "./useTelaAcesa";

function navFalso() {
  const release = vi.fn(async () => undefined);
  const request = vi.fn(async () => ({ release, released: false }));
  return { nav: { wakeLock: { request } } as unknown as Navigator, request, release };
}

describe("useTelaAcesa", () => {
  it("pede ao ativar e solta ao desativar", async () => {
    const { nav, request, release } = navFalso();
    const { rerender } = renderHook(({ a }) => useTelaAcesa(a, nav), { initialProps: { a: true } });
    await waitFor(() => expect(request).toHaveBeenCalledWith("screen"));
    rerender({ a: false });
    await waitFor(() => expect(release).toHaveBeenCalled());
  });
  it("não pede quando inativo", () => {
    const { nav, request } = navFalso();
    renderHook(() => useTelaAcesa(false, nav));
    expect(request).not.toHaveBeenCalled();
  });
  it("sem suporte não dá erro", () => {
    expect(() => renderHook(() => useTelaAcesa(true, {} as Navigator))).not.toThrow();
  });
  it("engole recusa do aparelho", async () => {
    const request = vi.fn(async () => {
      throw new Error("negado");
    });
    const nav = { wakeLock: { request } } as unknown as Navigator;
    renderHook(() => useTelaAcesa(true, nav));
    await waitFor(() => expect(request).toHaveBeenCalled());
  });
});
