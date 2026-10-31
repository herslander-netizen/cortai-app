// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

const fn = vi.hoisted(() => ({
  salvar: vi.fn(async () => ({})),
  pagar: vi.fn(async () => ({})),
}));

vi.mock("@tanstack/react-start", () => ({ useServerFn: (f: unknown) => f }));
vi.mock("@/components/comanda/FolhaDoTicket", () => ({ ConteudoDoTicket: () => null }));
vi.mock("@/components/cliente-perfil/FotoDoCorte", () => ({ FotoDoCorte: () => null }));
vi.mock("@/lib/financeiro.functions", () => ({
  getFechamentoComanda: vi.fn(async () => ({
    comanda: {
      id: "c1",
      numero: 42,
      status: "aberta",
      forma_escolhida: null,
      cliente_id: "x",
      agendamento_id: "a",
      clientes: { nome: "Joao Silva", telefone: "11999990000" },
      profissionais: { nome: "Lucas Joao" },
      agendamentos: { inicio: "2026-10-31T08:00:00Z" },
    },
    itens: [
      {
        tipo: "servico",
        servico_id: "s1",
        produto_id: null,
        descricao: "Cabelo",
        quantidade: 1,
        valor_unitario_centavos: 5000,
        comissao_percentual: 50,
      },
    ],
    servicos: [{ id: "s1", nome: "Cabelo", preco_centavos: 5000 }],
    produtos: [],
    maisVendidos: [],
    config: { pix_ativo: false, pix_chave: null },
    plano: { creditos: 0, reservado: false },
    fiadoDisponivel: 0,
    podeReceber: true,
    segmento: "outro",
  })),
  salvarComanda: fn.salvar,
  pagarComanda: fn.pagar,
  identificarClienteAvulso: vi.fn(),
  enviarParaRecepcao: vi.fn(),
  pagarComPlano: vi.fn(),
  getSugestaoRetorno: vi.fn(async () => null),
  criarRetorno: vi.fn(),
}));

import { FechamentoComanda } from "./FechamentoComanda";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;
const limpar: Array<() => void> = [];
afterEach(() => {
  while (limpar.length) limpar.pop()?.();
  document.body.innerHTML = "";
});
const esperar = () => act(async () => void (await new Promise((r) => setTimeout(r, 30))));
const botao = (nome: string) =>
  [...document.querySelectorAll<HTMLElement>("button")].find(
    (b) => b.textContent?.trim() === nome || b.getAttribute("aria-label") === nome,
  );

describe("cobrança em duas etapas, como no Figaro (vídeo do dono, 31/10)", () => {
  it("escolher a forma não registra nada; só 'Confirmar pagamento' paga, com a mesma ação de antes", async () => {
    const alvo = document.createElement("div");
    document.body.appendChild(alvo);
    const raiz = createRoot(alvo);
    limpar.push(() => act(() => raiz.unmount()));
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    act(() =>
      raiz.render(
        createElement(
          QueryClientProvider,
          { client: qc },
          createElement(FechamentoComanda, {
            agendamentoId: "a",
            onFechar: () => {},
            onConcluido: () => {},
          }),
        ),
      ),
    );
    await esperar();
    expect(document.body.textContent).toContain("Checkout");
    expect(document.body.textContent).toContain("Total a cobrar");
    // Sem botão de forma na primeira etapa: nada é pago com um toque.
    expect(botao("Pix")).toBeUndefined();

    act(() => botao("Escolher pagamento")!.click());
    await esperar();
    const dinheiro = document.querySelector<HTMLElement>('[role="radio"][aria-checked="false"]')!;
    expect(dinheiro.textContent).toContain("Dinheiro");
    act(() => dinheiro.click());
    await esperar();
    expect(fn.pagar).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain("Valor exato");

    await act(async () => botao("Confirmar pagamento")!.click());
    await esperar();
    expect(fn.salvar).toHaveBeenCalledTimes(1);
    expect(fn.pagar).toHaveBeenCalledWith({
      data: { comandaId: "c1", forma: "dinheiro", prepararPix: false },
    });
  });
});
