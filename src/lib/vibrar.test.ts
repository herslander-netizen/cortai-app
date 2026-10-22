// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

import { PADROES_DE_VIBRACAO, vibrar } from "./vibrar";

const original = Object.getOwnPropertyDescriptor(navigator, "vibrate");
afterEach(() => {
  if (original) Object.defineProperty(navigator, "vibrate", original);
  else Reflect.deleteProperty(navigator, "vibrate");
});

function aparelho(vibrate: unknown, menos: boolean) {
  Object.defineProperty(navigator, "vibrate", { value: vibrate, configurable: true });
  window.matchMedia = ((q: string) => ({
    matches: menos,
    media: q,
  })) as unknown as typeof window.matchMedia;
}

describe("vibrar", () => {
  it("usa o padrão de cada tipo", () => {
    const v = vi.fn(() => true);
    aparelho(v, false);
    expect(vibrar("pressao")).toBe(true);
    expect(v).toHaveBeenLastCalledWith(PADROES_DE_VIBRACAO.pressao);
    vibrar("confirmar");
    expect(v).toHaveBeenLastCalledWith([10, 40, 15]);
  });

  it("não faz nada sem suporte ou com reduzir movimento", () => {
    aparelho(undefined, false);
    expect(vibrar("pressao")).toBe(false);
    const v = vi.fn(() => true);
    aparelho(v, true);
    expect(vibrar("confirmar")).toBe(false);
    expect(v).not.toHaveBeenCalled();
  });
});
