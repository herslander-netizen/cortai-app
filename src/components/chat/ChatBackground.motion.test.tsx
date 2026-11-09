// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";

const { preferencia } = vi.hoisted(() => ({ preferencia: { reduzir: false } }));
vi.mock("framer-motion", () => ({
  useReducedMotion: () => preferencia.reduzir,
}));

import { ChatBackground } from "./ChatShell";

describe("fundo do Chat público — movimento e imagem própria", () => {
  it("desliga o parallax contínuo ao respeitar reduzir movimento", () => {
    preferencia.reduzir = true;
    const html = renderToStaticMarkup(
      createElement(ChatBackground, { modo: "capa", capaUrl: "/minha-capa.webp", segmento: "salao" }),
    );
    expect(html).toContain('src="/minha-capa.webp"');
    expect(html).toContain("animation:none");
    expect(html).not.toContain("data-padrao-segmento");
    preferencia.reduzir = false;
  });

  it("não bloqueia a animação de capa quando não há preferência de redução", () => {
    preferencia.reduzir = false;
    const html = renderToStaticMarkup(
      createElement(ChatBackground, { modo: "capa", capaUrl: "/minha-capa.webp", segmento: "salao" }),
    );
    expect(html).not.toContain("animation:none");
  });

  it("usa ilustrações decorativas específicas do segmento sem foto de fundo", () => {
    preferencia.reduzir = true;
    const html = renderToStaticMarkup(
      createElement(ChatBackground, { modo: "capa", capaUrl: null, segmento: "estetica" }),
    );
    expect(html).toContain('data-padrao-segmento="estetica"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("pointer-events-none");
    expect(html).not.toContain('class="chat-fundo-img"');
    preferencia.reduzir = false;
  });
});
