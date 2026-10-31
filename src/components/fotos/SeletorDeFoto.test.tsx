// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/fotos.functions", () => ({
  listarFotosDoNegocio: vi.fn(async () => [
    { path: "t/foto-1.jpg", url: "https://x/1.jpg", criado_em: null },
    { path: "t/foto-2.jpg", url: "https://x/2.jpg", criado_em: null },
  ]),
  enviarFotoDoNegocio: vi.fn(),
}));

import { enviarFotoDoNegocio } from "@/lib/fotos.functions";
import { ListaDeFotos, SeletorDeFoto } from "./SeletorDeFoto";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;
const limpar: Array<() => void> = [];
afterEach(() => {
  while (limpar.length) limpar.pop()?.();
  document.body.innerHTML = "";
});

function montar(el: React.ReactElement) {
  window.matchMedia ??= ((q: string) => ({
    matches: false,
    media: q,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    onchange: null,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
  const alvo = document.createElement("div");
  document.body.appendChild(alvo);
  const raiz = createRoot(alvo);
  limpar.push(() => act(() => raiz.unmount()));
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  act(() => raiz.render(createElement(QueryClientProvider, { client: qc }, el)));
  return alvo;
}
const esperar = () => act(async () => void (await new Promise((r) => setTimeout(r, 30))));

describe("fotos por galeria, sem campo de link", () => {
  it("o seletor não tem campo de texto e escolhe da galeria", async () => {
    const escolheu = vi.fn();
    const alvo = montar(
      createElement(SeletorDeFoto, {
        rotulo: "Foto do produto",
        previewUrl: null,
        temFoto: false,
        onEscolher: escolheu,
        onRemover: () => {},
      }),
    );
    expect(alvo.querySelector("input[type=text], input:not([type])")).toBeNull();
    const abrir = [...alvo.querySelectorAll("button")].find(
      (b) => b.textContent === "Escolher foto",
    );
    act(() => abrir!.click());
    await esperar();
    const fotos = document.querySelectorAll('button[aria-label="Escolher esta foto"]');
    expect(fotos).toHaveLength(2);
    expect(document.querySelector('input[type=file][accept*="image"]')).not.toBeNull();
    act(() => (fotos[1] as HTMLButtonElement).click());
    expect(escolheu).toHaveBeenCalledWith({ path: "t/foto-2.jpg", url: "https://x/2.jpg" });
  });

  it("a lista mostra 'Adicionar' só enquanto cabem fotos e remove pelo x", () => {
    const muda = vi.fn();
    const duas = [
      { valor: "t/a.jpg", url: "https://x/a.jpg" },
      { valor: "t/b.jpg", url: "https://x/b.jpg" },
    ];
    const alvo = montar(createElement(ListaDeFotos, { fotos: duas, max: 3, onChange: muda }));
    expect(alvo.querySelector('button[aria-label="Adicionar fotos"]')).not.toBeNull();
    act(() =>
      (alvo.querySelector('button[aria-label="Remover foto 1"]') as HTMLButtonElement).click(),
    );
    expect(muda).toHaveBeenCalledWith([duas[1]]);
  });

  it("no limite de fotos o quadro 'Adicionar' some", () => {
    const alvo = montar(
      createElement(ListaDeFotos, {
        fotos: [{ valor: "t/a.jpg", url: "https://x/a.jpg" }],
        max: 1,
        onChange: () => {},
      }),
    );
    expect(alvo.querySelector('button[aria-label="Adicionar fotos"]')).toBeNull();
  });

  it("foto nova do aparelho abre o ajuste (zoom e arrastar) antes de qualquer envio", async () => {
    // O jsdom não cria links de arquivo: a prévia do ajuste só precisa de um endereço qualquer.
    const criar = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:teste");
    const revogar = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    limpar.push(() => (criar.mockRestore(), revogar.mockRestore()));
    const alvo = montar(
      createElement(SeletorDeFoto, {
        rotulo: "Foto do produto",
        prefixo: "produto",
        previewUrl: null,
        temFoto: false,
        onEscolher: () => {},
        onRemover: () => {},
      }),
    );
    act(() =>
      [...alvo.querySelectorAll("button")].find((b) => b.textContent === "Escolher foto")!.click(),
    );
    await esperar();
    const entrada = document.querySelector("input[type=file]") as HTMLInputElement;
    const arquivo = new File(["x"], "produto.jpg", { type: "image/jpeg" });
    Object.defineProperty(entrada, "files", { value: [arquivo], configurable: true });
    act(() => entrada.dispatchEvent(new Event("change", { bubbles: true })));
    await esperar();
    const dialogo = document.querySelector(
      '[role="dialog"][aria-describedby="ajustador-imagem-dica"]',
    );
    expect(dialogo?.textContent).toContain("Ajustar foto");
    expect(
      dialogo?.querySelector('input[type="range"][aria-label="Nível de zoom"]'),
    ).not.toBeNull();
    expect(enviarFotoDoNegocio).not.toHaveBeenCalled();
    act(() =>
      [...dialogo!.querySelectorAll("button")].find((b) => b.textContent === "Cancelar")!.click(),
    );
    await esperar();
    expect(document.querySelector('[aria-describedby="ajustador-imagem-dica"]')).toBeNull();
    expect(enviarFotoDoNegocio).not.toHaveBeenCalled();
  });

  it("foto já escolhida pode ser reajustada; foto de profissional usa moldura redonda", () => {
    const alvo = montar(
      createElement(SeletorDeFoto, {
        rotulo: "Foto",
        prefixo: "profissional",
        previewUrl: "https://x/p.jpg",
        temFoto: true,
        onEscolher: () => {},
        onRemover: () => {},
      }),
    );
    expect(
      [...alvo.querySelectorAll("button")].some((b) => b.getAttribute("aria-label")?.startsWith("Ajustar")),
    ).toBe(true);
    expect(alvo.querySelector("button.rounded-full img")).not.toBeNull();
  });
});
