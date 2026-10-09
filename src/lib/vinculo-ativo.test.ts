import { describe, expect, it } from "vitest";
import { escolherVinculo } from "./vinculo-ativo";

const a = { tenant_id: "A", ativo: true };
const b = { tenant_id: "B", ativo: true };
const suspenso = { tenant_id: "S", ativo: false };

describe("escolherVinculo", () => {
  it("usa o negócio escolhido quando o acesso está ativo", () => {
    expect(escolherVinculo([a, b], "B")).toBe(b);
  });
  it("sem escolha, fica com o primeiro acesso ativo (ordem estável)", () => {
    expect(escolherVinculo([a, b], null)).toBe(a);
    expect(escolherVinculo([a, b], undefined)).toBe(a);
  });
  it("escolha suspensa ou desconhecida cai no primeiro acesso ativo", () => {
    expect(escolherVinculo([suspenso, a, b], "S")).toBe(a);
    expect(escolherVinculo([a, b], "Z")).toBe(a);
  });
  it("só vínculo suspenso: devolve o suspenso para quem chama recusar", () => {
    const r = escolherVinculo([suspenso], "S");
    expect(r).toBe(suspenso);
    expect(r?.ativo).toBe(false);
  });
  it("sem vínculos: null", () => {
    expect(escolherVinculo([], "A")).toBeNull();
  });
  it("o mesmo resultado para a sessão e para o servidor com as mesmas entradas", () => {
    const lista = [suspenso, b, a];
    expect(escolherVinculo(lista, "A")).toBe(escolherVinculo([...lista], "A"));
  });
});
