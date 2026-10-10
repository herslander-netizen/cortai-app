// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { publicarAgora } from "./pilula-agora";
import { BotaoAgoraPrincipal } from "./BotaoAgoraPrincipal";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let raiz: Root | null = null;
let host: HTMLDivElement | null = null;

afterEach(() => {
  act(() => raiz?.unmount());
  publicarAgora({ lado: null, ir: null });
  host?.remove();
  raiz = null;
  host = null;
  vi.restoreAllMocks();
});

function prepararLargura(largura: number, reduzir = false) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn((query: string) => ({
      matches: query === "(max-width: 600px)" ? largura <= 600 : reduzir,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

async function montar(
  largura: number,
  visualizacao: "timeline" | "lista" = "timeline",
  onVisualizacao = vi.fn(),
  ehHoje = true,
  onHoje = vi.fn(),
  menuAberto = false,
  onAlternarMenu = vi.fn(),
) {
  prepararLargura(largura);
  host = document.createElement("div");
  document.body.appendChild(host);
  raiz = createRoot(host);
  await act(async () =>
    raiz?.render(
      <BotaoAgoraPrincipal
        visualizacao={visualizacao}
        onVisualizacao={onVisualizacao}
        ehHoje={ehHoje}
        onHoje={onHoje}
        menuAberto={menuAberto}
        onAlternarMenu={onAlternarMenu}
      />,
    ),
  );
  return { onVisualizacao, onHoje };
}

describe("BotaoAgoraPrincipal", () => {
  it("aparece em 390 px e não aparece em 1280 px", async () => {
    await montar(390);
    expect(host?.querySelector(".agenda-botao-agora-principal")).not.toBeNull();
    act(() => raiz?.unmount());
    raiz = null;
    host?.remove();
    host = null;
    await montar(1280);
    expect(document.querySelector(".agenda-botao-agora-principal")).toBeNull();
  });

  it("alterna entre Timeline e Lista", async () => {
    const { onVisualizacao } = await montar(390);
    const botao = host?.querySelector<HTMLButtonElement>('[aria-label="Mostrar Lista"]');
    act(() => botao?.click());
    expect(onVisualizacao).toHaveBeenCalledWith("lista");
    expect(botao?.querySelector("svg")).not.toBeNull();
  });

  it("mantém um único FAB e representa os estados fechado e aberto", async () => {
    const onAlternarMenu = vi.fn();
    await montar(390, "timeline", vi.fn(), true, vi.fn(), false, onAlternarMenu);
    const fab = host?.querySelector<HTMLButtonElement>("[data-acoes-agenda]");
    expect(host?.querySelectorAll("[data-acoes-agenda]")).toHaveLength(1);
    expect(fab?.getAttribute("aria-expanded")).toBe("false");
    expect(fab?.querySelector(".agenda-fab-icone-aberto")).toBeNull();
    act(() => fab?.click());
    expect(onAlternarMenu).toHaveBeenCalledOnce();

    await act(async () =>
      raiz?.render(
        <BotaoAgoraPrincipal
          visualizacao="timeline"
          onVisualizacao={vi.fn()}
          ehHoje
          onHoje={vi.fn()}
          menuAberto
          onAlternarMenu={onAlternarMenu}
        />,
      ),
    );
    const aberto = host?.querySelector<HTMLButtonElement>("[data-acoes-agenda]");
    expect(aberto?.getAttribute("aria-expanded")).toBe("true");
    expect(aberto?.getAttribute("aria-label")).toBe("Fechar ações da agenda");
    expect(aberto?.querySelector(".agenda-fab-icone-aberto")).not.toBeNull();
  });

  it("não monta controles quando o contexto da Agenda está oculto", async () => {
    prepararLargura(390);
    host = document.createElement("div");
    document.body.appendChild(host);
    raiz = createRoot(host);
    await act(async () =>
      raiz?.render(
        <BotaoAgoraPrincipal
          visualizacao="timeline"
          onVisualizacao={vi.fn()}
          ehHoje
          onHoje={vi.fn()}
          menuAberto={false}
          onAlternarMenu={vi.fn()}
          visivel={false}
        />,
      ),
    );
    expect(host?.querySelector("[data-acoes-agenda]")).toBeNull();
    expect(host?.querySelector(".agenda-botao-agora-principal")).toBeNull();
  });

  it("mantém cor e fundo da cápsula em todos os estados e solta o foco após toque", async () => {
    await montar(390);
    const estilos = readFileSync("src/styles.css", "utf8");
    expect(estilos).toContain(".agenda-botao-agora-principal button:hover,");
    expect(estilos).toContain(".agenda-botao-agora-principal button:focus-visible,");
    expect(estilos).toContain(".agenda-botao-agora-principal button:active {");
    expect(estilos).toMatch(
      /\.agenda-botao-agora-principal button:active \{[\s\S]*?background: transparent;[\s\S]*?color: var\(--paper\);/,
    );
    const botoes = Array.from(
      host?.querySelectorAll<HTMLButtonElement>(
        ".agenda-botao-agora-ir, .agenda-botao-agora-visualizacao",
      ) ?? [],
    );
    expect(botoes).toHaveLength(2);
    for (const botao of botoes) {
      const blur = vi.spyOn(botao, "blur");
      const toque = new MouseEvent("pointerup", { bubbles: true });
      Object.defineProperty(toque, "pointerType", { value: "touch" });
      act(() => {
        botao.focus();
        botao.dispatchEvent(toque);
      });
      expect(blur).toHaveBeenCalledOnce();
    }
  });

  it("leva ao agora na Timeline", async () => {
    const ir = vi.fn();
    publicarAgora({ lado: "visivel", ir });
    await montar(390);
    act(() => host?.querySelector<HTMLButtonElement>('[aria-label="Ir para agora"]')?.click());
    expect(ir).toHaveBeenCalledOnce();
  });

  it("mantém a Lista e leva ao primeiro atendimento aberto", async () => {
    const { onVisualizacao } = await montar(390, "lista");
    const rolar = vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
    const item = document.createElement("li");
    item.className = "agenda-item";
    vi.spyOn(item, "getBoundingClientRect").mockReturnValue({
      top: 240,
      bottom: 300,
      left: 0,
      right: 300,
      width: 300,
      height: 60,
      x: 0,
      y: 240,
      toJSON: () => ({}),
    });
    const painel = document.createElement("div");
    painel.id = "agenda-painel-visualizacao";
    painel.appendChild(item);
    document.body.appendChild(painel);
    const barra = document.createElement("header");
    barra.className = "management-header";
    Object.defineProperty(barra, "offsetHeight", { configurable: true, value: 56 });
    const cabecalho = document.createElement("div");
    cabecalho.className = "agenda-cabecalho-unico";
    Object.defineProperty(cabecalho, "offsetHeight", { configurable: true, value: 100 });
    document.body.append(barra, cabecalho);
    act(() => host?.querySelector<HTMLButtonElement>('[aria-label="Ir para agora"]')?.click());
    expect(onVisualizacao).not.toHaveBeenCalled();
    expect(rolar).toHaveBeenCalledWith({ top: 76, behavior: "smooth" });
    expect(240 - 76).toBe(164);
    barra.remove();
    cabecalho.remove();
    painel.remove();
  });

  it("fora de hoje volta para hoje antes de levar ao agora", async () => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);
      return 1;
    });
    const ir = vi.fn();
    publicarAgora({ lado: "visivel", ir });
    const onHoje = vi.fn();
    await montar(390, "timeline", vi.fn(), false, onHoje);
    act(() => host?.querySelector<HTMLButtonElement>('[aria-label="Ir para agora"]')?.click());
    expect(onHoje).toHaveBeenCalledOnce();
    expect(ir).not.toHaveBeenCalled();

    await act(async () =>
      raiz?.render(
        <BotaoAgoraPrincipal
          visualizacao="timeline"
          onVisualizacao={vi.fn()}
          ehHoje
          onHoje={onHoje}
          menuAberto={false}
          onAlternarMenu={vi.fn()}
        />,
      ),
    );
    expect(ir).toHaveBeenCalledOnce();
  });
});
