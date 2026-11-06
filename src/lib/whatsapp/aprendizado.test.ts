import { describe, expect, it } from "vitest";

import { chaveDeGrupo, mascararDados, pareceCorrecao } from "./aprendizado";

describe("aprendizado do atendimento", () => {
  it("mascara telefone, e-mail, CPF e números longos", () => {
    expect(mascararDados("me liga no (79) 99818-1983 ou ana@exemplo.com")).toBe(
      "me liga no [telefone] ou [e-mail]",
    );
    expect(mascararDados("meu cpf é 123.456.789-09")).toBe("meu cpf é [documento]");
    expect(mascararDados("pedido 12345678")).toBe("pedido [número]");
  });

  it("mantém horários e dias, que são linguagem", () => {
    expect(mascararDados("tem as 15h dia 12?")).toBe("tem as 15h dia 12?");
  });

  it("agrupa frases iguais a menos de acento, caixa, pontuação e horário", () => {
    expect(chaveDeGrupo("Tem encaixe às 15h?")).toBe(chaveDeGrupo("tem encaixe as 10:30"));
    expect(chaveDeGrupo("Tem encaixe às 15h?")).not.toBe(chaveDeGrupo("tem vaga às 15h?"));
  });

  it("reconhece correção do cliente e ignora frases comuns", () => {
    expect(pareceCorrecao("não, não é isso")).toBe(true);
    expect(pareceCorrecao("tá errado o horário")).toBe(true);
    expect(pareceCorrecao("você não entendeu")).toBe(true);
    expect(pareceCorrecao("não posso amanhã")).toBe(false);
    expect(pareceCorrecao("quero marcar um corte")).toBe(false);
  });
});
