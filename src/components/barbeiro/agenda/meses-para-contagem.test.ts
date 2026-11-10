import { describe, expect, it } from "vitest";

import { mesesParaContagem } from "./meses-para-contagem";

describe("consultas da contagem do calendário Figaroo", () => {
  it("carrega só os meses da semana quando o calendário está recolhido", () => {
    expect(
      mesesParaContagem(
        ["2026-10", "2026-11", "2026-11"],
        "2026-11",
        false,
        new Set(["2026-01", "2026-02"]),
      ),
    ).toEqual(["2026-10", "2026-11"]);
  });

  it("não consulta os 25 meses montados só porque o painel expandiu", () => {
    const mesesMontados = Array.from({ length: 25 }, (_, i) =>
      `2026-${String((i % 12) + 1).padStart(2, "0")}`,
    );
    const contagens = mesesParaContagem(
      ["2026-11"],
      "2026-11",
      true,
      new Set(),
    );
    expect(contagens).toEqual(["2026-11"]);
    expect(contagens.length).toBeLessThan(mesesMontados.length);
  });

  it("carrega o mês da região visitada sem perder os indicadores anteriores", () => {
    const primeiro = mesesParaContagem(["2026-11"], "2026-11", true, new Set());
    const depois = mesesParaContagem(
      ["2026-11"],
      "2026-11",
      true,
      new Set(["2026-10", "2026-09"]),
    );
    expect(primeiro).toEqual(["2026-11"]);
    expect(depois).toEqual(["2026-11", "2026-10", "2026-09"]);
  });

  it("remove duplicatas dos três blocos da semana e dos meses visitados", () => {
    expect(
      mesesParaContagem(
        ["2026-10", "2026-11", "2026-11"],
        "2026-11",
        true,
        new Set(["2026-10", "2026-12"]),
      ),
    ).toEqual(["2026-10", "2026-11", "2026-12"]);
  });
});
