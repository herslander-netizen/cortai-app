import { describe, expect, it } from "vitest";

import { alternarGrupo, comGrupoAtual, gruposAbertosSalvos, salvarGruposAbertos } from "./grupos-do-menu";

function memoria() {
  const d = new Map<string, string>();
  return { getItem: (k: string) => d.get(k) ?? null, setItem: (k: string, v: string) => void d.set(k, v) };
}

describe("grupos do menu", () => {
  it("começa só com Dia a dia aberto", () => {
    expect(gruposAbertosSalvos(memoria())).toEqual(["Dia a dia"]);
  });
  it("lembra os grupos deixados abertos", () => {
    const s = memoria();
    salvarGruposAbertos(["Negócio"], s);
    expect(gruposAbertosSalvos(s)).toEqual(["Negócio"]);
  });
  it("abre o grupo da tela atual", () => {
    expect(comGrupoAtual(["Dia a dia"], "Sistema")).toEqual(["Dia a dia", "Sistema"]);
    expect(comGrupoAtual(["Dia a dia"], null)).toEqual(["Dia a dia"]);
  });
  it("alterna abrir e fechar", () => {
    expect(alternarGrupo(["Dia a dia"], "Dia a dia")).toEqual([]);
    expect(alternarGrupo([], "Negócio")).toEqual(["Negócio"]);
  });
  it("tolera armazenamento quebrado", () => {
    const s = { getItem: () => "{x", setItem: () => {} };
    expect(gruposAbertosSalvos(s)).toEqual(["Dia a dia"]);
  });
});
