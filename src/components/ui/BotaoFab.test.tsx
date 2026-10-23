// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BotaoFab } from "./BotaoFab";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let host: HTMLDivElement | null = null;
afterEach(() => {
  host?.remove();
  host = null;
});

function montar(props: Partial<React.ComponentProps<typeof BotaoFab>> = {}) {
  window.matchMedia ??= (() => ({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
  host = document.createElement("div");
  document.body.appendChild(host);
  const aoClicar = vi.fn();
  const raiz = createRoot(host);
  act(() => raiz.render(<BotaoFab rotulo="Continuar" onClick={aoClicar} {...props} />));
  return { aoClicar, botao: () => host!.querySelector("button")! };
}

describe("BotaoFab", () => {
  it("mostra o rótulo e chama a ação", () => {
    const { aoClicar, botao } = montar();
    expect(botao().textContent).toContain("Continuar");
    expect(botao().dataset["fab"]).toBe("estendido");
    act(() => botao().click());
    expect(aoClicar).toHaveBeenCalledTimes(1);
  });

  it("carregando vira círculo com a forma girando e não aceita toque", () => {
    const { aoClicar, botao } = montar({ carregando: true });
    expect(botao().dataset["fab"]).toBe("colapsado");
    expect(botao().getAttribute("aria-busy")).toBe("true");
    expect(botao().getAttribute("aria-label")).toBe("Continuar");
    expect(host!.querySelector("[role=progressbar]")).not.toBeNull();
    act(() => botao().click());
    expect(aoClicar).not.toHaveBeenCalled();
  });

  it("sucesso vira círculo com o visto", () => {
    const { botao } = montar({ sucesso: true });
    expect(botao().dataset["fab"]).toBe("colapsado");
    expect(botao().querySelector("svg.lucide-check")).not.toBeNull();
  });

  it("desabilitado não chama a ação", () => {
    const { aoClicar, botao } = montar({ desabilitado: true });
    expect(botao().disabled).toBe(true);
    act(() => botao().click());
    expect(aoClicar).not.toHaveBeenCalled();
  });
});
