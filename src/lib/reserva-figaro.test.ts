import { describe, expect, it } from "vitest";

import {
  dataPorExtenso,
  horaFinal,
  horariosComProfissionais,
  mesEAno,
  rotuloDosProfissionais,
} from "./reserva-figaro";

const semana = [0, 1, 2, 3, 4, 5, 6].map((d) => ({
  diaSemana: d,
  fechado: false,
  abre: "09:00",
  fecha: "12:00",
}));

describe("reserva no padrão do Figaro", () => {
  it("rotula o primeiro profissional e quantos mais estão livres", () => {
    expect(
      rotuloDosProfissionais([{ nome: "Lucas Martins" }, { nome: "Rafael" }, { nome: "Diego" }]),
    ).toBe("Lucas +2");
    expect(rotuloDosProfissionais([{ nome: "Rafael Costa" }])).toBe("Rafael");
  });

  it("formata data, mês e hora final", () => {
    expect(dataPorExtenso("2026-08-28")).toBe("28 de Agosto");
    expect(mesEAno("2026-08-28")).toBe("Agosto, 2026");
    expect(horaFinal("09:15", 60)).toBe("10:15");
  });

  it("junta os profissionais livres em cada horário", () => {
    const profissionais = [
      { id: "a", nome: "Lucas Martins" },
      { id: "b", nome: "Rafael Costa" },
    ];
    const r = horariosComProfissionais({
      dia: "2026-08-28",
      servico: { id: "s", nome: "Corte", preco_centavos: 5000, duracao_min: 60 },
      profissionais,
      horarios: semana,
      fuso: "America/Sao_Paulo",
      // Lucas ocupado das 9h às 10h.
      ocupados: [
        {
          profissional_id: "a",
          inicio: "2026-08-28T12:00:00.000Z",
          fim: "2026-08-28T13:00:00.000Z",
        },
      ] as never,
      regras: { antecedenciaMin: 0, intervaloEntreMin: 0 },
      agora: new Date("2026-08-27T12:00:00Z").getTime(),
      passoMin: 60,
    });
    expect(r.fechado).toBe(false);
    expect(r.horarios.map((h) => h.label)).toEqual(["09:00", "10:00", "11:00"]);
    expect(r.horarios[0]!.profissionais.map((p) => p.nome)).toEqual(["Rafael Costa"]);
    expect(r.horarios[1]!.profissionais).toHaveLength(2);
  });
});
