/** Fatias da altura da tela nos dois estados da folha, como no Figaro (`Partial` abre na metade e arrasta até cheia). */
// Ficha da Agenda (dono, 26/10: "abrir essa gaveta parcial e aparecer mais informações"): 62% da tela.
export const FOLHA_PARCIAL = 0.62;
// Cheia vai até a tela toda: tudo visível, sem rolagem (dono, 26/10).
export const FOLHA_CHEIA = 1;

export type EncaixeDaFolha = "fechar" | "parcial" | "cheio";

/** Quanto o dedo precisa andar para a folha mudar de estado (abaixo disso, volta para onde estava). */
export const DISTANCIA_PARA_MUDAR = 40;

/**
 * Para onde a folha vai ao soltar (dono, 26/10: "puxou ela abra com todas as informações visíveis, arrastou ou fechou
 * ela se recolhe toda"). `altura` é a altura em que o dedo largou, `inicio` a de quando começou; `velocidade` em px/ms
 * (negativa = subindo). Subiu → cheia; desceu → fecha de uma vez, de qualquer estado; quase parado → fica onde estava.
 */
export function decidirEncaixe(o: {
  altura: number;
  inicio: number;
  parcial: number;
  cheio: number;
  velocidade: number;
}): EncaixeDaFolha {
  const { altura, inicio, parcial, cheio, velocidade } = o;
  if (velocidade < -0.5) return "cheio";
  if (velocidade > 0.5) return "fechar";
  if (altura <= inicio - DISTANCIA_PARA_MUDAR) return "fechar";
  if (altura >= inicio + DISTANCIA_PARA_MUDAR) return "cheio";
  return inicio >= (parcial + cheio) / 2 ? "cheio" : "parcial";
}
