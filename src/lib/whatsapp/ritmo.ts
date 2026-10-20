/**
 * Ritmo de envio do número do negócio. Rajadas de um número não oficial (Evolution)
 * chamam atenção do WhatsApp; mensagens espaçadas e com teto parecem conversa normal.
 */

/** Pausa base entre envios em lote, em ms (varia entre 1× e 2×). */
export const PAUSA_ENTRE_ENVIOS = 1200;
/** Lembretes de 24h e retornos por varredura; o resto sai na varredura seguinte. */
export const TETO_DA_RODADA = 30;
/** Envios por hora de um mesmo negócio nos lotes que podem esperar (24h e retorno). */
export const TETO_POR_HORA = 60;

export function pausaVariavel(base: number, sorteio: number = Math.random()): number {
  return Math.round(base * (1 + Math.min(Math.max(sorteio, 0), 1)));
}
