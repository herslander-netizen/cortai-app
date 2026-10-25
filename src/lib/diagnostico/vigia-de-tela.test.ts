// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

import {
  ESPERA_PARA_RECARREGAR_PAGINA_MS,
  ESPERA_PARA_RECARREGAR_ROTAS_MS,
  VIGIA_INICIAL,
  areaVazia,
  decidirVigia,
  type EstadoDoVigia,
} from "./vigia-de-tela";

const parado = { vazia: true, ocioso: true, visivel: true };

function rodar(passos: Array<[number, Partial<typeof parado>]>) {
  let estado: EstadoDoVigia = VIGIA_INICIAL;
  const acoes: string[] = [];
  for (const [agora, condicao] of passos) {
    const r = decidirVigia(estado, agora, { ...parado, ...condicao });
    estado = r.estado;
    acoes.push(r.acao);
  }
  return acoes;
}

describe("vigia da tela vazia", () => {
  it("primeiro recarrega as rotas, depois a página, e não repete", () => {
    const acoes = rodar([
      [0, {}],
      [ESPERA_PARA_RECARREGAR_ROTAS_MS - 1, {}],
      [ESPERA_PARA_RECARREGAR_ROTAS_MS, {}],
      [ESPERA_PARA_RECARREGAR_PAGINA_MS - 1, {}],
      [ESPERA_PARA_RECARREGAR_PAGINA_MS, {}],
      [ESPERA_PARA_RECARREGAR_PAGINA_MS + 5000, {}],
    ]);
    expect(acoes).toEqual([
      "nada",
      "nada",
      "recarregar-rotas",
      "nada",
      "recarregar-pagina",
      "nada",
    ]);
  });

  it("não age enquanto o roteador carrega, com a tela escondida ou com algo desenhado", () => {
    expect(
      rodar([
        [0, { ocioso: false }],
        [9000, { ocioso: false }],
      ]),
    ).toEqual(["nada", "nada"]);
    expect(
      rodar([
        [0, { visivel: false }],
        [9000, { visivel: false }],
      ]),
    ).toEqual(["nada", "nada"]);
    expect(
      rodar([
        [0, { vazia: false }],
        [9000, { vazia: false }],
      ]),
    ).toEqual(["nada", "nada"]);
  });

  it("se a tela volta, recomeça a contagem do zero", () => {
    const acoes = rodar([
      [0, {}],
      [1000, { vazia: false }],
      [1400, {}],
      [2000, {}],
      [1400 + ESPERA_PARA_RECARREGAR_ROTAS_MS, {}],
    ]);
    expect(acoes).toEqual(["nada", "nada", "nada", "nada", "recarregar-rotas"]);
  });

  it("área vazia: nenhum filho com altura", () => {
    const area = document.createElement("div");
    expect(areaVazia(area)).toBe(true);
    const filho = document.createElement("main");
    area.appendChild(filho);
    filho.getBoundingClientRect = () => ({ height: 0 }) as DOMRect;
    expect(areaVazia(area)).toBe(true);
    filho.getBoundingClientRect = () => ({ height: 320 }) as DOMRect;
    expect(areaVazia(area)).toBe(false);
  });
});
