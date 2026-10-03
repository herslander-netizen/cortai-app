import { describe, expect, it } from "vitest";
import { resumoDoFunil } from "./funil";

describe("resumoDoFunil", () => {
  it("0% sem visitas", () => {
    expect(resumoDoFunil({ vitrine: 0, entradaDireta: 0, confirmados: 0 })).toEqual({ visitas: 0, agendamentos: 0, conversao: 0 });
  });
  it("soma entradas e arredonda", () => {
    expect(resumoDoFunil({ vitrine: 2, entradaDireta: 1, confirmados: 1 })).toEqual({ visitas: 3, agendamentos: 1, conversao: 33 });
  });
});
