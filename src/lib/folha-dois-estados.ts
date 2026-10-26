/** Fatias da altura da tela nos dois estados da folha, como no Figaro (`Partial` abre na metade e arrasta até cheia). */
// Ficha da Agenda (dono, 26/10: "abrir essa gaveta parcial e aparecer mais informações"): 62% da tela.
export const FOLHA_PARCIAL = 0.62;
export const FOLHA_CHEIA = 0.92;

export type EncaixeDaFolha = "fechar" | "parcial" | "cheio";

/**
 * Para onde a folha vai ao soltar a barrinha. `altura` é a altura em que o dedo largou, `inicio` a de quando
 * começou; `velocidade` em px/ms (negativa = subindo). Para cima, vai à cheia; para baixo, **fecha de uma vez**
 * (uma puxada só, sem parar no meio: parar no parcial parecia travado). Sem puxada rápida, vale o estado mais próximo.
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
  const comecouCheia = inicio >= (parcial + cheio) / 2;
  // Quem desce da cheia largando abaixo de ~80% dela já quer fechar; do parcial, abaixo de 70% do parcial.
  if (comecouCheia) {
    if (altura >= cheio * 0.8) return "cheio";
    return "fechar";
  }
  if (altura >= (parcial + cheio) / 2) return "cheio";
  if (altura >= parcial * 0.7) return "parcial";
  return "fechar";
}
