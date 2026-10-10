// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Home } from "lucide-react";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, ...props }: { children: React.ReactNode; to: string }) =>
    createElement("a", { href: to, ...props }, children),
}));

import { CartaoSuporte } from "./CartaoSuporte";
import { GruposDoMenu } from "./GruposDoMenu";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const limpar: Array<() => void> = [];
afterEach(() => {
  while (limpar.length) limpar.pop()?.();
});
function montar(no: React.ReactElement) {
  const alvo = document.createElement("div");
  document.body.appendChild(alvo);
  const raiz = createRoot(alvo);
  limpar.push(() => act(() => raiz.unmount()));
  act(() => raiz.render(no));
  return alvo;
}

describe("cartão Suporte", () => {
  it("sem número configurado, não aparece", () => {
    expect(montar(createElement(CartaoSuporte, { link: null })).textContent).toBe("");
  });
  it("com número, abre o WhatsApp em outra aba", () => {
    const alvo = montar(createElement(CartaoSuporte, { link: "https://wa.me/5511987654321" }));
    const a = alvo.querySelector("a");
    expect(a?.getAttribute("href")).toBe("https://wa.me/5511987654321");
    expect(a?.getAttribute("rel")).toContain("noopener");
    expect(alvo.textContent).toContain("Atendimento humano no WhatsApp");
  });
});

describe("grupos do menu", () => {
  const grupos = [
    {
      titulo: "Negócio",
      rotulo: "Sua barbearia",
      itens: [{ label: "Serviços", to: "/barbeiro/servicos", icon: Home }],
    },
    { titulo: "Vazio", rotulo: "Vazio", itens: [] },
  ];
  it("grupo aberto mostra os itens; recolhido esconde; grupo sem itens some", () => {
    const aberto = montar(
      createElement(GruposDoMenu, {
        grupos,
        abertos: ["Negócio"],
        caminho: "/barbeiro",
        onAlternar: () => {},
        onNavegar: () => {},
      }),
    );
    expect(aberto.textContent).toContain("Sua barbearia");
    expect(aberto.textContent).toContain("Serviços");
    expect(aberto.textContent).not.toContain("Vazio");
    const recolhido = montar(
      createElement(GruposDoMenu, {
        grupos,
        abertos: [],
        caminho: "/barbeiro",
        onAlternar: () => {},
        onNavegar: () => {},
      }),
    );
    expect(recolhido.textContent).not.toContain("Serviços");
  });
  it("tocar no título alterna o grupo", () => {
    const onAlternar = vi.fn();
    const alvo = montar(
      createElement(GruposDoMenu, {
        grupos,
        abertos: ["Negócio"],
        caminho: "/barbeiro",
        onAlternar,
        onNavegar: () => {},
      }),
    );
    const titulo = alvo.querySelector<HTMLButtonElement>("button[aria-expanded]");
    act(() => titulo!.click());
    expect(onAlternar).toHaveBeenCalledWith("Negócio");
  });
});
