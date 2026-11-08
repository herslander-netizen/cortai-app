import { describe, expect, it } from "vitest";
import { calcularIndicadoresCRM } from "./indicadores";

const AGORA = new Date("2026-11-08T12:00:00Z");
const FUSO = "America/Sao_Paulo";
const cliente = (id: string, criadoEm = "2026-11-01T12:00:00Z") => ({ id, criadoEm });
const visita = (clienteId: string | null, inicio: string, status = "finalizado") => ({
  clienteId, inicio, status,
});

describe("indicadores do CRM", () => {
  it("retorna seis meses com zeros quando não há registros", () => {
    const r = calcularIndicadoresCRM([], [], AGORA, FUSO);
    expect(r.serie).toHaveLength(6);
    expect(r.serie[0]?.mes).toBe("2026-06");
    expect(r.serie[5]?.mes).toBe("2026-11");
    expect(r.taxaRecorrencia).toBe(0);
  });

  it("não contabiliza agendamento futuro, cancelado nem falta como atendimento", () => {
    const r = calcularIndicadoresCRM(
      [cliente("1")],
      [
        visita("1", "2026-11-03T12:00:00Z", "cancelado"),
        visita("1", "2026-11-04T12:00:00Z", "nao_compareceu"),
        visita("1", "2026-11-10T12:00:00Z"),
        visita("1", "2026-11-05T12:00:00Z"),
      ],
      AGORA,
      FUSO,
    );
    expect(r.atendimentosMes).toBe(1);
    expect(r.clientesRecorrentes).toBe(0);
  });

  it("conta cliente recorrente apenas uma vez por mês mesmo com várias visitas", () => {
    const r = calcularIndicadoresCRM(
      [cliente("1"), cliente("2")],
      [
        visita("1", "2026-10-02T12:00:00Z"),
        visita("1", "2026-11-02T12:00:00Z"),
        visita("1", "2026-11-06T12:00:00Z"),
        visita("2", "2026-11-03T12:00:00Z"),
      ],
      AGORA,
      FUSO,
    );
    expect(r.atendimentosMes).toBe(3);
    expect(r.clientesQueRetornaramMes).toBe(1);
    expect(r.clientesRecorrentes).toBe(1);
    expect(r.taxaRecorrencia).toBe(50);
  });

  it("respeita mês no fuso do negócio e não o mês UTC", () => {
    const r = calcularIndicadoresCRM(
      [cliente("1", "2026-11-01T01:00:00Z")],
      [visita("1", "2026-11-01T01:00:00Z")],
      AGORA,
      FUSO,
    );
    expect(r.serie.find((x) => x.mes === "2026-10")?.novosClientes).toBe(1);
    expect(r.serie.find((x) => x.mes === "2026-10")?.atendimentosConcluidos).toBe(1);
    expect(r.novosClientesMes).toBe(0);
  });

  it("não transforma um agendamento de valor informado em pagamento", () => {
    const r = calcularIndicadoresCRM(
      [cliente("1")],
      [visita("1", "2026-11-05T12:00:00Z")],
      AGORA,
      FUSO,
    );
    expect(r).not.toHaveProperty("faturamento");
    expect(r).not.toHaveProperty("receita");
  });
});
