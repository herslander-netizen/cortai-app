/** Regras puras do retorno por serviço (sem banco). */
export const DIA_MS = 86_400_000;
export const PRAZO_GERAL_DIAS = 30;

/** Data sugerida de retorno: prazo do serviço ou o prazo geral. */
export function dataDeRetorno(
  inicioIso: string,
  retornoDias: number | null | undefined,
  prazoGeral = PRAZO_GERAL_DIAS,
): number {
  return new Date(inicioIso).getTime() + (retornoDias ?? prazoGeral) * DIA_MS;
}

/** "Hora de voltar": retorno vencido nos últimos 30 dias e sem horário futuro. */
export function estaNaHoraDeVoltar(
  retornoEm: number | null,
  temHorarioFuturo: boolean,
  agora = Date.now(),
): boolean {
  if (retornoEm === null || temHorarioFuturo) return false;
  return retornoEm <= agora && agora - retornoEm <= 30 * DIA_MS;
}
