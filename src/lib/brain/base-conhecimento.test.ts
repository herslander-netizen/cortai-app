import { describe, expect, it } from "vitest";
import {
  compactarConhecimento,
  novidadesDoConhecimento,
  normalizarConhecimento,
} from "./base-conhecimento";

describe("base compacta do Flow Core", () => {
  it("normaliza diferenças de acento, caixa e pontuação", () => {
    expect(normalizarConhecimento("  Próximo cliente?! ")).toBe("proximo cliente");
  });

  it("descarta regra repetida e preserva a primeira entrada", () => {
    const base = compactarConhecimento([
      { categoria: "conversa", gatilhos: ["Oi", "Olá"], resposta: "Estou aqui." },
      { categoria: "conversa", gatilhos: ["oi", "olá"], resposta: "Estou aqui." },
    ]);
    expect(base).toHaveLength(1);
    expect(base[0]?.resposta).toBe("Estou aqui.");
  });

  it("separa novidades sem duplicar o que já existe", () => {
    const atual = [{ categoria: "faq" as const, gatilhos: ["preço"], resposta: "Consultar catálogo." }];
    const propostas = [
      { categoria: "faq" as const, gatilhos: ["PREÇO"], resposta: "Consultar catálogo." },
      { categoria: "operacao" as const, gatilhos: ["fila"], resposta: "Consultar fila real." },
    ];
    expect(novidadesDoConhecimento(atual, propostas)).toHaveLength(1);
    expect(novidadesDoConhecimento(atual, propostas)[0]?.categoria).toBe("operacao");
  });
});
