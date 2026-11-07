import { describe, expect, it } from "vitest";

import { textoDoLembrete } from "./lembrete-manual";

describe("Enviar lembrete (ficha da Agenda)", () => {
  it("texto curto, em blocos, no fuso do negócio e pedindo confirmação", () => {
    const t = textoDoLembrete(
      {
        cliente: "Carla Souza",
        servico: "Corte e finalização",
        profissional: "Lucas Martins",
        inicio: "2026-11-07T18:00:00Z",
      },
      "America/Sao_Paulo",
    );
    expect(t).toBe(
      "Olá, Carla!\n\nLembrete do seu horário: Corte e finalização com Lucas.\n\nsábado, 07/11 às 15:00.\n\nVocê confirma?",
    );
  });
  it("sem nome ou profissional não deixa buraco", () => {
    const t = textoDoLembrete(
      { cliente: "", servico: "Barba", profissional: "", inicio: "2026-11-07T18:00:00Z" },
      "America/Sao_Paulo",
    );
    expect(t.startsWith("Olá!")).toBe(true);
    expect(t).toContain("Lembrete do seu horário: Barba.");
  });
});
