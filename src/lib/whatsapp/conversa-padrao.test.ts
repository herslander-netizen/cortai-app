import { describe, expect, it } from "vitest";
import { responder, textoDaSituacao, limitarEmojis } from "./conversa-padrao";
import { classificar } from "./motor/intencoes";

describe("Conversa padrão", () => {
  it("cliente de sempre recebe o de sempre", () => {
    const r = responder("saudacao_conhecido", { nome: "João", ultimo_servico: "Corte", ultimo_profissional: "Léo" });
    expect(r?.texto).toContain("o de sempre (Corte com Léo)");
  });
  it("sem dado nunca inventa: passa para a equipe", () => {
    const r = responder("pagamento", { formas_pagamento: "Pix", pix: null });
    expect(r).toEqual({ texto: "Vou confirmar com a equipe e já te retorno.", precisaHumano: true });
  });
  it("barbearia edita e desliga situações", () => {
    expect(textoDaSituacao("elogio", { textos: { elogio: "Obrigado!" } })).toBe("Obrigado!");
    expect(textoDaSituacao("aniversario", { desligadas: ["aniversario"] })).toBeNull();
  });
  it("no máximo 1 emoji", () => {
    expect(limitarEmojis("Oi 🎉 tudo 👊 bem")).toBe("Oi 🎉 tudo bem");
  });
});

// Conversas de teste (parte 7) contra o motor determinístico, sem enviar nada.
describe("Conversas de teste — intenção reconhecida", () => {
  const casos: [string, string, string][] = [
    ["1. Cliente novo, tudo numa frase", "oi, quero marcar corte amanhã de tarde", "AGENDAR"],
    ["2. Cliente de sempre", "oi, quero marcar", "AGENDAR"],
    ["3. Lembrete e remarcação", "preciso remarcar", "REMARCAR"],
    ["4. Atraso", "vou atrasar 20 min", "HUMANO"],
    ["5. Preço fora do horário", "quanto custa o corte?", "PRECO"],
    ["6. Agenda cheia", "tem horário hoje?", "DISPONIBILIDADE"],
    ["7. Reclamação", "quero falar com um atendente", "HUMANO"],
    ["8. Não entendeu", "asdfgh", "DESCONHECIDA"],
  ];
  for (const [nome, msg, esperado] of casos) {
    it(nome, () => {
      const r = classificar(msg, { fuso: "America/Sao_Paulo" }).intencao;
      console.log(`${nome}: "${msg}" → ${r}`);
      expect(r).toBe(esperado);
    });
  }
});
