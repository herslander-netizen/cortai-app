import { describe, expect, it } from "vitest";
import { limparFluxo } from "./estado";
import { classificar } from "./intencoes";
import { periodoCitado } from "./vocabulario";

const opcoes = { fuso: "America/Sao_Paulo", agora: new Date("2026-09-23T04:00:00.000Z") };

describe("intencoes deterministicas do WhatsApp", () => {
  it("reconhece o pedido real de horarios disponiveis", () => {
    expect(classificar("Quais os horários disponíveis?", opcoes).intencao).toBe("DISPONIBILIDADE");
  });

  it("reconhece pergunta simples sobre o nome da barbearia", () => {
    expect(classificar("Qual o nome da barbearia?", opcoes).intencao).toBe("BARBEARIA");
  });

  it("cobre endereco, funcionamento, servicos e preco antes do fallback", () => {
    expect(classificar("Onde fica?", opcoes).intencao).toBe("LOCALIZACAO");
    expect(classificar("Que horas abre?", opcoes).intencao).toBe("FUNCIONAMENTO");
    expect(classificar("Quais serviços vocês fazem?", opcoes).intencao).toBe("SERVICOS");
    expect(classificar("Quanto custa o corte?", opcoes).intencao).toBe("PRECO");
  });

  it("interpreta amanha as 15 no fuso configurado", () => {
    const resultado = classificar("Amanhã às 15", opcoes);
    expect(resultado.entidades.dia).toBe("2026-09-24");
    expect(resultado.entidades.periodo).toEqual({ deMinutos: 900, ateMinutos: 959 });
  });

  it("nao aceita hora invalida", () => {
    expect(periodoCitado("amanha as 29")).toBeNull();
  });

  it("interpreta numero somente no menu que esta ativo", () => {
    expect(classificar("3", { ...opcoes, totalDeOpcoes: 5 }).intencao).toBe("SELECAO");
    expect(classificar("o 2 por favor", { ...opcoes, totalDeOpcoes: 5 }).entidades.selecao).toBe(2);
    expect(classificar("3", { ...opcoes, totalDeOpcoes: 0 }).intencao).toBe("DESCONHECIDA");
  });

  it("nao confunde artigo indefinido com item do menu", () => {
    expect(classificar("quero um corte", { ...opcoes, totalDeOpcoes: 5 }).intencao).toBe("AGENDAR");
    expect(
      classificar("quanto custa um corte e barba", { ...opcoes, totalDeOpcoes: 5 }).intencao,
    ).toBe("PRECO");
    expect(classificar("segunda", { ...opcoes, totalDeOpcoes: 5 }).intencao).toBe(
      "DISPONIBILIDADE",
    );
  });

  it("limpa selecoes antigas ao voltar ao menu principal", () => {
    const limpo = limparFluxo({
      clienteId: "cliente-real",
      estado: "CHOOSING_DATE",
      servicoId: "servico-anterior",
      menuTipo: "servico",
      menuItens: [{ rotulo: "Corte", valor: "servico-anterior" }],
    });
    expect(limpo.clienteId).toBe("cliente-real");
    expect(limpo.servicoId).toBeNull();
    expect(limpo.menuItens).toBeNull();
  });
});
describe("ajustes obrigatorios", () => {
  it("'barbeiro' em pedido de agendamento nao transfere para humano", () => {
    expect(classificar("quero marcar com o barbeiro João amanhã", opcoes).intencao).not.toBe(
      "HUMANO",
    );
    expect(classificar("tem barbeiro livre hoje?", opcoes).intencao).not.toBe("HUMANO");
  });
  it("entende serviços de beleza e preserva corte na barbearia", () => {
    const unhas = classificar("quero fazer as unhas amanhã às 15h", {
      ...opcoes,
      segmento: "salao",
    });
    expect(unhas.intencao).toBe("AGENDAR");
    expect(unhas.entidades.servico).toBe("manicure");
    expect(unhas.entidades.dia).toBe("2026-09-24");
    expect(unhas.entidades.periodo).toEqual({ deMinutos: 900, ateMinutos: 959 });

    const escova = classificar("tem horário pra escova sábado?", { ...opcoes, segmento: "salao" });
    expect(escova.intencao).toBe("DISPONIBILIDADE");
    expect(escova.entidades.servico).toBe("escova");

    expect(
      classificar("quero fazer o cabelo", { ...opcoes, segmento: "salao" }).entidades.servico,
    ).toBeNull();
    expect(
      classificar("quero cortar o cabelo", { ...opcoes, segmento: "barbearia" }).entidades.servico,
    ).toBe("corte");
  });
});
