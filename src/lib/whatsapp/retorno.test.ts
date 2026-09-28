import { describe, expect, it } from "vitest";
import { prazoDeRetornoMs, selecionarCandidatosAoRetorno } from "./lembretes.server";
import { estaNaHoraDeVoltar } from "@/lib/retorno";

const DIA = 86_400_000;
const agora = Date.UTC(2026, 8, 28, 12);

describe("retorno por serviço", () => {
  it("usa o prazo do serviço quando existe; senão o prazo geral de 30 dias", () => {
    expect(prazoDeRetornoMs([{ id: "a", inicio: 0, status: "finalizado", retornoDias: 15 }])).toBe(15 * DIA);
    expect(prazoDeRetornoMs([{ id: "a", inicio: 0, status: "finalizado", retornoDias: null }])).toBe(30 * DIA);
  });
  it("manicure de 15 dias é avisada no dia 15, corte sem prazo não", () => {
    const manicure = [{ id: "m", inicio: agora - 15 * DIA, status: "finalizado", retornoDias: 15 }];
    const semPrazo = [{ id: "c", inicio: agora - 15 * DIA, status: "finalizado", retornoDias: null }];
    expect(selecionarCandidatosAoRetorno([manicure, semPrazo], agora)).toEqual(["m"]);
  });
  it("não envia quando o cliente já tem horário futuro", () => {
    const lista = [
      { id: "m", inicio: agora - 15 * DIA, status: "finalizado", retornoDias: 15 },
      { id: "f", inicio: agora + 2 * DIA, status: "agendado", retornoDias: 15 },
    ];
    expect(selecionarCandidatosAoRetorno([lista], agora)).toEqual([]);
    expect(estaNaHoraDeVoltar(agora - DIA, true, agora)).toBe(false);
  });
  it("não repete o aviso do mesmo atendimento", () => {
    const lista = [{ id: "m", inicio: agora - 15 * DIA, status: "finalizado", retornoDias: 15 }];
    expect(selecionarCandidatosAoRetorno([lista], agora, new Set(["m"]))).toEqual([]);
  });
  it("hora de voltar: vencido nos últimos 30 dias", () => {
    expect(estaNaHoraDeVoltar(agora - 10 * DIA, false, agora)).toBe(true);
    expect(estaNaHoraDeVoltar(agora - 40 * DIA, false, agora)).toBe(false);
    expect(estaNaHoraDeVoltar(agora + DIA, false, agora)).toBe(false);
  });
});
