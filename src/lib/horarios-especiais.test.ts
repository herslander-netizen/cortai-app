import { describe, expect, it } from "vitest";

import { horariosDisponiveis } from "@/lib/disponibilidade";
import { horarioDoDia, type HorarioDeFuncionamento } from "@/lib/horarios";
import {
  bloqueiosDosHorariosEspeciais,
  horarioEspecialValido,
  janelaDoNegocioNoDia,
  janelaDoProfissional,
  type HorarioEspecial,
} from "./horarios-especiais";

// 2026-11-06 é sexta (5); 2026-11-08 é domingo (0, fechado).
const SEXTA = "2026-11-06";
const DOMINGO = "2026-11-08";
const FUSO = "America/Sao_Paulo";
const semana: HorarioDeFuncionamento[] = [0, 1, 2, 3, 4, 5, 6].map((d) => ({
  diaSemana: d,
  fechado: d === 0,
  abre: "09:00",
  fecha: "18:00",
  intervaloInicio: "12:00",
  intervaloFim: "13:00",
}));

const negocio = (abre: string, fecha: string, dia = SEXTA): HorarioEspecial => ({
  dia,
  profissionalId: null,
  abre,
  fecha,
});
const prof = (id: string, abre: string, fecha: string, dia = SEXTA): HorarioEspecial => ({
  dia,
  profissionalId: id,
  abre,
  fecha,
});

describe("janelaDoNegocioNoDia", () => {
  it("sem horário especial na data, vale o da semana", () => {
    expect(janelaDoNegocioNoDia(SEXTA, semana, [])).toBeNull();
    expect(
      janelaDoNegocioNoDia(SEXTA, semana, [negocio("07:00", "21:00", "2026-11-07")]),
    ).toBeNull();
  });
  it("o especial do negócio troca a janela do dia", () => {
    expect(janelaDoNegocioNoDia(SEXTA, semana, [negocio("07:00", "21:00")])).toEqual({
      abre: "07:00",
      fecha: "21:00",
    });
  });
  it("um profissional que estende alarga a janela do negócio (união)", () => {
    expect(janelaDoNegocioNoDia(SEXTA, semana, [prof("ana", "09:00", "21:00")])).toEqual({
      abre: "09:00",
      fecha: "21:00",
    });
    expect(janelaDoNegocioNoDia(SEXTA, semana, [prof("ana", "07:00", "12:00")])).toEqual({
      abre: "07:00",
      fecha: "18:00",
    });
  });
  it("abre um dia fechado na semana", () => {
    expect(janelaDoNegocioNoDia(DOMINGO, semana, [prof("ana", "10:00", "14:00", DOMINGO)])).toEqual(
      {
        abre: "10:00",
        fecha: "14:00",
      },
    );
  });
});

describe("janelaDoProfissional", () => {
  it("usa o próprio especial, senão o do negócio, senão o da semana", () => {
    const especiais = [negocio("08:00", "20:00"), prof("ana", "07:00", "21:00")];
    expect(janelaDoProfissional(SEXTA, semana, especiais, "ana")).toEqual({
      inicio: 420,
      fim: 1260,
    });
    expect(janelaDoProfissional(SEXTA, semana, especiais, "bia")).toEqual({
      inicio: 480,
      fim: 1200,
    });
    expect(janelaDoProfissional(SEXTA, semana, [], "bia")).toEqual({ inicio: 540, fim: 1080 });
    expect(janelaDoProfissional(DOMINGO, semana, [], "bia")).toBeNull();
  });
});

describe("bloqueiosDosHorariosEspeciais", () => {
  it("quem não estende fica bloqueado só na parte a mais", () => {
    const b = bloqueiosDosHorariosEspeciais({
      dia: SEXTA,
      horarios: semana,
      especiais: [prof("ana", "09:00", "21:00")],
      profissionalIds: ["ana", "bia"],
      fuso: FUSO,
    });
    expect(b).toEqual([
      // 18:00–21:00 em São Paulo (UTC−3).
      {
        profissional_id: "bia",
        inicio: "2026-11-06T21:00:00.000Z",
        fim: "2026-11-07T00:00:00.000Z",
        bloqueio: true,
      },
    ]);
  });
  it("num dia fechado, quem não tem especial fica bloqueado na janela toda", () => {
    const b = bloqueiosDosHorariosEspeciais({
      dia: DOMINGO,
      horarios: semana,
      especiais: [prof("ana", "10:00", "14:00", DOMINGO)],
      profissionalIds: ["ana", "bia"],
      fuso: FUSO,
    });
    expect(b).toEqual([
      {
        profissional_id: "bia",
        inicio: "2026-11-08T13:00:00.000Z",
        fim: "2026-11-08T17:00:00.000Z",
        bloqueio: true,
      },
    ]);
  });
  it("quem tem escala no dia e nenhum especial próprio segue a escala", () => {
    const b = bloqueiosDosHorariosEspeciais({
      dia: SEXTA,
      horarios: semana,
      especiais: [negocio("07:00", "21:00")],
      profissionalIds: ["ana", "bia"],
      fuso: FUSO,
      comEscala: new Set(["bia"]),
    });
    expect(b).toEqual([]);
  });
});

describe("motor com o horário especial", () => {
  it("o dia estendido oferece horários depois do fechamento da semana", () => {
    const ajustes = { [SEXTA]: { abre: "09:00", fecha: "21:00" } };
    expect(horarioDoDia(SEXTA, semana, ajustes)).toMatchObject({
      fechado: false,
      abre: "09:00",
      fecha: "21:00",
      intervaloInicio: "12:00",
    });
    const { opcoes } = horariosDisponiveis({
      dia: SEXTA,
      servico: { id: "s1", duracao_min: 60, profissional_ids: null },
      profissionais: [{ id: "ana" }],
      escolhido: "qualquer",
      horarios: semana,
      fuso: FUSO,
      ocupados: [],
      regras: { antecedenciaMin: 0, intervaloEntreMin: 0 },
      agora: Date.parse("2026-11-01T12:00:00Z"),
      passoMin: 60,
      intervalosPorData: ajustes,
    });
    expect(opcoes.map((o) => o.label)).toContain("20:00");
    expect(opcoes.map((o) => o.label)).not.toContain("12:00");
  });
  it("valida o horário especial", () => {
    expect(horarioEspecialValido("07:00", "21:00")).toBe(true);
    expect(horarioEspecialValido("21:00", "07:00")).toBe(false);
    expect(horarioEspecialValido("7:00", "21:00")).toBe(false);
  });
});
