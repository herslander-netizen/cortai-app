import { describe, expect, it } from "vitest";
import { ehPerguntaDeAjuda, respostaDeAjuda } from "./ajuda-do-painel";
import { intencaoDe, ehPedidoDeAgendar } from "./modo-basico-nlu";

describe("ajuda do painel", () => {
  it("pergunta de como fazer não vira busca de cliente", () => {
    expect(intencaoDe("Como coloco um cliente na fila?")).toBe("como_fazer");
    expect(respostaDeAjuda("Como coloco um cliente na fila?")).toMatch(/Lista de espera/);
  });
  it("como agendo não dispara agendamento", () => {
    expect(ehPedidoDeAgendar("como agendo um cliente?")).toBe(false);
    expect(intencaoDe("agendar Ana amanhã às 15h")).toBe("agendar");
  });
  it("consulta continua consulta", () => {
    expect(ehPerguntaDeAjuda("como está a agenda hoje")).toBe(false);
    expect(intencaoDe("quais clientes chamam Leandro")).toBe("buscar_cliente");
    expect(intencaoDe("cliente na fila")).not.toBe("buscar_cliente");
  });
});
