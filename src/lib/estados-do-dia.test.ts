import { describe, expect, it } from "vitest";

import { estadosDoDia } from "./disponibilidade";
import { candidatosDaVaga, type PreferenciaDaFila } from "./fila-compatibilidade";
import type { HorarioDeFuncionamento } from "./horarios";

const SP = "America/Sao_Paulo";
// 2026-10-01 é quinta. 09–20h, intervalo 12–13h.
const horarios: HorarioDeFuncionamento[] = [
  {
    diaSemana: 4,
    fechado: false,
    abre: "09:00",
    fecha: "20:00",
    intervaloInicio: "12:00",
    intervaloFim: "13:00",
  },
];
// 10:00–10:45 em São Paulo = 13:00–13:45Z.
const joao = {
  profissional_id: "a",
  inicio: "2026-10-01T13:00:00Z",
  fim: "2026-10-01T13:45:00Z",
  cliente: "João",
};
const base = {
  dia: "2026-10-01",
  horarios,
  fuso: SP,
  regras: { antecedenciaMin: 0, intervaloEntreMin: 0 },
  agora: new Date("2026-09-30T12:00:00Z").getTime(),
  servico: { id: "s", duracao_min: 30 },
};
const estado = (r: ReturnType<typeof estadosDoDia>, label: string) =>
  r.horarios.find((h) => h.label === label)?.estado;

describe("estadosDoDia", () => {
  it("mostra livre e ocupado com quem ocupa; 45 min bloqueia 10:30", () => {
    const r = estadosDoDia({
      ...base,
      profissionais: [{ id: "a" }],
      escolhido: "a",
      ocupados: [joao],
    });
    expect(estado(r, "09:30")).toBe("livre");
    expect(estado(r, "10:00")).toBe("ocupado");
    expect(estado(r, "10:30")).toBe("ocupado");
    expect(estado(r, "11:00")).toBe("livre");
    expect(r.horarios.find((h) => h.label === "10:00")?.ocupantes[0]?.cliente).toBe("João");
  });

  it("intervalo do negócio e bloqueio viram bloqueado, não ocupado", () => {
    const r = estadosDoDia({
      ...base,
      profissionais: [{ id: "a" }],
      escolhido: "a",
      ocupados: [
        {
          profissional_id: "a",
          inicio: "2026-10-01T17:00:00Z",
          fim: "2026-10-01T18:00:00Z",
          bloqueio: true,
        },
      ],
    });
    expect(estado(r, "12:00")).toBe("bloqueado");
    expect(estado(r, "14:00")).toBe("bloqueado");
  });

  it("qualquer profissional: livre se alguém está livre; ocupado só se todos estão", () => {
    const um = estadosDoDia({
      ...base,
      profissionais: [{ id: "a" }, { id: "b" }],
      escolhido: "qualquer",
      ocupados: [joao],
    });
    expect(estado(um, "10:00")).toBe("livre");
    expect(um.horarios.find((h) => h.label === "10:00")?.profId).toBe("b");
    const todos = estadosDoDia({
      ...base,
      profissionais: [{ id: "a" }, { id: "b" }],
      escolhido: "qualquer",
      ocupados: [joao, { ...joao, profissional_id: "b", cliente: "Ana" }],
    });
    expect(estado(todos, "10:00")).toBe("ocupado");
  });

  it("folga entre atendimentos conta como ocupado", () => {
    const r = estadosDoDia({
      ...base,
      regras: { antecedenciaMin: 0, intervaloEntreMin: 20 },
      profissionais: [{ id: "a" }],
      escolhido: "a",
      ocupados: [joao],
    });
    expect(estado(r, "11:00")).toBe("ocupado");
  });
});

describe("lista de espera por horário específico", () => {
  const p = (x: Partial<PreferenciaDaFila>): PreferenciaDaFila => ({
    id: "x",
    posicao: 1,
    criadoEm: "2026-10-01T00:00:00Z",
    profissionalId: null,
    servicoId: null,
    janela: { espera: true } as PreferenciaDaFila["janela"],
    ...x,
  });
  const inicio = Date.UTC(2026, 9, 2, 18, 0); // sexta 15:00 SP
  const vaga = {
    inicioMs: inicio,
    livreAteMs: inicio + 3600_000,
    profissionalId: "a",
    diaLocal: "2026-10-02",
    horaLocal: 15,
    horaMinLocal: "15:00",
    servicoLiberadoId: "s",
  };
  const servicos = new Map([["s", { id: "s", duracao_min: 30 }]]);

  it("quem pediu o horário exato vem primeiro; outro horário não combina", () => {
    const r = candidatosDaVaga(
      [
        p({ id: "geral", posicao: 1 }),
        p({ id: "exato", posicao: 5, janela: { dia: "2026-10-02", horario: "15:00" } }),
        p({ id: "outro", posicao: 2, janela: { dia: "2026-10-02", horario: "16:00" } }),
      ],
      vaga,
      servicos,
    );
    expect(r.map((c) => c.id)).toEqual(["exato", "geral"]);
  });

  it("só identifica candidatos — não cria reserva", () => {
    const fila = [p({ id: "a" })];
    candidatosDaVaga(fila, vaga, servicos);
    expect(fila).toHaveLength(1);
  });
});
