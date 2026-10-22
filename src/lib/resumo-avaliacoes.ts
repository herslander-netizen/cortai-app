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
 * Cor de uma nota (`ThemeKt.ratingTone`): abaixo de 0,5 neutra; depois 1,5, 2,5, 3,5 e 4,5 separam
 * vermelho, laranja, amarelo, verde-água e verde. Vale para as barras (pela nota da linha) e para as
 * estrelas (pela média). Tokens `nota-*` com os valores do APK.
 */
export function tomDaNota(nota: number): { texto: string; fundo: string } {
  if (nota < 0.5) return { texto: "text-mute2", fundo: "bg-mute2" };
  if (nota < 1.5) return { texto: "text-nota-1", fundo: "bg-nota-1" };
  if (nota < 2.5) return { texto: "text-nota-2", fundo: "bg-nota-2" };
  if (nota < 3.5) return { texto: "text-nota-3", fundo: "bg-nota-3" };
  if (nota < 4.5) return { texto: "text-nota-4", fundo: "bg-nota-4" };
  return { texto: "text-nota-5", fundo: "bg-nota-5" };
}

/** Média com uma casa e vírgula ("4,6"), como na tela do Figaro. */
export function mediaFormatada(media: number): string {
  return media.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}
