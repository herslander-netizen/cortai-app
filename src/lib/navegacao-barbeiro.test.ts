import { describe, expect, it } from "vitest";

import { itemDeNavegacaoAtivo } from "@/lib/navegacao-barbeiro";

const itens = ["/barbeiro", "/barbeiro/clientes", "/barbeiro/caixa", "/barbeiro/fila"];

function ativosEm(caminho: string) {
  return itens.filter((item) => itemDeNavegacaoAtivo(caminho, item));
}

describe("item ativo da navegação da equipe", () => {
  it.each(["/barbeiro", "/barbeiro/agenda"])("mantém somente Agenda ativa em %s", (caminho) => {
    expect(ativosEm(caminho)).toEqual(["/barbeiro"]);
  });

  it.each(["/barbeiro/clientes", "/barbeiro/clientes/cliente-1"])(
    "mantém somente Clientes ativo em %s",
    (caminho) => {
      expect(ativosEm(caminho)).toEqual(["/barbeiro/clientes"]);
    },
  );

  it.each(["/barbeiro/caixa", "/barbeiro/comissoes", "/barbeiro/financeiro"])(
    "mantém somente Financeiro ativo em %s",
    (caminho) => {
      expect(ativosEm(caminho)).toEqual(["/barbeiro/caixa"]);
    },
  );

  it("mantém somente Espera ativa na lista de espera", () => {
    expect(ativosEm("/barbeiro/fila")).toEqual(["/barbeiro/fila"]);
  });
});