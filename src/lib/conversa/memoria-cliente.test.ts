import { describe, expect, it } from "vitest";

import {
  camposMantidosAoCorrigir,
  lerMemoriaCliente,
  lerRascunho,
  periodoMaisFrequente,
  registrarAgendamentoNaMemoria,
  salvarMemoriaCliente,
  salvarRascunho,
  type Armazenamento,
} from "./memoria-cliente";

function criarStorage(quebrado = false): Armazenamento {
  const dados = new Map<string, string>();
  return {
    getItem: (chave) => {
      if (quebrado) throw new Error("sem armazenamento");
      return dados.get(chave) ?? null;
    },
    setItem: (chave, valor) => {
      if (quebrado) throw new Error("sem armazenamento");
      dados.set(chave, valor);
    },
    removeItem: (chave) => {
      dados.delete(chave);
    },
  };
}

describe("memória do cliente", () => {
  it("salva e lê o cliente do negócio", () => {
    const storage = criarStorage();
    expect(salvarMemoriaCliente("loja", { primeiroNome: "Ana" }, storage)).toBe(true);
    expect(lerMemoriaCliente("loja", storage)?.primeiroNome).toBe("Ana");
  });

  it("continua funcionando sem armazenamento", () => {
    const storage = criarStorage(true);
    expect(salvarMemoriaCliente("loja", {}, storage)).toBe(false);
    expect(lerMemoriaCliente("loja", storage)).toBeNull();
    expect(lerMemoriaCliente("loja", null)).toBeNull();
  });

  it("registra serviço, profissional e período preferido sem perder nome/telefone", () => {
    const storage = criarStorage();
    salvarMemoriaCliente("loja", { nome: "Ana Souza", telefone: "11999999999" }, storage);
    registrarAgendamentoNaMemoria("loja", { servicoId: "s1", profissionalId: "p1", horario: "09:00" }, storage);
    registrarAgendamentoNaMemoria("loja", { servicoId: "s1", profissionalId: "p1", horario: "18:30" }, storage);
    registrarAgendamentoNaMemoria("loja", { servicoId: "s2", profissionalId: "p1", horario: "19:00" }, storage);
    const memoria = lerMemoriaCliente("loja", storage);
    expect(memoria).toMatchObject({
      nome: "Ana Souza",
      telefone: "11999999999",
      primeiroNome: "Ana",
      ultimoServicoId: "s2",
      ultimoProfissionalId: "p1",
      periodoPreferido: "noite",
    });
  });

  it("calcula o período mais frequente", () => {
    expect(periodoMaisFrequente(["manha", "tarde", "manha"])).toBe("manha");
    expect(periodoMaisFrequente([])).toBeUndefined();
  });
});

describe("rascunho da conversa", () => {
  it("retoma dentro de 30 minutos", () => {
    const storage = criarStorage();
    salvarRascunho("loja", { dia: "2026-10-02" }, storage, 1000);
    expect(lerRascunho("loja", storage, 1000 + 29 * 60_000)?.dia).toBe("2026-10-02");
  });

  it("descarta depois de 30 minutos", () => {
    const storage = criarStorage();
    salvarRascunho("loja", { dia: "2026-10-02" }, storage, 1000);
    expect(lerRascunho("loja", storage, 1000 + 31 * 60_000)).toBeNull();
  });
});

describe("correção por toque na bolha", () => {
  it("serviço reabre tudo", () => {
    expect(camposMantidosAoCorrigir("servico")).toEqual([]);
  });

  it("profissional mantém só o serviço", () => {
    expect(camposMantidosAoCorrigir("profissional")).toEqual(["servicoId"]);
  });

  it("dia mantém serviço e profissional", () => {
    expect(camposMantidosAoCorrigir("dia")).toEqual(["servicoId", "profissionalId"]);
  });

  it("horário mantém serviço, profissional e dia", () => {
    expect(camposMantidosAoCorrigir("horario")).toEqual(["servicoId", "profissionalId", "dia"]);
  });
});
