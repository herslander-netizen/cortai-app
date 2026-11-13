import { describe, expect, it } from "vitest";

import { estadoDaConversa, podeResponderAutomaticamente, type FatosDaConversa } from "./estado-da-conversa";

const agora = Date.parse("2026-11-13T12:00:00Z");
const base: FatosDaConversa = {
  status: "ativa",
  iaAtiva: true,
  modoHumano: false,
  modoHumanoAte: null,
  ultimaDirecao: "entrada",
  possuiSaidaRegistrada: true,
  naoLidas: 0,
};

describe("Central de Atendimento — status derivado sem inventar estado do banco", () => {
  it("conversa ativa e IA disponível mostra IA atendendo", () => {
    expect(estadoDaConversa(base, agora)).toBe("ia_atendendo");
  });

  it("sem saída observada, conversa recebida é nova", () => {
    expect(estadoDaConversa({ ...base, possuiSaidaRegistrada: false, naoLidas: 1 }, agora)).toBe("nova");
  });

  it("mensagem enviada espera o cliente, não presume que a IA respondeu", () => {
    expect(estadoDaConversa({ ...base, ultimaDirecao: "saida" }, agora)).toBe("aguardando_cliente");
  });

  it("controle humano definitivo vence flag de IA ativa", () => {
    expect(estadoDaConversa({ ...base, status: "humano", modoHumano: true }, agora)).toBe("atendimento_humano");
    expect(podeResponderAutomaticamente({ ...base, modoHumano: true }, agora)).toBe(false);
  });

  it("prazo humano futuro bloqueia IA, mesmo com modo_humano=false", () => {
    const pausa = { ...base, modoHumanoAte: "2026-11-13T14:00:00Z" };
    expect(estadoDaConversa(pausa, agora)).toBe("atendimento_humano");
    expect(podeResponderAutomaticamente(pausa, agora)).toBe(false);
  });

  it("prazo expirado não mantém humano artificialmente", () => {
    const expirada = { ...base, modoHumanoAte: "2026-11-13T11:00:00Z" };
    expect(estadoDaConversa(expirada, agora)).toBe("ia_atendendo");
    expect(podeResponderAutomaticamente(expirada, agora)).toBe(true);
  });

  it("encerrada é resolvida e nunca reativada só por mensagem recebida", () => {
    const encerrada = { ...base, status: "encerrada", modoHumano: true, iaAtiva: false };
    expect(estadoDaConversa(encerrada, agora)).toBe("resolvida");
    expect(podeResponderAutomaticamente(encerrada, agora)).toBe(false);
  });

  it("IA desligada não é rotulada como IA atendendo", () => {
    expect(estadoDaConversa({ ...base, iaAtiva: false }, agora)).toBe("nova");
    expect(podeResponderAutomaticamente({ ...base, iaAtiva: false }, agora)).toBe(false);
  });
});
