// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

const gerar = vi.fn();
vi.mock("@tanstack/react-start", () => ({ useServerFn: () => gerar }));
vi.mock("@/lib/whatsapp.functions", () => ({ gerarCodigoPorTelefone: () => undefined }));

import { CodigoPorTelefone } from "./CodigoPorTelefone";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const limpar: Array<() => void> = [];
afterEach(() => {
  while (limpar.length) limpar.pop()?.();
  gerar.mockReset();
});

async function montar(aoGerar = () => {}) {
  const alvo = document.createElement("div");
  document.body.appendChild(alvo);
  const raiz = createRoot(alvo);
  limpar.push(() => act(() => raiz.unmount()));
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  await act(async () => {
    raiz.render(
      createElement(
        QueryClientProvider,
        { client: qc },
        createElement(CodigoPorTelefone, { tipo: "atendimento", aoGerar }),
      ),
    );
  });
  return alvo;
}

async function digitar(el: HTMLInputElement, valor: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  await act(async () => {
    setter.call(el, valor);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

describe("CodigoPorTelefone", () => {
  it("abre o formulário, gera o código e mostra em dois blocos", async () => {
    gerar.mockResolvedValue({
      codigo: "WZYEH1YY",
      expiraEm: new Date(Date.now() + 120_000).toISOString(),
      aviso: null,
    });
    const aoGerar = vi.fn();
    const alvo = await montar(aoGerar);
    await act(async () => alvo.querySelector<HTMLButtonElement>("button")!.click());
    const campo = alvo.querySelector<HTMLInputElement>("input[type=tel]")!;
    const botao = () => alvo.querySelector<HTMLButtonElement>("button[type=submit]")!;
    expect(botao().disabled).toBe(true);
    await digitar(campo, "(11) 99999-8888");
    expect(botao().disabled).toBe(false);
    await act(async () => botao().click());
    expect(gerar).toHaveBeenCalledWith({
      data: { tipo: "atendimento", telefone: "(11) 99999-8888" },
    });
    expect(alvo.textContent).toContain("WZYE-H1YY");
    expect(aoGerar).toHaveBeenCalled();
  });

  it("mostra o aviso do servidor quando não há código", async () => {
    gerar.mockResolvedValue({ codigo: null, expiraEm: null, aviso: "Confira o número." });
    const alvo = await montar();
    await act(async () => alvo.querySelector<HTMLButtonElement>("button")!.click());
    await digitar(alvo.querySelector<HTMLInputElement>("input[type=tel]")!, "11999998888");
    await act(async () => alvo.querySelector<HTMLButtonElement>("button[type=submit]")!.click());
    expect(alvo.textContent).toContain("Confira o número.");
    expect(alvo.textContent).not.toContain("expira em");
  });
});
