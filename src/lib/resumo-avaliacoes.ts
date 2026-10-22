/**
 * Resumo das avaliações no padrão do Figaro (`ratings/logic/state/RatingsQualitativeLabelKt`,
 * `designsystem/theme/ThemeKt.ratingTone`, `FigarooRatingStars`; spec 7 §10 e 1-design-system §1).
 * Só calcula a partir das notas que a tela já recebe; não busca nada novo.
 */

export type Estrela = "cheia" | "meia" | "vazia";
export type LinhaDaDistribuicao = { nota: 1 | 2 | 3 | 4 | 5; total: number; percentual: number };

/** Rótulo da média: abaixo de 0,05 não há nota; depois 2, 3, 4 e 4,5 separam as faixas. */
export function rotuloDaMedia(media: number | null): string {
  if (media === null || media < 0.05) return "—";
  if (media < 2) return "Insatisfatório";
  if (media < 3) return "Regular";
  if (media < 4) return "Satisfatório";
  if (media < 4.5) return "Muito bom";
  return "Excelente";
}

/** Cinco estrelas: cheia quando a média alcança a posição, meia quando falta até 0,5. */
export function estrelasDaMedia(media: number): Estrela[] {
  return [1, 2, 3, 4, 5].map((i) => (media >= i ? "cheia" : media >= i - 0.5 ? "meia" : "vazia"));
}

/** Quantas notas de cada valor, de 5 a 1, com o percentual inteiro como no Figaro (`count * 100 / total`). */
export function distribuicaoDasNotas(notas: number[]): LinhaDaDistribuicao[] {
  const total = notas.length;
  return ([5, 4, 3, 2, 1] as const).map((nota) => {
    const quantas = notas.filter((n) => n === nota).length;
    return {
      nota,
      total: quantas,
      percentual: total > 0 ? Math.floor((quantas * 100) / total) : 0,
    };
  });
}

/**
 * Cor da barra de cada nota. O Figaro usa verde (5), verde-água (4), amarelo (3), laranja (2) e
 * vermelho (1); no Cortaí só valem tokens, então ficam os tons mais próximos.
 */
export function tomDaNota(nota: number): string {
  if (nota >= 4.5) return "bg-sage";
  if (nota >= 3.5) return "bg-[var(--status-arrived)]";
  if (nota >= 2.5) return "bg-[var(--status-active)]";
  return "bg-brick";
}

/** Média com uma casa e vírgula ("4,6"), como na tela do Figaro. */
export function mediaFormatada(media: number): string {
  return media.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}
