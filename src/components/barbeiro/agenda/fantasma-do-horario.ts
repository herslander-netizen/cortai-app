/**
 * Trechos do horário original que saem do horário proposto (Figaro, `DurationChangeAlpha`, spec 2-agenda §4.6):
 * quando o cartão encurta ou sai do lugar, a parte que deixou de valer fica desenhada translúcida (α 0.5).
 * Trabalha em milissegundos, para não depender do fuso; quem desenha converte para a grade.
 */
export type Faixa = { inicio: number; fim: number };

export function trechosQueSaem(original: Faixa, novo: Faixa): Faixa[] {
  if (original.fim <= original.inicio) return [];
  // Sem sobreposição: o horário inteiro original saiu.
  if (novo.fim <= original.inicio || novo.inicio >= original.fim) return [original];
  const trechos: Faixa[] = [];
  if (novo.inicio > original.inicio) {
    trechos.push({ inicio: original.inicio, fim: novo.inicio });
  }
  if (novo.fim < original.fim) {
    trechos.push({ inicio: novo.fim, fim: original.fim });
  }
  return trechos.filter((t) => t.fim > t.inicio);
}
