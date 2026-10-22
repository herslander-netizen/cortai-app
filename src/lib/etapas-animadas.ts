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
const reduzida = { duration: 0.15, ease: CURVA.rapidaParaLenta } as const;

export type CustomDaEtapa = { sentido: SentidoDaEtapa; menosMovimento: boolean };

export const variantesDaEtapa = {
  entra: ({ sentido, menosMovimento }: CustomDaEtapa) =>
    menosMovimento ? { opacity: 0 } : { opacity: 0, x: `${sentido * 100}%` },
  fica: ({ menosMovimento }: CustomDaEtapa) => ({
    opacity: 1,
    x: "0%",
    transition: menosMovimento ? reduzida : transicao,
  }),
  sai: ({ sentido, menosMovimento }: CustomDaEtapa) =>
    menosMovimento
      ? { opacity: 0, transition: reduzida }
      : { opacity: 0, x: `${-sentido * 100}%`, transition: transicao },
};
