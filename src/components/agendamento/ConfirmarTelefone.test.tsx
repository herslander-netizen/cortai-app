// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

const situacao = vi.fn();
vi.mock("@/lib/agendamento-publico.functions", () => ({
  situacaoDaConfirmacaoDoTelefone: (...args: unknown[]) => situacao(...args),
}));

import { ConfirmarTelefone } from "./ConfirmarTelefone";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const limpar: Array<() => void> = [];
afterEach(() => {
  while (limpar.length) limpar.pop()?.();
  situacao.mockReset();
});

const pedido = {
  verificacaoId: "6f1c1d4e-0000-4000-8000-000000000001",
  codigo: "123456",
  link: "https://wa.me/5511988887777?text=CODIGO%20123456",
};

async function montar(aoConfirmar: (id: string) => void, aoGerarOutro = () => {}) {
  const alvo = document.createElement("div");
  document.body.appendChild(alvo);
  const raiz = createRoot(alvo);
  limpar.push(() => act(() => raiz.unmount()));
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const props = {
    slug: "aurora",
    telefone: "11999990000",
    pedido,
    aoConfirmar,
    aoGerarOutro,
    aoFechar: () => {},
  };
  await act(async () => {
    raiz.render(
      createElement(QueryClientProvider, { client: qc }, createElement(ConfirmarTelefone, props)),
    );
  });
  // Re-renderiza com o mesmo pedido: a conclusão não pode repetir.
  await act(async () => {
    raiz.render(
      createElement(
        QueryClientProvider,
        { client: qc },
        createElement(ConfirmarTelefone, { ...props, aoConfirmar }),
      ),
    );
  });
  return document.body;
}

describe("ConfirmarTelefone", () => {
  it("mostra o código e o link do WhatsApp do negócio enquanto espera", async () => {
    situacao.mockResolvedValue({ situacao: "pendente" });
    const corpo = await montar(() => {});
    expect(corpo.textContent).toContain("CODIGO 123456");
    expect(corpo.textContent).toContain("Aguardando o código chegar");
    const link = corpo.querySelector<HTMLAnchorElement>(`a[href="${pedido.link}"]`);
    expect(link?.textContent).toContain("Enviar código pelo WhatsApp");
    expect(situacao).toHaveBeenCalledWith({
      data: { slug: "aurora", telefone: "11999990000", verificacaoId: pedido.verificacaoId },
    });
  });

  it("código chegou: conclui o horário uma vez só", async () => {
    situacao.mockResolvedValue({ situacao: "confirmado" });
    const aoConfirmar = vi.fn();
    await montar(aoConfirmar);
    expect(aoConfirmar).toHaveBeenCalledTimes(1);
    expect(aoConfirmar).toHaveBeenCalledWith(pedido.verificacaoId);
  });

  it("código expirou: oferece gerar outro", async () => {
    situacao.mockResolvedValue({ situacao: "expirado" });
    const aoGerarOutro = vi.fn();
    const corpo = await montar(() => {}, aoGerarOutro);
    expect(corpo.textContent).toContain("O código expirou");
    const botao = [...corpo.querySelectorAll("button")].find((b) =>
      b.textContent?.includes("Gerar outro código"),
    );
    await act(async () => botao?.click());
    expect(aoGerarOutro).toHaveBeenCalledTimes(1);
  });
});
