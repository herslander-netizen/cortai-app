/**
 * Vibração curta nos mesmos momentos do Figaro (`HapticFeedback`, inventário H1–H7). Só funciona onde o
 * navegador tem `navigator.vibrate` (Android; o iOS não tem); em qualquer outro lugar não faz nada. Respeita
 * "reduzir movimento".
 *
 * Padrões [inferência: o APK usa os tipos `LongPress` e `Confirm` do sistema, que não têm duração fixa]:
 * pressão longa = 15 ms; confirmar = 10 ms, pausa de 40 ms, 15 ms.
 */
export type TipoDeVibracao = "pressao" | "confirmar";

export const PADROES_DE_VIBRACAO: Record<TipoDeVibracao, number | number[]> = {
  pressao: 15,
  confirmar: [10, 40, 15],
};

export function vibrar(tipo: TipoDeVibracao): boolean {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return false;
  if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  }
  try {
    return navigator.vibrate(PADROES_DE_VIBRACAO[tipo]);
  } catch {
    return false;
  }
}
