import { describe, expect, it } from "vitest";

import { gradeDoMes, semanaDoDia, somarMeses, tituloDoMes } from "./calendario";

describe("calendário da Agenda", () => {
  it("semana de sábado 03/10/2026 vai de 27/09 a 03/10", () => {
    const s = semanaDoDia("2026-10-03");
    expect(s[0]).toBe("2026-09-27");
    expect(s[6]).toBe("2026-10-03");
  });
  it("domingo abre a própria semana", () => {
    expect(semanaDoDia("2026-10-04")[0]).toBe("2026-10-04");
  });
  it("grade de outubro/2026 começa no domingo 27/09 e cobre o mês", () => {
    const g = gradeDoMes("2026-10");
    expect(g[0]).toBe("2026-09-27");
    expect(g.length % 7).toBe(0);
    expect(g).toContain("2026-10-31");
  });
  it("troca de mês atravessa o ano", () => {
    expect(somarMeses("2026-12", 1)).toBe("2027-01");
    expect(somarMeses("2026-01", -1)).toBe("2025-12");
  });
  it("título Mês Ano", () => {
    expect(tituloDoMes("2026-10-03")).toBe("Outubro 2026");
  });
});
