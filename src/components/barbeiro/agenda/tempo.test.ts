import { describe, expect, it } from "vitest";

import { nomeDaAgenda } from "./tempo";

describe("nomeDaAgenda", () => {
  it("abrevia sobrenome somente no modo discreto", () => {
    expect(nomeDaAgenda("Herslander Jorge dos Santos", true)).toBe("Herslander J.");
    expect(nomeDaAgenda("Herslander Jorge dos Santos", false)).toBe("Herslander Jorge dos Santos");
  });

  it("mantém nome genérico e nome de uma palavra", () => {
    expect(nomeDaAgenda("Cliente avulso", true)).toBe("Cliente avulso");
    expect(nomeDaAgenda("Madonna", true)).toBe("Madonna");
  });
});