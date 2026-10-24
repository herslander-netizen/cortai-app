/** Fatias da altura da tela nos dois estados da folha, como no Figaro (`Partial` abre na metade e arrasta até cheia). */
export const FOLHA_PARCIAL = 0.55;
export const FOLHA_CHEIA = 0.92;

export type EncaixeDaFolha = "fechar" | "parcial" | "cheio";

/**
 * Para onde a folha vai ao soltar a barrinha. `altura` é a altura em que o dedo largou, `inicio` a de quando
 * começou; `velocidade` em px/ms (negativa = subindo). Puxada rápida decide sozinha (uma etapa por vez);
 * sem puxada rápida, vale o estado mais próximo.
 */
export function decidirEncaixe(o: {
  altura: number;
  inicio: number;
  parcial: number;
  cheio: number;
  velocidade: number;
}): EncaixeDaFolha {
  const { altura, inicio, parcial, cheio, velocidade } = o;
  const subiu = velocidade < -0.5;
  const desceu = velocidade > 0.5;
  const comecouCheia = inicio >= (parcial + cheio) / 2;
  if (subiu) return "cheio";
  if (desceu) return comecouCheia ? "parcial" : "fechar";
  if (altura >= (parcial + cheio) / 2) return "cheio";
  if (altura >= parcial * 0.7) return "parcial";
  return "fechar";
}
