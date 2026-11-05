import { describe, expect, it } from "vitest";

import {
  esperaParaJuntar,
  tempoDeDigitar,
  textoJuntado,
  type LinhaDaConversa,
} from "./naturalidade";

const em = (s: number) => new Date(Date.UTC(2026, 10, 5, 12, 0, s)).toISOString();
const entrada = (id: string, conteudo: string, s: number): LinhaDaConversa => ({
  direcao: "entrada",
  conteudo,
  mensagem_externa_id: id,
  criado_em: em(s),
});
const saida = (conteudo: string, s: number): LinhaDaConversa => ({
  direcao: "saida",
  conteudo,
  mensagem_externa_id: null,
  criado_em: em(s),
});

describe("juntar mensagens picadas", () => {
  it("a mensagem mais nova responde por todas, na ordem em que foram escritas", () => {
    const linhas = [
      entrada("m3", "amanhã", 9),
      entrada("m2", "queria marcar", 5),
      entrada("m1", "oi", 1),
      saida("Até mais!", 0),
    ];
    expect(textoJuntado(linhas, { mensagemExternaId: "m3", texto: "amanhã" })).toBe(
      "oi\nqueria marcar\namanhã",
    );
  });

  it("chegou outra depois desta: esta não responde", () => {
    const linhas = [entrada("m2", "queria marcar", 5), entrada("m1", "oi", 1)];
    expect(textoJuntado(linhas, { mensagemExternaId: "m1", texto: "oi" })).toBeNull();
  });

  it("para na última resposta do negócio", () => {
    const linhas = [
      entrada("m2", "1", 30),
      saida("Qual serviço?", 20),
      entrada("m1", "quero marcar", 10),
    ];
    expect(textoJuntado(linhas, { mensagemExternaId: "m2", texto: "1" })).toBe("1");
  });

  it("não junta mensagens com mais de 2 minutos", () => {
    const linhas = [entrada("m2", "amanhã", 200), entrada("m1", "oi", 1)];
    expect(textoJuntado(linhas, { mensagemExternaId: "m2", texto: "amanhã" })).toBe("amanhã");
  });

  it("sem histórico usa o próprio texto", () => {
    expect(textoJuntado([], { mensagemExternaId: "m1", texto: "oi" })).toBe("oi");
  });
});

describe("tempos", () => {
  it("digitando cresce com o texto e tem teto", () => {
    expect(tempoDeDigitar("ok")).toBe(800);
    expect(tempoDeDigitar("x".repeat(50))).toBe(1600);
    expect(tempoDeDigitar("x".repeat(500))).toBe(2500);
  });

  it("espera configurável, 0 desliga, teto de 8 s", () => {
    expect(esperaParaJuntar({})).toBe(3000);
    expect(esperaParaJuntar({ CORTAI_WHATSAPP_JUNTAR_MS: "0" })).toBe(0);
    expect(esperaParaJuntar({ CORTAI_WHATSAPP_JUNTAR_MS: "20000" })).toBe(8000);
    expect(esperaParaJuntar({ CORTAI_WHATSAPP_JUNTAR_MS: "abc" })).toBe(3000);
  });
});
