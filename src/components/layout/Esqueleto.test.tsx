import { readFileSync } from "node:fs";
import { act } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";

import {
  EsqueletoAgenda,
  EsqueletoCascoAdmin,
  EsqueletoFormulario,
  EsqueletoPaginaPublica,
} from "./Esqueleto";

describe("padrão de carregamento", () => {
  it.each([
    ["agenda", <EsqueletoAgenda />],
    ["formulário", <EsqueletoFormulario />],
    ["admin", <EsqueletoCascoAdmin />],
    ["página pública", <EsqueletoPaginaPublica />],
  ])("anuncia uma única região acessível em %s", (_, componente) => {
    const html = renderToStaticMarkup(componente);
    expect(html.match(/role="status"/g)).toHaveLength(1);
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain(">Carregando<");
  });

  it("sincroniza o brilho, atrasa a entrada e respeita movimento reduzido", () => {
    const css = readFileSync("src/styles.css", "utf8");
    expect(css).toContain("background-attachment: fixed");
    expect(css).toContain("animation: esqueleto-aparecer 150ms");
    expect(css).toMatch(
      /prefers-reduced-motion: reduce[\s\S]*\.esqueleto-barra[\s\S]*animation: none/,
    );
  });

  it("troca a espera longa por uma mensagem com nova tentativa", () => {
    const host = document.createElement("div");
    const root = createRoot(host);
    vi.useFakeTimers();
    act(() => root.render(<EsqueletoFormulario />));
    act(() => vi.advanceTimersByTime(10_000));
    expect(host.textContent).toContain("Não conseguimos carregar agora.");
    expect(host.textContent).toContain("Tentar de novo");
    act(() => root.unmount());
    vi.useRealTimers();
  });
});
