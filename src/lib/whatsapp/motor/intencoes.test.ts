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

  it("interpreta amanha as 15 no fuso configurado", () => {
    const resultado = classificar("Amanhã às 15", opcoes);
    expect(resultado.entidades.dia).toBe("2026-09-23");
    expect(resultado.entidades.periodo).toEqual({ deMinutos: 900, ateMinutos: 959 });
  });

  it("nao aceita hora invalida", () => {
    expect(periodoCitado("amanha as 29")).toBeNull();
  });

  it("interpreta numero somente no menu que esta ativo", () => {
    expect(classificar("3", { ...opcoes, totalDeOpcoes: 5 }).intencao).toBe("SELECAO");
    expect(classificar("3", { ...opcoes, totalDeOpcoes: 0 }).intencao).toBe("DESCONHECIDA");
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