import { describe, expect, it } from "vitest";

import {
  clientePodeInformarPix,
  estadoDoTicket,
  etapaDoPagamento,
  ROTULO_DA_ETAPA_CLIENTE,
  ROTULO_DA_ETAPA_EQUIPE,
} from "./comanda-ticket";

describe("pagamento da comanda: duas visões, um status", () => {
  it("cliente informar o Pix não vira pago", () => {
    expect(estadoDoTicket("aguardando_confirmacao_pix", null)).toBe("pendente");
    expect(etapaDoPagamento("aguardando_confirmacao_pix")).toBe("pagamento_informado");
    expect(ROTULO_DA_ETAPA_CLIENTE.pagamento_informado).toBe("Aguardando confirmação");
    expect(ROTULO_DA_ETAPA_EQUIPE.pagamento_informado).toBe("Pagamento informado pelo cliente");
  });
  it("só a confirmação da equipe (status paga) vira pago", () => {
    expect(estadoDoTicket("paga", { status: "confirmado", estornado_em: null })).toBe("pago");
    expect(etapaDoPagamento("paga")).toBe("confirmado");
  });
  it("'Já paguei' só aparece para Pix aguardando pagamento", () => {
    expect(clientePodeInformarPix("aguardando_pagamento", "pix", "chave")).toBe(true);
    expect(clientePodeInformarPix("aguardando_confirmacao_pix", "pix", "chave")).toBe(false);
    expect(clientePodeInformarPix("paga", "pix", "chave")).toBe(false);
    expect(clientePodeInformarPix("aguardando_pagamento", "pix", null)).toBe(false);
  });
  it("cartão e dinheiro não ganham ação do cliente", () => {
    expect(clientePodeInformarPix("aguardando_pagamento", "cartao", "chave")).toBe(false);
    expect(clientePodeInformarPix("aguardando_pagamento", "dinheiro", "chave")).toBe(false);
    expect(clientePodeInformarPix("aguardando_pagamento", "fiado", "chave")).toBe(false);
  });
});
