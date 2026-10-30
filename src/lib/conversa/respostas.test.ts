import { describe, expect, it } from "vitest";

import { aberturaDoChat } from "./respostas";

describe("aberturaDoChat", () => {
  it("não cumprimenta duas vezes quando a mensagem já começa com um cumprimento", () => {
    expect(aberturaDoChat("Olá! Vou ajudar você a encontrar o melhor horário.")).toBe(
      "Olá! Vou ajudar você a encontrar o melhor horário.",
    );
  });
  it("com o nome do cliente, troca o cumprimento da mensagem pelo nome", () => {
    expect(aberturaDoChat("Olá! Vou ajudar você.", "Ana")).toBe("Oi, Ana! Vou ajudar você.");
    expect(aberturaDoChat("Boa tarde, tudo bem?", "Ana")).toBe("Oi, Ana! Tudo bem?");
  });
  it("sem cumprimento na mensagem, põe o Oi na frente", () => {
    expect(aberturaDoChat("Vou ajudar você.")).toBe("Oi! Vou ajudar você.");
    expect(aberturaDoChat("Vou ajudar você.", "Ana")).toBe("Oi, Ana! Vou ajudar você.");
  });
  it("não confunde palavras que só começam parecido", () => {
    expect(aberturaDoChat("Olaria e cerâmica na casa.")).toBe("Oi! Olaria e cerâmica na casa.");
  });
});
