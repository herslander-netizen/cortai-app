import { describe, expect, it } from "vitest";

import {
  maximoDeProfissionais,
  planoParaProfissionais,
  profissionaisDoPlano,
  situacaoDoPaywall,
} from "./escolha-de-plano";

const planos = [
  { chave: "studio", nome: "Studio", precoMensalCentavos: 4990, limites: { profissionais: 10 } },
  { chave: "essencial", nome: "Essencial", precoMensalCentavos: 0, limites: { profissionais: 1 } },
  { chave: "conecta", nome: "Conecta", precoMensalCentavos: 3990, limites: { profissionais: 4 } },
];

describe("escolha de plano por equipe", () => {
  it("escolhe o plano mais barato que comporta a equipe", () => {
    expect(planoParaProfissionais(planos, 1)?.chave).toBe("essencial");
    expect(planoParaProfissionais(planos, 2)?.chave).toBe("conecta");
    expect(planoParaProfissionais(planos, 4)?.chave).toBe("conecta");
    expect(planoParaProfissionais(planos, 5)?.chave).toBe("studio");
    expect(planoParaProfissionais(planos, 11)).toBeNull();
  });
  it("plano sem limite comporta qualquer equipe", () => {
    const livre = [
      ...planos,
      {
        chave: "livre",
        nome: "Livre",
        precoMensalCentavos: 9900,
        limites: { profissionais: null },
      },
    ];
    expect(planoParaProfissionais(livre, 50)?.chave).toBe("livre");
  });
  it("o máximo é o maior limite finito", () => {
    expect(maximoDeProfissionais(planos)).toBe(10);
    expect(maximoDeProfissionais([])).toBe(1);
  });
  it("abre no menor tamanho de equipe do plano atual", () => {
    expect(profissionaisDoPlano(planos, "conecta")).toBe(2);
    expect(profissionaisDoPlano(planos, "studio")).toBe(5);
  });
});

describe("situacaoDoPaywall", () => {
  it("teste ativo mostra os dias restantes", () => {
    expect(
      situacaoDoPaywall({ status: "teste", teste: { ativo: true, diasRestantes: 12, fim: null } })
        ?.texto,
    ).toBe("Seu teste grátis: 12 dias restantes");
  });
  it("teste vencido e cancelada viram 'terminou'; suspensa vira 'pausada'", () => {
    expect(
      situacaoDoPaywall({ status: "teste", teste: { ativo: false, diasRestantes: 0, fim: null } })
        ?.texto,
    ).toBe("Seu teste grátis terminou");
    expect(situacaoDoPaywall({ status: "cancelada" })?.texto).toBe("Seu teste grátis terminou");
    expect(situacaoDoPaywall({ status: "suspensa" })?.texto).toBe("Assinatura pausada");
    expect(situacaoDoPaywall({ status: "ativa" })).toBeNull();
  });
});
