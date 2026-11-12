import { describe, expect, it } from "vitest";

import { DIAS_INICIAIS, janelaDaLista, proximaJanelaDaLista } from "./janela-da-lista";

describe("janela progressiva de Cards", () => {
  const dias = Array.from({ length: 60 }, (_, indice) => indice + 1);

  it("monta apenas a primeira janela no toque e preserva a ordem", () => {
    expect(janelaDaLista(dias, DIAS_INICIAIS)).toEqual(dias.slice(0, 12));
    expect(dias).toHaveLength(60);
  });

  it("acrescenta datas sem perder as anteriores até o fim", () => {
    const limite = proximaJanelaDaLista(12, 60);
    expect(limite).toBe(24);
    expect(janelaDaLista(dias, limite)).toEqual(dias.slice(0, 24));
    expect(proximaJanelaDaLista(56, 60)).toBe(60);
    expect(proximaJanelaDaLista(60, 60)).toBe(60);
  });

  it("lida com listas vazias e resultados menores que a janela", () => {
    expect(janelaDaLista([], 12)).toEqual([]);
    expect(janelaDaLista([1, 2], 12)).toEqual([1, 2]);
  });
});
