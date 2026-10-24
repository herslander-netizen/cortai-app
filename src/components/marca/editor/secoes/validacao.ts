import { LIMITES_DA_SECAO, type PaginaConfig } from "@/lib/pagina-config";

/**
 * Regras dos editores de seção (spec 4 §5). Cada função devolve a mensagem de erro ou `null`.
 * Textos no padrão do Figaro, em português.
 */

export function erroDoTituloDaGaleria(titulo: string): string | null {
  const t = titulo.trim();
  if (t.length === 0) return null; // vazio = título padrão da página ("Destaques")
  if (t.length < LIMITES_DA_SECAO.tituloDaGaleria.min)
    return `Mínimo de ${LIMITES_DA_SECAO.tituloDaGaleria.min} caracteres`;
  return null;
}

export function erroDoSubtituloDaGaleria(subtitulo: string): string | null {
  const t = subtitulo.trim();
  if (t.length === 0) return null;
  if (t.length < LIMITES_DA_SECAO.subtituloDaGaleria.min)
    return `Mínimo de ${LIMITES_DA_SECAO.subtituloDaGaleria.min} caracteres`;
  return null;
}

/** Texto obrigatório com mínimo de caracteres (frase do Hero): "Obrigatório" ou "Mínimo de N caracteres". */
export function textoMinimo(texto: string, minimo: number): string | null {
  const t = texto.trim();
  if (t.length === 0) return "Obrigatório";
  if (t.length < minimo) return `Mínimo de ${minimo} caracteres`;
  return null;
}

export function erroDaBio(bio: string): string | null {
  if (bio.trim().length > LIMITES_DA_SECAO.bio)
    return `A bio não pode passar de ${LIMITES_DA_SECAO.bio} caracteres.`;
  return null;
}

/** Com "mostrar detalhes" ligado, toda bio é obrigatória (equipe e localização). */
export function erroDeBiosObrigatorias(
  mostrarDetalhes: boolean,
  bios: readonly (string | null | undefined)[],
  quem: "equipe" | "localização",
): string | null {
  if (!mostrarDetalhes) return null;
  if (bios.length === 0 || bios.some((b) => !b || b.trim().length === 0)) {
    return quem === "equipe"
      ? "Todos os profissionais precisam de bio para mostrar os detalhes."
      : "A bio da localização é obrigatória para mostrar os detalhes.";
  }
  return null;
}

/** Handle de rede social: opcional e sem espaços. */
export function erroDoHandle(valor: string): string | null {
  return /\s/.test(valor.trim()) ? "Espaços não são permitidos" : null;
}

/** Primeiro erro das seções que ficam no rascunho da página, para travar o "Salvar alterações". */
export function primeiroErroDaSecao(
  secao: keyof PaginaConfig["secoes"],
  secoes: PaginaConfig["secoes"],
): string | null {
  if (secao === "galeria") {
    return (
      erroDoTituloDaGaleria(secoes.galeria.titulo) ??
      erroDoSubtituloDaGaleria(secoes.galeria.subtitulo)
    );
  }
  if (secao === "localizacao") {
    return (
      erroDaBio(secoes.localizacao.bio) ??
      erroDeBiosObrigatorias(
        secoes.localizacao.mostrarDetalhes,
        [secoes.localizacao.bio],
        "localização",
      )
    );
  }
  return null;
}
