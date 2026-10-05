import { describe, expect, it } from "vitest";

import { deveMostrarAcoesRapidasNoCabecalho } from "@/components/barbeiro/AcoesRapidas";

describe("ações rápidas do cabeçalho", () => {
  it.each(["/barbeiro/hoje", "/barbeiro/hoje/", "/barbeiro/casa"])(
    "aparece no contexto operacional %s",
    (caminho) => {
      expect(deveMostrarAcoesRapidasNoCabecalho(caminho)).toBe(true);
    },
  );

  it.each([
    "/barbeiro",
    "/barbeiro/agenda",
    "/barbeiro/marca",
    "/barbeiro/configurar",
    "/barbeiro/clientes",
    "/barbeiro/fila",
    "/barbeiro/caixa",
    "/barbeiro/financeiro",
    "/barbeiro/horarios",
    "/barbeiro/profissionais",
    "/barbeiro/produtos",
  ])("não aparece fora do contexto operacional em %s", (caminho) => {
    expect(deveMostrarAcoesRapidasNoCabecalho(caminho)).toBe(false);
  });
});