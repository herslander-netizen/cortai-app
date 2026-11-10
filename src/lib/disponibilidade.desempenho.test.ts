import { describe, expect, it } from "vitest";
import { horariosDisponiveis, proximosDiasNoFuso, type Ocupado } from "./disponibilidade";
import { isoNoFusoDaBarbearia, type HorarioDeFuncionamento } from "./horarios";

const fuso = "America/Maceio";
const horarios: HorarioDeFuncionamento[] = Array.from({ length: 7 }, (_, diaSemana) => ({
  diaSemana,
  fechado: false,
  abre: "09:00",
  fecha: "18:00",
}));
const dias = proximosDiasNoFuso(14, fuso, new Date("2026-11-10T12:00:00Z").getTime());
const ocupados: Ocupado[] = dias.flatMap((dia) =>
  ["a", "b"].flatMap((profissional_id) =>
    ["10:00", "11:00", "14:00", "16:00"].map((hora) => ({
      profissional_id,
      inicio: isoNoFusoDaBarbearia(dia, hora, fuso),
      fim: isoNoFusoDaBarbearia(dia, hora.replace(":00", ":30"), fuso),
    })),
  ),
);

describe("regressão: selecionar serviço no chat público", () => {
  it("não recria centenas de formatadores por clique (14 dias, 2 profissionais)", () => {
    const Original = Intl.DateTimeFormat;
    let criacoes = 0;
    const Interceptado = new Proxy(Original, {
      construct(target, args) {
        criacoes += 1;
        return Reflect.construct(target, args);
      },
      apply(target, thisArg, args) {
        criacoes += 1;
        return Reflect.apply(target, thisArg, args);
      },
    });
    Object.defineProperty(Intl, "DateTimeFormat", { configurable: true, value: Interceptado });
    let opcoes = 0;
    const inicio = performance.now();
    try {
      for (const dia of dias) {
        opcoes += horariosDisponiveis({
          dia,
          servico: { id: "corte", duracao_min: 30 },
          profissionais: [{ id: "a" }, { id: "b" }],
          escolhido: "qualquer",
          horarios,
          fuso,
          ocupados,
          regras: { antecedenciaMin: 0, intervaloEntreMin: 0 },
          agora: new Date("2026-11-10T00:00:00Z").getTime(),
          passoMin: 15,
        }).opcoes.length;
      }
    } finally {
      Object.defineProperty(Intl, "DateTimeFormat", { configurable: true, value: Original });
    }
    console.info(`[perfil agendamento] slots=${opcoes} intl=${criacoes} duracaoMs=${Math.round(performance.now() - inicio)}`);
    expect(opcoes).toBeGreaterThan(0);
    expect(criacoes).toBeLessThan(100);
  });
});
