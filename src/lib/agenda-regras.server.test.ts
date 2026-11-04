import { afterEach, describe, expect, it, vi } from "vitest";

const estado = vi.hoisted(() => ({
  extras: [] as { profissional_id: string; inicio: string; fim: string; bloqueio?: boolean }[],
  especiais: [] as Record<string, unknown>[],
}));

vi.mock("@/lib/horarios-especiais.server", () => ({
  horariosDaSemana: async () => [],
  horariosEspeciaisDoPeriodo: async () => estado.especiais,
}));

vi.mock("@/lib/ocupacoes-extras.server", () => ({
  ocupacoesExtras: async () => estado.extras,
}));

import { validarAgendamento } from "./agenda-regras.server";

const agora = "2026-11-04T14:00:00.000Z"; // 11:00 no fuso de São Paulo
const profissionalId = "profissional-1";
const servico = { id: "servico-1", duracao_min: 30, profissional_ids: [profissionalId] };

function horario(dia_semana: number) {
  return {
    dia_semana,
    fechado: false,
    abre: "09:00",
    fecha: "18:00",
    intervalo_inicio: "12:00",
    intervalo_fim: "13:00",
  };
}

function criarConsulta(data: unknown) {
  const filtros: [string, unknown][] = [];
  const resultado = { data, error: null };
  const consulta: Record<string, unknown> = {};
  const encadear = () => consulta;

  for (const metodo of ["select", "eq", "gte", "lte", "in", "lt", "gt", "neq", "order", "limit"]) {
    consulta[metodo] = (...args: unknown[]) => {
      if (metodo === "eq" && typeof args[0] === "string") filtros.push([args[0], args[1]]);
      return encadear();
    };
  }

  consulta["maybeSingle"] = async () => resultado;
  consulta["then"] = (
    cumprida?: (value: typeof resultado) => unknown,
    rejeitada?: (reason: unknown) => unknown,
  ) => Promise.resolve(resultado).then(cumprida, rejeitada);

  return { consulta, filtros };
}

function criarBanco(intervalos: Record<string, unknown>[] = [], agendamentos: Record<string, unknown>[] = []) {
  const horarios = Array.from({ length: 7 }, (_, dia) => horario(dia));
  return {
    from(tabela: string) {
      const dados =
        tabela === "tenants"
          ? {
              fuso: "America/Sao_Paulo",
              antecedencia_min_minutos: 60,
              intervalo_entre_min: 0,
              janela_agendamento_dias: 7,
              passo_horarios_min: 30,
            }
          : tabela === "horarios_de_funcionamento"
            ? horarios
            : tabela === "intervalos_agenda_dia"
              ? intervalos
              : tabela === "agendamentos"
                ? agendamentos
                : [];
      return criarConsulta(dados).consulta;
    },
  };
}

function pedido(
  inicio: string,
  extras: { contexto?: "cliente" | "equipe"; servico?: typeof servico } = {},
) {
  return {
    tenantId: "tenant-1",
    servico: extras.servico ?? servico,
    profissionalId,
    inicio: new Date(inicio),
    clienteId: null,
    contexto: extras.contexto,
  };
}

afterEach(() => {
  vi.useRealTimers();
  estado.extras = [];
  estado.especiais = [];
});

describe("validarAgendamento — contexto da equipe", () => {
  it("mantém a antecedência mínima no contexto público", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(agora));

    await expect(
      validarAgendamento(criarBanco(), pedido("2026-11-04T14:05:00.000Z")),
    ).rejects.toThrow(/1 h de antecedência/);
  });

  it("permite à equipe reagendar perto de agora e além da janela pública", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(agora));

    await expect(
      validarAgendamento(criarBanco(), pedido("2026-11-04T14:05:00.000Z", { contexto: "equipe" })),
    ).resolves.toBeNull();

    await expect(
      validarAgendamento(criarBanco(), pedido("2026-12-04T14:00:00.000Z", { contexto: "equipe" })),
    ).resolves.toBeNull();
  });

  it("continua recusando horários fora do expediente no contexto da equipe", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(agora));

    await expect(
      validarAgendamento(criarBanco(), pedido("2026-11-04T22:00:00.000Z", { contexto: "equipe" })),
    ).rejects.toThrow(/não cabe no funcionamento/);
  });

  it("continua recusando horários que invadem a pausa semanal", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(agora));

    await expect(
      validarAgendamento(criarBanco(), pedido("2026-11-04T15:30:00.000Z", { contexto: "equipe" })),
    ).rejects.toThrow(/invade o intervalo/);
  });

  it("usa a exceção de intervalo cadastrada para a data", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(agora));
    const banco = criarBanco([
      {
        dia: "2026-11-04",
        intervalo_inicio: "13:00",
        intervalo_fim: "14:00",
      },
    ]);

    await expect(
      validarAgendamento(banco, pedido("2026-11-04T15:30:00.000Z", { contexto: "equipe" })),
    ).resolves.toBeNull();
  });

  it("aceita a ampliação de expediente configurada como horário especial", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(agora));
    estado.especiais = [
      {
        dia: "2026-11-04",
        profissionalId: null,
        abre: "08:00",
        fecha: "20:00",
      },
    ];

    await expect(
      validarAgendamento(
        criarBanco(),
        pedido("2026-11-04T11:30:00.000Z", { contexto: "equipe" }), // 08:30 em São Paulo
      ),
    ).resolves.toBeNull();
  });


  it("continua respeitando bloqueios e escala como ocupações", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(agora));
    estado.extras = [
      {
        profissional_id: profissionalId,
        inicio: "2026-11-04T14:00:00.000Z",
        fim: "2026-11-04T14:30:00.000Z",
        bloqueio: true,
      },
    ];

    await expect(
      validarAgendamento(criarBanco(), pedido("2026-11-04T14:05:00.000Z", { contexto: "equipe" })),
    ).rejects.toThrow(/bloqueado na agenda/);
  });

  it("continua verificando a compatibilidade entre serviço e profissional", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(agora));

    await expect(
      validarAgendamento(
        criarBanco(),
        pedido("2026-11-04T14:05:00.000Z", {
          contexto: "equipe",
          servico: { ...servico, profissional_ids: ["outro-profissional"] },
        }),
      ),
    ).rejects.toThrow(/não faz esse serviço/);
  });
});
