import { describe, expect, it } from "vitest";
import { contarNaoVistos, criarControleDeToque, deveTocar, rotuloDoSino } from "./sino-avisos";

const a = (iso: string, lida: string | null = null) => ({ criado_em: iso, lida_em: lida });

describe("contarNaoVistos", () => {
  const lista = [
    a("2026-10-08T10:00:00Z"),
    a("2026-10-08T11:00:00Z"),
    a("2026-10-08T12:00:00Z", "x"),
  ];
  it("sem valor gravado não acende nada", () => expect(contarNaoVistos(lista, null)).toBe(0));
  it("conta só não lidos posteriores", () =>
    expect(contarNaoVistos(lista, Date.parse("2026-10-08T10:30:00Z"))).toBe(1));
  it("igualdade não conta como novo", () =>
    expect(contarNaoVistos(lista, Date.parse("2026-10-08T11:00:00Z"))).toBe(0));
});

describe("toque do sino", () => {
  const base = { centralAberta: false, menosMovimento: false, abaOculta: false };
  it("rajada de 3 em 1s gera 1 animação", () => {
    let t = 0;
    const c = criarControleDeToque(() => t);
    const r = [c.pedir(base), ((t = 400), c.pedir(base)), ((t = 800), c.pedir(base))];
    expect(r.filter(Boolean)).toHaveLength(1);
  });
  it("central aberta não anima", () =>
    expect(deveTocar({ ...base, animando: false, centralAberta: true })).toBe(false));
  it("redução de movimento não anima", () =>
    expect(deveTocar({ ...base, animando: false, menosMovimento: true })).toBe(false));
  it("rótulos", () => {
    expect(rotuloDoSino(0, 0)).toBe("Avisos");
    expect(rotuloDoSino(3, 0)).toBe("Avisos, 3 não lidos");
    expect(rotuloDoSino(3, 2)).toBe("Avisos, 2 novos");
  });
});
