// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import { act } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";

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

  it("sincroniza o brilho da esquerda para a direita, atrasa a entrada e respeita movimento reduzido", () => {
    const css = readFileSync("src/styles.css", "utf8");
    expect(css).toContain("background-attachment: fixed");
    expect(css).toMatch(
      /@keyframes esqueleto-brilho\s*{\s*from\s*{\s*background-position: -100vw 0;\s*}\s*to\s*{\s*background-position: 100vw 0;/,
    );
    expect(css).toContain("animation: esqueleto-aparecer 150ms");
    expect(css).toMatch(
      /prefers-reduced-motion: reduce[\s\S]*\.esqueleto-barra[\s\S]*animation: none/,
    );
  });

  it("troca a espera longa por uma mensagem e usa a nova tentativa fornecida", () => {
    const host = document.createElement("div");
    const root = createRoot(host);
    const tentarDeNovo = vi.fn();
    vi.useFakeTimers();
    act(() => root.render(<EsqueletoFormulario onTentarDeNovo={tentarDeNovo} />));
    act(() => vi.advanceTimersByTime(10_000));
    expect(host.textContent).toContain("O carregamento está demorando mais que o esperado.");
    expect(host.textContent).toContain("Ainda estamos aguardando os dados.");
    expect(host.textContent).toContain("Tentar de novo");
    const botao = host.querySelector("button");
    expect(botao?.className).toContain("--botao-contorno");
    act(() => botao?.click());
    expect(tentarDeNovo).toHaveBeenCalledOnce();
    act(() => root.unmount());
    vi.useRealTimers();
  });
});
