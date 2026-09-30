import { describe, expect, it } from "vitest";

import { candidatosDaVaga, type PreferenciaDaFila, type ServicoDaVaga } from "./fila-compatibilidade";

const H = 3600_000;
const inicio = Date.UTC(2026, 9, 5, 17, 0); // 14h em São Paulo
const vaga = {
  inicioMs: inicio,
  livreAteMs: inicio + 60 * 60_000,
  profissionalId: "joao",
  diaLocal: "2026-10-05",
  horaLocal: 14,
  servicoLiberadoId: "corte",
};
const servicos = new Map<string, ServicoDaVaga>([
  ["corte", { id: "corte", duracao_min: 50 }],
  ["combo", { id: "combo", duracao_min: 90 }],
  ["barba", { id: "barba", duracao_min: 30, profissional_ids: ["pedro"] }],
]);
const p = (x: Partial<PreferenciaDaFila> & { id: string }): PreferenciaDaFila => ({
  posicao: 1,
  criadoEm: "2026-10-01T00:00:00Z",
  profissionalId: null,
  servicoId: null,
  janela: { espera: true } as PreferenciaDaFila["janela"],
  ...x,
});

describe("lista de espera — compatibilidade da vaga", () => {
  it("respeita a duração real do serviço (50 min cabe, 90 min não)", () => {
    const r = candidatosDaVaga([p({ id: "a", servicoId: "combo" }), p({ id: "b", servicoId: "corte", posicao: 2 })], vaga, servicos);
    expect(r.map((x) => x.id)).toEqual(["b"]);
  });
  it("respeita profissional, dia e período preferidos", () => {
    const r = candidatosDaVaga(
      [
        p({ id: "outroProf", profissionalId: "pedro" }),
        p({ id: "outroDia", janela: { dia: "2026-10-06" } }),
        p({ id: "manha", janela: { inicio: 9, fim: 12 } }),
        p({ id: "tarde", janela: { inicio: 13, fim: 18, dia: "2026-10-05" }, posicao: 9 }),
      ],
      vaga,
      servicos,
    );
    expect(r.map((x) => x.id)).toEqual(["tarde"]);
  });
  it("serviço que o profissional não faz não recebe a vaga", () => {
    expect(candidatosDaVaga([p({ id: "a", servicoId: "barba" })], vaga, servicos)).toEqual([]);
  });
  it("segue a ordem da fila e pula quem já recebeu esta vaga", () => {
    const fila = [p({ id: "b", posicao: 2 }), p({ id: "a", posicao: 1 }), p({ id: "c", posicao: 3 })];
    expect(candidatosDaVaga(fila, vaga, servicos, new Set(["a"])).map((x) => x.id)).toEqual(["b", "c"]);
  });
  it("sem espaço suficiente até o próximo atendimento, ninguém é chamado", () => {
    expect(candidatosDaVaga([p({ id: "a" })], { ...vaga, livreAteMs: inicio + 0.5 * H }, servicos)).toEqual([]);
  });
});
