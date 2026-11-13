import { describe, expect, it } from "vitest";
import { classificarImpedimentoDeOferta } from "./fila-ofertas-canal";

describe("fila — uma falha de leitura não é negação de consentimento", () => {
  it("preserva a vez quando a consulta de consentimento está indisponível", () => {
    expect(classificarImpedimentoDeOferta("Não foi possível confirmar o consentimento agora."))
      .toBe("incerta");
    expect(classificarImpedimentoDeOferta("Cliente não encontrado.")).toBe("incerta");
  });
  it("libera a vez somente para negativas comprovadas do porteiro e consentimento", () => {
    const motivosConhecidos = [
      "Cliente sem WhatsApp válido.",
      "Telefone do cliente sem WhatsApp.",
      "A pessoa avisou que o número é errado.",
      "O cliente pediu para não receber mensagens (SAIR).",
      "Telefone não confirmado pelo cliente.",
      "Cliente sem consentimento para lembretes.",
      "Este telefone pediu para interromper as mensagens automáticas.",
      "Não existe consentimento válido para esta finalidade.",
      "Sem consentimento para lista de espera.",
    ];
    for (const motivo of motivosConhecidos) {
      expect(classificarImpedimentoDeOferta(motivo)).toBe("sem_canal");
    }
  });

  it("não salta cliente se o porteiro retornar erro novo ou inesperado", () => {
    const problemasIncerto = [
      "Cliente não encontrado.",
      "Não foi possível confirmar o consentimento agora.",
      "Falha temporária no banco de dados.",
      "Erro inesperado do serviço de consentimento.",
      "",
    ];
    for (const motivo of problemasIncerto) {
      expect(classificarImpedimentoDeOferta(motivo)).toBe("incerta");
    }
  });
});
