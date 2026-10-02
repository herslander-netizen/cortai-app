import { describe, expect, it } from "vitest";
import { extrasDoPedido, pareceUmPedidoDeHorario } from "./entendimento-whatsapp";

const ctx = {
  hoje: "2026-10-02",
  servicos: [{ id: "s1", nome: "Pézinho", apelidos: ["pezinho"] }],
  profissionais: [
    { id: "p1", nome: "Davi" },
    { id: "p2", nome: "Lucas" },
  ],
};

describe("extrasDoPedido", () => {
  it("reconhece profissional e horário exato", () => {
    const r = extrasDoPedido("amanhã às 15h com davi", ctx);
    expect(r.profissionalId).toBe("p1");
    expect(r.horario).toBe("15:00");
  });
  it("reconhece apelido de serviço", () => {
    expect(extrasDoPedido("quero um pezinho", ctx).servicoId).toBe("s1");
  });
  it("não inventa nada sem dados", () => {
    const r = extrasDoPedido("oi tudo bem", ctx);
    expect(r).toEqual({
      servicoId: null,
      profissionalId: null,
      horario: null,
      temDiaOuHora: false,
    });
  });
  it("detecta pedido de horário sem verbo", () => {
    expect(pareceUmPedidoDeHorario("corte amanhã de tarde", ctx.hoje)).toBe(true);
    expect(pareceUmPedidoDeHorario("onde fica", ctx.hoje)).toBe(false);
  });
});
