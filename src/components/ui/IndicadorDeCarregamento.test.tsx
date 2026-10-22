// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";

import { IndicadorDeCarregamento } from "./IndicadorDeCarregamento";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function montar(el: React.ReactElement) {
  const raiz = document.createElement("div");
  document.body.append(raiz);
  act(() => createRoot(raiz).render(el));
  return raiz;
}

describe("IndicadorDeCarregamento", () => {
  it("desenha a forma e avisa o leitor de tela", () => {
    const raiz = montar(<IndicadorDeCarregamento />);
    const svg = raiz.querySelector("svg")!;
    expect(svg.getAttribute("role")).toBe("status");
    expect(svg.getAttribute("width")).toBe("48");
    expect(raiz.querySelector("path")?.getAttribute("d")).toMatch(/^M.*Z$/);
  });

  it("some para o leitor de tela quando é decorativo", () => {
    const raiz = montar(<IndicadorDeCarregamento decorativo tamanho={22} />);
    const svg = raiz.querySelector("svg")!;
    expect(svg.getAttribute("role")).toBeNull();
    expect(svg.getAttribute("aria-hidden")).toBe("true");
  });
});
