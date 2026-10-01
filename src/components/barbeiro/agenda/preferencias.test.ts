import { describe, expect, it } from "vitest";

import {
  preferenciaAgendaInicial,
  salvarPreferenciaAgenda,
  ultimaVisaoCompleta,
} from "./preferencias";

function memoria(inicial: Record<string, string> = {}) {
  const dados = new Map(Object.entries(inicial));
  return {
    getItem: (chave: string) => dados.get(chave) ?? null,
    setItem: (chave: string, valor: string) => dados.set(chave, valor),
  };
}

describe("preferências da Agenda", () => {
  it("usa Lista no celular e Timeline no computador sem preferência", () => {
    const storage = memoria();
    expect(preferenciaAgendaInicial(true, storage)).toBe("lista");
    expect(preferenciaAgendaInicial(false, storage)).toBe("timeline");
  });

  it("salva a visualização e a última visão completa", () => {
    const storage = memoria();
    salvarPreferenciaAgenda("timeline", storage);
    expect(preferenciaAgendaInicial(true, storage)).toBe("timeline");
    expect(ultimaVisaoCompleta(storage)).toBe("timeline");
  });

  it("converte Semana salva em Lista no celular", () => {
    const storage = memoria({ "cortai-agenda-visualizacao": "semana" });
    expect(preferenciaAgendaInicial(true, storage)).toBe("lista");
  });

  it("continua com o padrão quando o armazenamento não está disponível", () => {
    const storage = {
      getItem: () => {
        throw new Error("indisponível");
      },
      setItem: () => {
        throw new Error("indisponível");
      },
    };
    expect(preferenciaAgendaInicial(true, storage)).toBe("lista");
    expect(() => salvarPreferenciaAgenda("foco", storage)).not.toThrow();
  });
});