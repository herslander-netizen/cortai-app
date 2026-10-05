import { describe, expect, it } from "vitest";
import { normalizarEmailCliente } from "./email-cliente";

describe("normalizarEmailCliente", () => {
  it("vazio vira null", () => {
    expect(normalizarEmailCliente("  ")).toEqual({ ok: true, email: null });
    expect(normalizarEmailCliente(null)).toEqual({ ok: true, email: null });
  });
  it("normaliza caixa e espaços", () => {
    expect(normalizarEmailCliente(" Ana@Mail.COM ")).toEqual({ ok: true, email: "ana@mail.com" });
  });
  it("recusa formato inválido", () => {
    for (const e of ["ana", "ana@", "ana@mail", "a b@mail.com", `${"a".repeat(250)}@x.com`])
      expect(normalizarEmailCliente(e).ok).toBe(false);
  });
});
