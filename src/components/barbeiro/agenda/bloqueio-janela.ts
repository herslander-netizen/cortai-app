/**
 * Regras da folha "Bloquear horário" (apk/3-fluxos-do-atendimento §7). Puras: recebem o dia, o
 * "hoje" e o minuto atual já no fuso do negócio, então não dependem do relógio do aparelho.
 */

const MIN_POR_DIA = 24 * 60;
const MEIO_DIA = 12 * 60;
const PASSO_DO_INICIO_MIN = 5;

export type JanelaDeBloqueio = { de: string; ate: string };

export function formatarMinutos(total: number) {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function paraMinutos(valor: string) {
  const [h = 0, m = 0] = valor.split(":").map(Number);
  return h * 60 + m;
}

/** Hoje o início não pode ser antes de agora, arredondado para cima em múltiplos de 5 min. */
export function inicioMinimoHoje(agoraMin: number) {
  return Math.ceil(agoraMin / PASSO_DO_INICIO_MIN) * PASSO_DO_INICIO_MIN;
}

/**
 * Outro dia, ou hoje antes do meio-dia: 12:00–13:00. Hoje depois do meio-dia: próxima hora cheia
 * até +1 h; se passar da meia-noite, 23:00–23:59. Nunca começa antes do início mínimo de hoje.
 */
export function janelaPadrao(dia: string, hoje: string, agoraMin: number): JanelaDeBloqueio {
  if (dia !== hoje || agoraMin < MEIO_DIA) return { de: "12:00", ate: "13:00" };
  const minimo = inicioMinimoHoje(agoraMin);
  let inicio = (Math.floor(agoraMin / 60) + 1) * 60;
  let fim = inicio + 60;
  if (fim >= MIN_POR_DIA) {
    inicio = Math.max(23 * 60, minimo);
    fim = MIN_POR_DIA - 1;
  }
  return { de: formatarMinutos(inicio), ate: formatarMinutos(fim) };
}

/** Texto do primeiro problema encontrado, ou null quando o bloqueio pode ser gravado. */
export function problemaDoBloqueio(entrada: {
  dia: string;
  hoje: string;
  agoraMin: number;
  de: string;
  ate: string;
}): string | null {
  if (!entrada.de || !entrada.ate) return "Informe o início e o fim.";
  if (entrada.dia < entrada.hoje) return "Escolha hoje ou um dia à frente.";
  if (entrada.ate <= entrada.de) return "O fim precisa ser depois do início.";
  if (
    entrada.dia === entrada.hoje &&
    paraMinutos(entrada.de) < inicioMinimoHoje(entrada.agoraMin)
  ) {
    return "O início não pode ser antes de agora.";
  }
  return null;
}
