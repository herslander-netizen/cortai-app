import { describe, expect, it } from "vitest";

import {
  agruparPorLetra,
  indicadorDeEstado,
  podeTrocarCliente,
  rodapeDaFicha,
} from "./ficha-regras";

const agora = Date.parse("2026-10-18T15:00:00Z");
const futuro = { inicio: "2026-10-18T16:00:00Z", fim: "2026-10-18T16:30:00Z" };
const comecou = { inicio: "2026-10-18T14:50:00Z", fim: "2026-10-18T15:20:00Z" };

describe("rodapé da ficha (Figaro: docked actions)", () => {
  it("futuro: Reagendar com a seta; cancelar por último e a chegada antes da hora", () => {
    expect(rodapeDaFicha({ ...futuro, status: "agendado" }, agora)).toEqual({
      principal: "reagendar",
      menu: ["chegou", "cobrar", "comanda", "cancelar"],
    });
  });

  it("já começou: a etapa do Cortaí é o principal; Reagendar e Não compareceu na seta", () => {
    expect(rodapeDaFicha({ ...comecou, status: "agendado" }, agora).principal).toBe("chegou");
    expect(rodapeDaFicha({ ...comecou, status: "chegou" }, agora)).toEqual({
      principal: "comecar",
      menu: ["reagendar", "falta", "cobrar", "comanda"],
    });
    expect(rodapeDaFicha({ ...comecou, status: "na_cadeira" }, agora).principal).toBe("finalizar");
  });

  it("concluído mostra a comanda; cancelado e falta não têm botão", () => {
    expect(rodapeDaFicha({ ...comecou, status: "finalizado" }, agora).principal).toBe("comanda");
    expect(rodapeDaFicha({ ...comecou, status: "cancelado" }, agora).principal).toBeNull();
    expect(rodapeDaFicha({ ...comecou, status: "nao_compareceu" }, agora).menu).toEqual([]);
  });
});

describe("Trocar cliente e estado", () => {
  it("troca enquanto o atendimento não começou, mesmo com o horário já passado", () => {
    expect(podeTrocarCliente({ ...futuro, status: "agendado" })).toBe(true);
    expect(podeTrocarCliente({ ...comecou, status: "agendado" })).toBe(true);
    expect(podeTrocarCliente({ ...comecou, status: "chegou" })).toBe(true);
    expect(podeTrocarCliente({ ...comecou, status: "na_cadeira" })).toBe(false);
    expect(podeTrocarCliente({ ...comecou, status: "finalizado" })).toBe(false);
    expect(podeTrocarCliente({ ...futuro, status: "cancelado" })).toBe(false);
  });

  it("estado: em andamento pelo horário, confirmado em verde, cancelado em vermelho", () => {
    const base = { confirmadoEm: null };
    expect(
      indicadorDeEstado({ ...comecou, ...base, status: "agendado" }, agora, "Em atendimento"),
    ).toEqual({ rotulo: "Em andamento", tom: "andamento" });
    expect(
      indicadorDeEstado(
        { ...futuro, confirmadoEm: "x", status: "agendado" },
        agora,
        "Em atendimento",
      ),
    ).toEqual({ rotulo: "Confirmado", tom: "sucesso" });
    expect(indicadorDeEstado({ ...futuro, ...base, status: "cancelado" }, agora, "x").tom).toBe(
      "erro",
    );
    expect(
      indicadorDeEstado({ ...comecou, ...base, status: "na_cadeira" }, agora, "Na cadeira"),
    ).toEqual({ rotulo: "Na cadeira", tom: "andamento" });
  });
});

describe("lista de clientes por letra", () => {
  it("agrupa pela inicial sem acento e em ordem", () => {
    expect(
      agruparPorLetra([{ nome: "Ana" }, { nome: "Érica" }, { nome: "bruno" }, { nome: "1Teste" }]),
    ).toEqual([
      { letra: "#", itens: [{ nome: "1Teste" }] },
      { letra: "A", itens: [{ nome: "Ana" }] },
      { letra: "B", itens: [{ nome: "bruno" }] },
      { letra: "E", itens: [{ nome: "Érica" }] },
    ]);
  });
});
