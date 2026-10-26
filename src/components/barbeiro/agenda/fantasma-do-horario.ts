/**
 * Fantasma do horário original enquanto o cartão é editado (Figaro, `DurationChangeAlpha`, spec 2-agenda §4.6;
 * pedido do dono em 26/10: "uma imagem transparente para se atentar qual a hora estava", ao encurtar e ao
 * esticar). O fantasma é o horário original inteiro e só aparece quando o horário mostrado mudou.
 * Trabalha em minutos da grade; quem desenha converte para pixels.
 */
export type Faixa = { inicio: number; fim: number };

export function fantasmaDoHorario(original: Faixa, mostrado: Faixa): Faixa | null {
  if (original.fim <= original.inicio) return null;
  if (original.inicio === mostrado.inicio && original.fim === mostrado.fim) return null;
  return original;
}

/**
 * Como o fantasma aparece (dono, 26/10: "deixar o visual de acrescentar horário tão bonito como ficou o de diminuir"):
 * - encolheu: o cartão novo cabe no original → o original fica atrás, a 50%, com contorno em volta;
 * - cresceu: o original cabe no cartão novo → o pedaço acrescentado do próprio cartão fica a 50%
 *   (máscara, como o `DstIn` do Figaro) e o contorno envolve o cartão;
 * - moveu: só o original atrás, a 50%.
 */
export type FormaDoFantasma = "encolheu" | "cresceu" | "moveu";

export function formaDoFantasma(original: Faixa, mostrado: Faixa): FormaDoFantasma {
  if (mostrado.inicio >= original.inicio && mostrado.fim <= original.fim) return "encolheu";
  if (mostrado.inicio <= original.inicio && mostrado.fim >= original.fim) return "cresceu";
  return "moveu";
}
