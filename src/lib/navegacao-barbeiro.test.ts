import { describe, expect, it } from "vitest";

import { itemDeNavegacaoAtivo, MODULOS_DE_NAVEGACAO } from "@/lib/navegacao-barbeiro";
import { componenteIds } from "@/lib/pagina-config";

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


describe("entrada Figaro de Personalizar Página", () => {
  it("abre diretamente a tela principal de Personalizar Página pelo menu", () => {
    const suaPagina = MODULOS_DE_NAVEGACAO.find((item) => item.label === "Sua Página");
    expect(suaPagina?.to).toBe("/barbeiro/marca");
  });

  it.each([
    "/barbeiro/marca",
    "/barbeiro/marca/layout-tema",
    ...componenteIds.map((secao) => `/barbeiro/marca/secao/${secao}`),
  ])("mantém Sua Página ativa dentro do fluxo %s", (caminho) => {
    expect(itemDeNavegacaoAtivo(caminho, "/barbeiro/marca")).toBe(true);
  });
});
