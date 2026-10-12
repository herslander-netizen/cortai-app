// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { EditorDeServicos } from "./EditorDeServicos";
import type { ServicoEditavel } from "./servicos.types";

vi.mock("@tanstack/react-start", () => ({ useServerFn: () => vi.fn() }));

vi.mock("@/lib/assistente.functions", () => ({ interpretarServicos: vi.fn() }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { storage: { from: () => ({ upload: vi.fn() }) } },
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let host: HTMLDivElement | null = null;
let root: Root | null = null;

afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  host = null;
  root = null;
});

function montar(onChange = vi.fn(), semIA = true) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  const servicos: ServicoEditavel[] = [
    { nome: "Corte", categoria: "Cabelo", duracaoMin: 30, precoCentavos: 3000 },
  ];

  act(() =>
    root!.render(
      <EditorDeServicos servicos={servicos} onChange={onChange} semIA={semIA} profissionais={[]} />,
    ),
  );
  return onChange;
}

describe("EditorDeServicos", () => {
  it("mantém campos nomeados e alvos de toque de 48 px", () => {
    montar();
    const nome = host!.querySelector<HTMLInputElement>('input[aria-label="Nome do serviço"]')!;
    const remover = host!.querySelector<HTMLButtonElement>('button[aria-label="Remover Corte"]')!;

    expect(nome.className).toContain("min-h-12");
    expect(remover.className).toContain("size-12");
  });

  it("confirma a remoção antes de tirar o serviço da lista", async () => {
    const onChange = montar();
    const remover = host!.querySelector<HTMLButtonElement>('button[aria-label="Remover Corte"]')!;

    await act(async () => remover.click());
    expect(onChange).not.toHaveBeenCalled();
    expect(document.body.querySelector('[role="alertdialog"]')?.textContent).toContain(
      "Remover Corte?",
    );

    const confirmar = Array.from(document.body.querySelectorAll<HTMLButtonElement>("button")).find(
      (button) => button.textContent?.includes("Remover serviço"),
    )!;
    await act(async () => confirmar.click());
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it("dá um rótulo visível à descrição para configurar serviços com CortAI", () => {
    montar(vi.fn(), false);
    const rotulo = host!.querySelector<HTMLLabelElement>("label[for]");
    expect(rotulo?.textContent).toContain("Descreva os serviços");
    expect(host!.querySelector("textarea")?.id).toBe(rotulo?.htmlFor);
  });
});
