import { afterEach, describe, expect, it } from "vitest";

import { buscaDaLista } from "./busca-da-lista";

afterEach(() => buscaDaLista.fechar());

describe("busca da lista da Agenda", () => {
  it("abre, guarda o texto e limpa ao fechar", () => {
    buscaDaLista.abrir();
    buscaDaLista.texto("ana");
    expect(buscaDaLista.ler()).toEqual({ aberta: true, texto: "ana" });
    buscaDaLista.fechar();
    expect(buscaDaLista.ler()).toEqual({ aberta: false, texto: "" });
  });
});
