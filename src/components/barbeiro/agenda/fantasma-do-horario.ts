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
