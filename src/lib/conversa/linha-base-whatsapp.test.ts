import { describe, expect, it } from "vitest";

import { avaliarCorpus } from "../whatsapp/motor/corpus/avaliar";
import { avisaNumeroErrado } from "../whatsapp/porteiro";

/**
 * Medicao de linha de base do Flow: nenhuma API, chamada de IA ou dado real.
 * O teste so observa o motor atual e imprime os numeros no CI.
 *
 * Nao duplica os pisos de regressao de whatsapp/motor/corpus/avaliar.test.ts.
 * P2 (numero errado em negacao de agendamento) foi corrigido no porteiro em 14/11
 * e fica travado aqui em zero.
 */
describe("linha de base do entendimento gratuito do WhatsApp", () => {
  it("mede corpus e falsos positivos sem alterar o atendimento", () => {
    const avaliacao = avaliarCorpus();
    const frasesLegitimas = [
      "Nao agendei ainda, quero marcar um corte",
      "Eu nao marquei nada, queria agendar amanha",
      "Nao agendei para sexta, queria perguntar os horarios",
    ];
    const bloqueiosIndevidos = frasesLegitimas.filter(avisaNumeroErrado);

    const taxa = (n: number) => Number((n * 100).toFixed(2));
    const resumo = {
      frases: avaliacao.geral.total,
      suportadas: {
        acertos: avaliacao.suportadas.certos,
        total: avaliacao.suportadas.total,
        taxaPct: taxa(avaliacao.suportadas.taxa),
      },
      semSuporte: avaliacao.semSuporte,
      disparosIndevidos: avaliacao.disparosIndevidos.length,
      variacoes: {
        acertos: avaliacao.variacoes.certos,
        total: avaliacao.variacoes.total,
        taxaPct: taxa(avaliacao.variacoes.taxa),
      },
      entidades: {
        acertos: avaliacao.entidades.certos,
        total: avaliacao.entidades.total,
        taxaPct: taxa(avaliacao.entidades.taxa),
      },
      possiveisSupressoesIndevidasP2: bloqueiosIndevidos.length,
      p2Exemplos: bloqueiosIndevidos,
    };

    // Mensagem visivel no log do Vitest / GitHub Actions para orientar a Fase 0.
    console.info("[flow-corpus-linha-base]", JSON.stringify(resumo));
    expect(bloqueiosIndevidos).toEqual([]);
    expect(avaliacao.geral.total).toBeGreaterThanOrEqual(390);
    expect(avaliacao.suportadas.total).toBeGreaterThan(0);
    expect(avaliacao.entidades.total).toBeGreaterThan(0);
  });
});
