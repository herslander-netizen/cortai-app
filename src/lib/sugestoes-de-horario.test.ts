import { describe, expect, it } from "vitest";
import type { HorarioDeFuncionamento } from "./horarios";
import { sugestoesDeHorario } from "./sugestoes-de-horario";

const SP = "America/Sao_Paulo";
const servico = { id: "s1", duracao_min: 30, profissional_ids: null };
const regras = { antecedenciaMin: 0, intervaloEntreMin: 0 };
// 2026-10-22 é quinta-feira (diaSemana 4).
const quinta = (
  abre: string,
  fecha: string,
  pausa?: [string, string],
): HorarioDeFuncionamento[] => [
  {
    diaSemana: 4,
    fechado: false,
    abre,
    fecha,
    intervaloInicio: pausa?.[0] ?? null,
    intervaloFim: pausa?.[1] ?? null,
  },
];

describe("sugestoesDeHorario", () => {
  it("segue o expediente e o fuso do negócio, não uma grade fixa no relógio do servidor", () => {
    const sugestoes = sugestoesDeHorario({
      pedido: new Date("2026-10-22T13:00:00Z"), // 10:00 em São Paulo
      servico,
      profissionalId: "p1",
      horarios: quinta("06:00", "22:00"),
      fuso: SP,
      ocupados: [
        { profissional_id: "p1", inicio: "2026-10-22T09:00:00Z", fim: "2026-10-22T10:00:00Z" },
      ],
      regras,
      passoMin: 30,
      agora: new Date("2026-10-22T08:00:00Z").getTime(),
    });
    expect(sugestoes).toEqual([
      { iso: "2026-10-22T10:00:00.000Z", label: "07:00" },
      { iso: "2026-10-22T10:30:00.000Z", label: "07:30" },
      { iso: "2026-10-22T11:00:00.000Z", label: "08:00" },
      { iso: "2026-10-22T11:30:00.000Z", label: "08:30" },
    ]);
  });

  it("oferece horários depois das 19h quando o negócio funciona à noite", () => {
    const sugestoes = sugestoesDeHorario({
      pedido: new Date("2026-10-22T23:00:00Z"), // 20:00 em São Paulo
      servico,
      profissionalId: "p1",
      horarios: quinta("19:00", "23:00"),
      fuso: SP,
      ocupados: [],
      regras,
      passoMin: 30,
      agora: new Date("2026-10-22T12:00:00Z").getTime(),
      limite: 2,
    });
    expect(sugestoes.map((s) => s.label)).toEqual(["19:00", "19:30"]);
  });

  it("respeita pausa, passo, horário já passado e outros profissionais", () => {
    const sugestoes = sugestoesDeHorario({
      pedido: new Date("2026-10-22T15:00:00Z"),
      servico,
      profissionalId: "p1",
      horarios: quinta("11:00", "14:00", ["12:00", "13:00"]),
      fuso: SP,
      ocupados: [
        { profissional_id: "p2", inicio: "2026-10-22T16:00:00Z", fim: "2026-10-22T17:00:00Z" },
      ],
      regras,
      passoMin: 20,
      agora: new Date("2026-10-22T14:30:00Z").getTime(), // 11:30
      limite: 10,
    });
    // 11:40 terminaria às 12:10, dentro da pausa; 13:40 passaria do fechamento.
    expect(sugestoes.map((s) => s.label)).toEqual(["13:00", "13:20"]);
  });

  it("não sugere nada em dia fechado", () => {
    const sugestoes = sugestoesDeHorario({
      pedido: new Date("2026-10-23T13:00:00Z"), // sexta, sem expediente cadastrado
      servico,
      profissionalId: "p1",
      horarios: quinta("06:00", "22:00"),
      fuso: SP,
      ocupados: [],
      regras,
      passoMin: 30,
      agora: new Date("2026-10-22T08:00:00Z").getTime(),
    });
    expect(sugestoes).toEqual([]);
  });
});
