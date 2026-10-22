/**
 * Trecho visual da alteração de duração: ao estender, destaca o tempo acrescentado; ao encurtar
 * ou mover, destaca o trecho original que deixou de valer. Decisão do dono em 22/10.
 * Trabalha em milissegundos, sem depender do fuso; quem desenha converte para a grade.
 */
export type Faixa = { inicio: number; fim: number };

export function trechosDoAjuste(original: Faixa, novo: Faixa): Faixa[] {
  if (original.fim <= original.inicio) return [];
  // Ao aumentar só a duração, destaca exatamente o trecho novo que está sendo acrescentado.
  if (novo.inicio === original.inicio && novo.fim > original.fim) {
    return [{ inicio: original.fim, fim: novo.fim }];
  }
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
