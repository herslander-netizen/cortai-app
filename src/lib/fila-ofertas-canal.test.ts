import { describe, expect, it } from "vitest";
import { classificarImpedimentoDeOferta } from "./fila-ofertas-canal";

describe("fila — uma falha de leitura não é negação de consentimento", () => {
  it("preserva a vez quando a consulta de consentimento está indisponível", () => {
    expect(classificarImpedimentoDeOferta("Não foi possível confirmar o consentimento agora."))
      .toBe("incerta");
    expect(classificarImpedimentoDeOferta("Cliente não encontrado.")).toBe("incerta");
  });
  it("não tenta contato quando há bloqueio comprovado", () => {
    expect(classificarImpedimentoDeOferta("Telefone não confirmado pelo cliente."))
      .toBe("sem_canal");
    expect(classificarImpedimentoDeOferta("O cliente pediu para não receber mensagens (SAIR)."))
      .toBe("sem_canal");
    expect(classificarImpedimentoDeOferta("Cliente sem WhatsApp válido."))
      .toBe("sem_canal");
    expect(classificarImpedimentoDeOferta("Sem consentimento para lista de espera."))
      .toBe("sem_canal");
  });
});
