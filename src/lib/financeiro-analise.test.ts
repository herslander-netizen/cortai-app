import { describe, expect, it } from "vitest";
import {
  agruparSaidasPorCategoria,
  classificarIdadeFiado,
  dataISOEmFuso,
  diasEntreDatas,
  intervaloFinanceiroLocal,
  rotuloCategoriaSaida,
  rotuloIdadeFiado,
  variacaoPercentual,
} from "./financeiro-analise";

describe("intervaloFinanceiroLocal", () => {
  it("usa o dia seguinte como fim exclusivo e compara com o dia anterior", () => {
    expect(intervaloFinanceiroLocal("2026-10-26", "hoje")).toEqual({
      inicio: "2026-10-26",
      fim: "2026-10-27",
      inicioAnterior: "2026-10-25",
      fimAnterior: "2026-10-26",
    });
  });

  it("compara o acumulado da semana até hoje com os mesmos dias da semana anterior", () => {
    expect(intervaloFinanceiroLocal("2026-10-28", "semana")).toEqual({
      inicio: "2026-10-26",
      fim: "2026-10-29",
      inicioAnterior: "2026-10-19",
      fimAnterior: "2026-10-22",
    });
  });

  it("respeita limites de mês e virada de ano", () => {
    expect(intervaloFinanceiroLocal("2026-01-12", "mes")).toEqual({
      inicio: "2026-01-01",
      fim: "2026-01-13",
      inicioAnterior: "2025-12-01",
      fimAnterior: "2025-12-13",
    });

  });

  it("limita o acumulado ao último dia do mês anterior quando o dia não existe", () => {
    expect(intervaloFinanceiroLocal("2026-03-31", "mes")).toEqual({
      inicio: "2026-03-01",
      fim: "2026-04-01",
      inicioAnterior: "2026-02-01",
      fimAnterior: "2026-03-01",
    });
  });
});

describe("idade do fiado", () => {
  it.each([
    [0, "0–30 dias"],
    [30, "0–30 dias"],
    [31, "31–60 dias"],
    [60, "31–60 dias"],
    [61, "61–90 dias"],
    [90, "61–90 dias"],
    [91, "91+ dias"],
  ] as const)("classifica %i dias na faixa correta", (dias, faixa) => {
    expect(classificarIdadeFiado(dias)).toBe(faixa);
  });

  it("calcula dias civis e não permite idade negativa", () => {
    expect(diasEntreDatas("2026-10-01", "2026-10-26")).toBe(25);
    expect(diasEntreDatas("2026-10-27", "2026-10-26")).toBe(0);
  });

  it("usa o fuso do negócio para determinar o dia de criação", () => {
    expect(dataISOEmFuso("2026-10-26T02:30:00.000Z", "America/Maceio")).toBe("2026-10-25");
  });

  it("gera rótulos claros para a idade", () => {
    expect(rotuloIdadeFiado(0)).toBe("Hoje");
    expect(rotuloIdadeFiado(1)).toBe("Há 1 dia");
    expect(rotuloIdadeFiado(34)).toBe("Há 34 dias");
  });
});

describe("categorias de saídas", () => {
  it("agrupa despesas por categoria, soma valores e ordena da maior para a menor", () => {
    expect(
      agruparSaidasPorCategoria([
        { tipo: "despesa", categoria: "energia", valor_centavos: 1200 },
        { tipo: "despesa", categoria: "energia", valor_centavos: 300 },
        { tipo: "saida", categoria: "saida", valor_centavos: 2000 },
        { tipo: "sangria", categoria: "sangria", valor_centavos: 9000 },
      ]),
    ).toEqual([
      { rotulo: "Outras saídas", totalCentavos: 2000 },
      { rotulo: "Energia", totalCentavos: 1500 },
    ]);
  });

  it("mantém as despesas antigas identificadas como sem categoria", () => {
    expect(rotuloCategoriaSaida("despesa", "despesa")).toBe("Despesas sem categoria");
  });
});

describe("variacaoPercentual", () => {
  it("calcula altas e quedas", () => {
    expect(variacaoPercentual(120, 100)).toBe(20);
    expect(variacaoPercentual(80, 100)).toBe(-20);
  });

  it("não inventa percentual quando o período anterior é zero", () => {
    expect(variacaoPercentual(10, 0)).toBeNull();
    expect(variacaoPercentual(0, 0)).toBe(0);
  });
});
