import { describe, expect, it } from "vitest";
import {
  conflitoDoCliente,
  escolherProfissional,
  horariosDisponiveis,
  motivoForaDoHorario,
  profissionalLivre,
  profissionaisDoServico,
} from "./disponibilidade";
import type { HorarioDeFuncionamento } from "./horarios";

const t = (h: string) => new Date(`2026-10-01T${h}:00Z`).getTime();
const ocupados = [
  { profissional_id: "a", inicio: "2026-10-01T10:00:00Z", fim: "2026-10-01T10:30:00Z" },
];
const SP = "America/Sao_Paulo";
// 2026-10-01 é quinta (4). Horário 09-20 com intervalo 12-13; domingo fechado.
const horarios: HorarioDeFuncionamento[] = [
  {
    diaSemana: 4,
    fechado: false,
    abre: "09:00",
    fecha: "20:00",
    intervaloInicio: "12:00",
    intervaloFim: "13:00",
  },
  { diaSemana: 0, fechado: true, abre: "09:00", fecha: "18:00" },
];
const agoraCedo = new Date("2026-09-30T12:00:00Z").getTime();
const base = {
  dia: "2026-10-01",
  horarios,
  fuso: SP,
  ocupados: [],
  regras: { antecedenciaMin: 0, intervaloEntreMin: 0 },
  agora: agoraCedo,
};
const profs = [{ id: "a" }, { id: "b" }];

describe("disponibilidade", () => {
  it("bloqueia sobreposição", () =>
    expect(profissionalLivre("a", t("10:15"), t("10:45"), ocupados)).toBe(false));
  it("permite encostar no fim", () =>
    expect(profissionalLivre("a", t("10:30"), t("11:00"), ocupados)).toBe(true));
  it("não mistura profissionais", () =>
    expect(profissionalLivre("b", t("10:00"), t("10:30"), ocupados)).toBe(true));

  it("serviço que passa do fechamento não aparece", () => {
    const r = horariosDisponiveis({
      ...base,
      servico: { id: "s", duracao_min: 75 },
      profissionais: profs,
      escolhido: "qualquer",
    });
    const labels = r.opcoes.map((o) => o.label);
    expect(labels).toContain("18:30");
    expect(labels).not.toContain("19:00");
    expect(labels).not.toContain("19:30");
  });

  it("serviço longo não invade o intervalo do dia", () => {
    const r = horariosDisponiveis({
      ...base,
      servico: { id: "s", duracao_min: 60 },
      profissionais: profs,
      escolhido: "qualquer",
    });
    const labels = r.opcoes.map((o) => o.label);
    expect(labels).toContain("11:00");
    expect(labels).not.toContain("11:30");
    expect(labels).not.toContain("12:30");
    expect(labels).toContain("13:00");
  });

  it("dia fechado", () => {
    const r = horariosDisponiveis({
      ...base,
      dia: "2026-10-04",
      servico: { id: "s", duracao_min: 30 },
      profissionais: profs,
      escolhido: "qualquer",
    });
    expect(r.fechado).toBe(true);
    expect(
      motivoForaDoHorario(new Date("2026-10-04T13:00:00Z").getTime(), 30, horarios, SP),
    ).toMatch(/não abre/);
  });

  it("servidor recusa fora do horário e no intervalo (fuso da barbearia)", () => {
    // 22:30Z = 19:30 em São Paulo; 75 min passa das 20:00.
    expect(
      motivoForaDoHorario(new Date("2026-10-01T22:30:00Z").getTime(), 75, horarios, SP),
    ).toMatch(/não cabe/);
    // 14:30Z = 11:30 SP; 60 min invade 12:00.
    expect(
      motivoForaDoHorario(new Date("2026-10-01T14:30:00Z").getTime(), 60, horarios, SP),
    ).toMatch(/intervalo/);
    expect(
      motivoForaDoHorario(new Date("2026-10-01T13:00:00Z").getTime(), 60, horarios, SP),
    ).toBeNull();
  });

  it("fuso da barbearia muda a hora real", () => {
    const r = horariosDisponiveis({
      ...base,
      fuso: "America/Manaus",
      servico: { id: "s", duracao_min: 30 },
      profissionais: profs,
      escolhido: "a",
    });
    expect(r.opcoes[0]?.iso).toBe("2026-10-01T13:00:00.000Z"); // 09:00 em Manaus (UTC-4)
  });

  it("antecedência mínima esconde horários próximos", () => {
    const agora = new Date("2026-10-01T12:10:00Z").getTime(); // 09:10 SP
    const r = horariosDisponiveis({
      ...base,
      agora,
      regras: { antecedenciaMin: 60, intervaloEntreMin: 0 },
      servico: { id: "s", duracao_min: 30 },
      profissionais: profs,
      escolhido: "a",
    });
    expect(r.opcoes[0]?.label).toBe("10:30");
  });

  it("intervalo entre atendimentos", () => {
    const oc = [
      { profissional_id: "a", inicio: "2026-10-01T13:00:00Z", fim: "2026-10-01T13:30:00Z" },
    ]; // 10:00-10:30 SP
    const r = horariosDisponiveis({
      ...base,
      ocupados: oc,
      regras: { antecedenciaMin: 0, intervaloEntreMin: 10 },
      servico: { id: "s", duracao_min: 30 },
      profissionais: profs,
      escolhido: "a",
    });
    const labels = r.opcoes.map((o) => o.label);
    expect(labels).not.toContain("09:30");
    expect(labels).not.toContain("10:30");
    expect(labels).toContain("11:00");
  });

  it("serviço × profissional", () => {
    expect(
      profissionaisDoServico({ id: "s", duracao_min: 30, profissional_ids: ["b"] }, profs),
    ).toEqual([{ id: "b" }]);
    expect(
      profissionaisDoServico({ id: "s", duracao_min: 30, profissional_ids: [] }, profs),
    ).toHaveLength(2);
    const r = horariosDisponiveis({
      ...base,
      servico: { id: "s", duracao_min: 30, profissional_ids: ["b"] },
      profissionais: profs,
      escolhido: "a",
    });
    expect(r.opcoes).toHaveLength(0);
  });

  it("qualquer profissional escolhe quem tem menos atendimentos no dia", () => {
    const oc = [
      { profissional_id: "a", inicio: "2026-10-01T18:00:00Z", fim: "2026-10-01T18:30:00Z" },
      { profissional_id: "a", inicio: "2026-10-01T19:00:00Z", fim: "2026-10-01T19:30:00Z" },
    ];
    expect(escolherProfissional(["a", "b"], "2026-10-01", oc, SP)).toBe("b");
    const r = horariosDisponiveis({
      ...base,
      ocupados: oc,
      servico: { id: "s", duracao_min: 30 },
      profissionais: profs,
      escolhido: "qualquer",
    });
    expect(r.opcoes[0]?.profId).toBe("b");
  });

  it("mesmo cliente com horário sobreposto", () => {
    const meus = [{ id: "x", inicio: "2026-10-01T18:00:00Z", fim: "2026-10-01T18:30:00Z" }];
    expect(conflitoDoCliente(meus, t("18:15"), t("18:45"))?.id).toBe("x");
    expect(conflitoDoCliente(meus, t("18:15"), t("18:45"), "x")).toBeNull();
    expect(conflitoDoCliente(meus, t("18:30"), t("19:00"))).toBeNull();
  });
});
