import { CURVA, TEMPO } from "@/lib/movimento-figaro";

/**
 * Troca de etapa dos cadastros no padrão do Figaro (`FigarooCreationFlowScaffold`, spec 5 §1.5):
 * o conteúdo desliza a largura inteira e esmaece em 220 ms; avançar entra pela direita, voltar pela
 * esquerda. Com "reduzir movimento", só esmaece.
 */
export type SentidoDaEtapa = 1 | -1;

export function sentidoDaEtapa(de: number, para: number): SentidoDaEtapa {
  return para >= de ? 1 : -1;
}

const transicao = { duration: TEMPO.etapaDeCadastro, ease: CURVA.rapidaParaLenta } as const;
const transicaoDeFluxo = { duration: TEMPO.etapaDeFluxo, ease: CURVA.rapidaParaLenta } as const;
const reduzida = { duration: 0.15, ease: CURVA.rapidaParaLenta } as const;

/**
 * `fluxo`: passos de um fluxo com NavHost interno (novo agendamento, cobrança): largura inteira,
 * 300 ms e sem esmaecer (spec 5 §1.4). Sem `fluxo`: cadastro em etapas, 220 ms com esmaecer (§1.5).
 */
export type CustomDaEtapa = { sentido: SentidoDaEtapa; menosMovimento: boolean; fluxo?: boolean };

export const variantesDaEtapa = {
  entra: ({ sentido, menosMovimento, fluxo }: CustomDaEtapa) =>
    menosMovimento ? { opacity: 0 } : { opacity: fluxo ? 1 : 0, x: `${sentido * 100}%` },
  fica: ({ menosMovimento, fluxo }: CustomDaEtapa) => ({
    opacity: 1,
    x: "0%",
    transition: menosMovimento ? reduzida : fluxo ? transicaoDeFluxo : transicao,
  }),
  sai: ({ sentido, menosMovimento, fluxo }: CustomDaEtapa) =>
    menosMovimento
      ? { opacity: 0, transition: reduzida }
      : {
          opacity: fluxo ? 1 : 0,
          x: `${-sentido * 100}%`,
          transition: fluxo ? transicaoDeFluxo : transicao,
        },
};
