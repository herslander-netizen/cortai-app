import { describe, expect, it } from "vitest";

import { agruparPorHorario, legendaDoHorario, posicaoDoAgora } from "./lista-horarios";

const hora = (iso: string) => iso.slice(11, 16);
const item = (inicio: string, duracaoMin = 45) => ({ inicio, duracaoMin });

describe("lista da Agenda por horário", () => {
  it("junta atendimentos que começam no mesmo horário, na ordem", () => {
    const grupos = agruparPorHorario(
      [item("2026-11-05T09:00:00Z"), item("2026-11-05T09:00:00Z"), item("2026-11-05T10:00:00Z")],
      hora,
    );
    expect(grupos.map((g) => [g.hora, g.itens.length])).toEqual([
      ["09:00", 2],
      ["10:00", 1],
    ]);
  });

  it("o marcador 'agora' fica antes do primeiro horário que ainda não começou", () => {
    const grupos = [
      { inicio: "2026-11-05T09:00:00Z" },
      { inicio: "2026-11-05T10:00:00Z" },
      { inicio: "2026-11-05T14:00:00Z" },
    ];
    expect(posicaoDoAgora(grupos, new Date("2026-11-05T11:30:00Z"))).toBe(2);
    expect(posicaoDoAgora(grupos, new Date("2026-11-05T08:00:00Z"))).toBe(0);
    expect(posicaoDoAgora(grupos, new Date("2026-11-05T15:00:00Z"))).toBe(3);
  });

  it("legenda discreta: duração quando é um só, quantidade quando são vários", () => {
    expect(legendaDoHorario([item("x", 40)])).toBe("40 min");
    expect(legendaDoHorario([item("x"), item("y"), item("z")])).toBe("3 atend.");
  });
});
