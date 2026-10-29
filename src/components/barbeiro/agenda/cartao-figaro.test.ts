import { describe, expect, it } from "vitest";

import {
  COR_SEM_CATEGORIA,
  CORES_DE_CATEGORIA,
  corDaCategoria,
  faixaDoCartao,
  indiceDaCategoria,
  glifoDoEstado,
  mostraCliente,
  mostraHorario,
  opacidadeDasLinhasDe5,
} from "./cartao-figaro";

describe("cartão da timeline como no Figaro", () => {
  it("cada categoria do negócio ganha uma cor diferente, pela ordem alfabética", () => {
    const doNegocio = ["Corte", "Barba", "Química", "corte ", "Estética", null];
    expect(indiceDaCategoria(doNegocio, "Barba")).toBe(0);
    expect(indiceDaCategoria(doNegocio, " corte")).toBe(1);
    expect(indiceDaCategoria(doNegocio, "Estetica")).toBe(2);
    expect(indiceDaCategoria(doNegocio, "Química")).toBe(3);
    expect(indiceDaCategoria(doNegocio, null)).toBeNull();
    expect(new Set([0, 1, 2, 3].map(corDaCategoria)).size).toBe(4);
    expect(corDaCategoria(null)).toBe(COR_SEM_CATEGORIA);
    expect(corDaCategoria(10)).toBe(CORES_DE_CATEGORIA[0]);
  });

  it("as faixas por altura mostram cliente e horário só quando cabem (2 px/min)", () => {
    expect(faixaDoCartao(28, 2)).toBe("minimo");
    expect(faixaDoCartao(50, 2)).toBe("pequeno");
    expect(faixaDoCartao(70, 2)).toBe("medio");
    expect(faixaDoCartao(100, 2)).toBe("grande");
    expect(faixaDoCartao(130, 2)).toBe("maior");
    expect(mostraHorario("pequeno")).toBe(false);
    expect(mostraHorario("medio")).toBe(true);
    expect(mostraCliente("medio")).toBe(false);
    expect(mostraCliente("grande")).toBe(true);
  });

  it("as faixas respeitam os limites mínimos em escalas diferentes", () => {
    expect(faixaDoCartao(14, 1)).toBe("minimo");
    expect(faixaDoCartao(15, 1)).toBe("pequeno");
    expect(faixaDoCartao(48, 1)).toBe("pequeno");
    expect(faixaDoCartao(48, 2)).toBe("pequeno");
    expect(faixaDoCartao(60, 2)).toBe("medio");
    expect(faixaDoCartao(96, 2)).toBe("grande");
    expect(faixaDoCartao(120, 2)).toBe("maior");
  });

  it("ícone de estado: confirmado, pendente pelo link ou pela equipe, atrasado e encerrados", () => {
    const base = { confirmadoEm: null, origem: null };
    expect(glifoDoEstado({ ...base, status: "agendado", confirmadoEm: "x" }, false)).toBe(
      "confirmado",
    );
    expect(glifoDoEstado({ ...base, status: "agendado", origem: "link_publico" }, false)).toBe(
      "pendente-online",
    );
    expect(glifoDoEstado({ ...base, status: "agendado", origem: "manual" }, false)).toBe(
      "pendente-equipe",
    );
    expect(glifoDoEstado({ ...base, status: "agendado" }, true)).toBe("atrasado");
    expect(glifoDoEstado({ ...base, status: "nao_compareceu" }, true)).toBe("falta");
    expect(glifoDoEstado({ ...base, status: "finalizado" }, false)).toBe("concluido");
  });

  it("linhas de 5 min aparecem progressivamente pelo zoom, nunca apenas por segurar o cartão", () => {
    expect(opacidadeDasLinhasDe5(2)).toBe(0);
    expect(opacidadeDasLinhasDe5(2.5)).toBe(0);
    expect(opacidadeDasLinhasDe5(2.75)).toBeCloseTo(0.5);
    expect(opacidadeDasLinhasDe5(3)).toBe(1);
    expect(opacidadeDasLinhasDe5(3.5)).toBe(1);
  });
});
