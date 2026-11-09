import { describe, expect, it } from "vitest";

import { ocupacoesExtras, turnoEfetivo } from "./ocupacoes-extras.server";

const PROFISSIONAL = "191f788d-6040-44c6-bc85-555555555555";
const TENANT = "191f788d-6040-44c6-bc85-666666666666";
const DIA = "2026-11-09";

function simularBanco(
  registros: Record<string, unknown[]>,
  falhaEm?: string,
) {
  return {
    from(tabela: string) {
      const consulta = {
        select: () => consulta,
        eq: () => consulta,
        in: () => consulta,
        gte: () => consulta,
        lte: () => consulta,
        lt: () => consulta,
        gt: () => consulta,
        then(resolve: (value: unknown) => void) {
          resolve({
            data: registros[tabela] ?? [],
            error: tabela === falhaEm ? new Error("Falha simulada") : null,
          });
        },
      };
      return consulta;
    },
  };
}

const intervalo = {
  tenantId: TENANT,
  fuso: "America/Sao_Paulo",
  profissionalIds: [PROFISSIONAL],
  desde: new Date("2026-11-09T12:00:00Z"),
  ate: new Date("2026-11-09T21:00:00Z"),
};

describe("exceções de disponibilidade do profissional", () => {
  it("prefere a regra por data à folga semanal", () => {
    expect(turnoEfetivo(
      { trabalha: false, abre: null, fecha: null },
      { trabalha: true, abre: "10:00", fecha: "17:00" },
    )).toEqual({ trabalha: true, abre: "10:00", fecha: "17:00" });
  });

  it("libera a data especial no horário próprio, preservando bloqueios fora dele", async () => {
    const db = simularBanco({
      bloqueios_de_agenda: [],
      escalas_de_profissional: [
        { profissional_id: PROFISSIONAL, dia_semana: 1, trabalha: false, abre: null, fecha: null },
      ],
      excecoes_disponibilidade_profissional: [
        { profissional_id: PROFISSIONAL, dia: DIA, trabalha: true, abre: "10:00:00", fecha: "17:00:00" },
      ],
    });
    const ocupacoes = await ocupacoesExtras(db, intervalo);
    expect(ocupacoes).toHaveLength(2);
    expect(ocupacoes.every((o) => o.bloqueio === true)).toBe(true);
    expect(ocupacoes.some((o) => o.inicio.includes("T00:00") || o.fim.includes("T00:00"))).toBe(true);
  });

  it("marca o dia inteiro indisponível quando a exceção for folga", async () => {
    const db = simularBanco({
      bloqueios_de_agenda: [],
      escalas_de_profissional: [
        { profissional_id: PROFISSIONAL, dia_semana: 1, trabalha: true, abre: "09:00:00", fecha: "18:00:00" },
      ],
      excecoes_disponibilidade_profissional: [
        { profissional_id: PROFISSIONAL, dia: DIA, trabalha: false, abre: null, fecha: null },
      ],
    });
    const ocupacoes = await ocupacoesExtras(db, intervalo);
    expect(ocupacoes).toHaveLength(1);
    expect(Date.parse(ocupacoes[0]!.fim) - Date.parse(ocupacoes[0]!.inicio)).toBe(86_400_000);
  });

  it("falha fechado se não conseguir buscar exceções", async () => {
    const db = simularBanco({}, "excecoes_disponibilidade_profissional");
    await expect(ocupacoesExtras(db, intervalo)).rejects.toThrow("disponibilidade");
  });
});
