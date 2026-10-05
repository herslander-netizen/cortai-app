import { describe, expect, it } from "vitest";

import {
  barrasDoCodigo,
  codigoLegivel,
  estadoDoTicket,
  prefixoDeCodigo,
  rotuloDaForma,
  telefoneDoTicket,
} from "./comanda-ticket";

describe("comanda em ticket", () => {
  it("estado vem da comanda e do pagamento, não do código", () => {
    expect(estadoDoTicket("paga", { status: "confirmado", estornado_em: null })).toBe("pago");
    expect(estadoDoTicket("aguardando_confirmacao_pix", null)).toBe("pendente");
    expect(estadoDoTicket("aberta", null)).toBe("pendente");
    expect(estadoDoTicket("cancelada", null)).toBe("cancelado");
    expect(estadoDoTicket("paga", { status: "confirmado", estornado_em: "2026-10-03" })).toBe(
      "cancelado",
    );
  });

  it("código legível e pesquisável por código, parte ou data", () => {
    expect(codigoLegivel("01102026-0930-2000")).toBe("01102026 0930 2000");
    expect(prefixoDeCodigo("#01102026-0930-2000")).toBe("01102026-0930-2000");
    expect(prefixoDeCodigo("01102026 0930 2000")).toBe("01102026-0930-2000");
    expect(prefixoDeCodigo("01/10/2026")).toBe("01102026");
    expect(prefixoDeCodigo("Icaro")).toBeNull();
  });

  it("código de barras ITF tem início, pares de dígitos e fim", () => {
    const b = barrasDoCodigo("01102026-0930-2000");
    expect(b.length).toBe(4 + 16 * 5 + 3);
    expect(b[0]).toEqual({ barra: true, larga: false });
    expect(b.at(-3)).toEqual({ barra: true, larga: true });
  });

  it("forma de pagamento e telefone para exibir", () => {
    expect(rotuloDaForma("pix")).toBe("Pix");
    expect(rotuloDaForma("cartao")).toBe("Cartão");
    expect(rotuloDaForma(null)).toBe("A definir");
    expect(telefoneDoTicket("5579991787208")).toBe("+55 79 99178-7208");
    expect(telefoneDoTicket("avulso")).toBeNull();
  });
});

import { CHAVES_DA_COMANDA, invalidarComandas, rotuloDoEstado } from "./comanda-ticket";

describe("comanda nasce com o agendamento", () => {
  it("comanda recém-criada (aberta) e em atendimento ficam pendentes", () => {
    expect(estadoDoTicket("aberta", null)).toBe("pendente");
    expect(estadoDoTicket("em_atendimento", null)).toBe("pendente");
  });
  it("encerramento mostra o motivo sem perder o histórico", () => {
    expect(rotuloDoEstado("cancelado", "remarcacao")).toBe("Cancelado · Remarcado");
    expect(rotuloDoEstado("cancelado", "falta")).toBe("Não compareceu");
    expect(rotuloDoEstado("cancelado", "cancelamento")).toBe("Cancelado");
    expect(rotuloDoEstado("pago", "falta")).toBe("Pago");
    expect(rotuloDoEstado("pendente", null)).toBe("Pendente");
  });
  it("invalida todas as chaves da comanda/ticket", () => {
    const chamadas: unknown[] = [];
    invalidarComandas({ invalidateQueries: (f) => chamadas.push(f.queryKey) });
    expect(chamadas).toEqual([...CHAVES_DA_COMANDA]);
  });
});
