import { describe, expect, it } from "vitest";

import { filaDeChegadaVisivel } from "@/components/barbeiro/agenda/fila-visivel";
import { contarFilaDeChegada, filaDeChegadaAtiva } from "@/lib/fila-chegada.server";
import { exigirFilaDeChegadaAtiva, MENSAGEM_SO_COM_HORARIO } from "@/lib/fila-publica.functions";
import {
  configPadrao,
  filaDeChegadaDoContainer,
  normalizarPagina,
  preservarFilaDeChegada,
} from "@/lib/pagina-config";

function dbFalso(resultado: Record<string, unknown>, chamadas: unknown[][] = []) {
  const q: Record<string, unknown> = {};
  for (const m of ["from", "select", "eq", "in", "is"]) {
    q[m] = (...args: unknown[]) => {
      chamadas.push([m, ...args]);
      return q;
    };
  }
  q["maybeSingle"] = async () => resultado;
  q["then"] = (ok: (v: unknown) => unknown) => Promise.resolve(resultado).then(ok);
  return q as never;
}

describe("fila de chegada", () => {
  it("fica ligada em configurações antigas sem o campo", async () => {
    const antiga = { ...configPadrao() } as Record<string, unknown>;
    delete antiga["filaDeChegada"];
    expect(normalizarPagina(antiga).filaDeChegada).toBe(true);
    expect(filaDeChegadaDoContainer({ pagina: antiga })).toBe(true);
    expect(filaDeChegadaDoContainer(null)).toBe(true);
    expect(await filaDeChegadaAtiva(dbFalso({ data: null }), "t")).toBe(true);
  });

  it("salvar o editor preserva o valor gravado", () => {
    const doEditor = configPadrao({ filaDeChegada: true });
    const salvo = { pagina: configPadrao({ filaDeChegada: false }) };
    expect(preservarFilaDeChegada(doEditor, salvo).filaDeChegada).toBe(false);
  });

  it("desligada esconde a fila na agenda quando vazia", () => {
    expect(filaDeChegadaVisivel(false, 0)).toBe(false);
    expect(filaDeChegadaVisivel(true, 0)).toBe(true);
    expect(filaDeChegadaVisivel(undefined, 0)).toBe(true);
  });

  it("continua visível enquanto houver alguém na fila", () => {
    expect(filaDeChegadaVisivel(false, 2)).toBe(true);
  });

  it("entrada pelo link é recusada quando desligada", () => {
    expect(() => exigirFilaDeChegadaAtiva(false)).toThrow(MENSAGEM_SO_COM_HORARIO);
    expect(() => exigirFilaDeChegadaAtiva(true)).not.toThrow();
  });

  it("naFila conta só a fila de chegada", async () => {
    const chamadas: unknown[][] = [];
    const total = await contarFilaDeChegada(dbFalso({ count: 3 }, chamadas), "t");
    expect(total).toBe(3);
    expect(chamadas).toContainEqual(["is", "janela_preferida", null]);
  });
});
