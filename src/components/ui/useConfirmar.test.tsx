// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { useConfirmar } from "./useConfirmar";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let pedir: (() => Promise<boolean>) | null = null;

function Exemplo() {
  const [confirmar, dialogo] = useConfirmar();
  pedir = () => confirmar({ titulo: "Remover?", confirmar: "Remover" });
  return dialogo;
}

const limpar: Array<() => void> = [];
afterEach(() => {
  while (limpar.length) limpar.pop()?.();
  document.body.innerHTML = "";
});

async function montar() {
  const alvo = document.createElement("div");
  document.body.appendChild(alvo);
  const raiz = createRoot(alvo);
  limpar.push(() => act(() => raiz.unmount()));
  await act(async () => raiz.render(createElement(Exemplo)));
}

const botao = (texto: string) =>
  [...document.querySelectorAll("button")].find((b) => b.textContent === texto) as HTMLElement;

describe("useConfirmar", () => {
  it("resolve true ao confirmar", async () => {
    await montar();
    let resposta: Promise<boolean>;
    await act(async () => {
      resposta = pedir!();
    });
    expect(document.body.textContent).toContain("Remover?");
    await act(async () => botao("Remover").click());
    await expect(resposta!).resolves.toBe(true);
  });

  it("resolve false ao cancelar e fecha o diálogo", async () => {
    await montar();
    let resposta: Promise<boolean>;
    await act(async () => {
      resposta = pedir!();
    });
    await act(async () => botao("Cancelar").click());
    await expect(resposta!).resolves.toBe(false);
    expect(document.body.textContent).not.toContain("Remover?");
  });
});
