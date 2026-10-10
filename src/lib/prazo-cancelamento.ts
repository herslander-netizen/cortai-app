/** Regra pura do prazo de cancelamento pelo cliente: o negócio define quantas horas antes ainda vale. */

export function prazoDeCancelamentoVencido(
  inicio: string | Date,
  minHoras: number | null | undefined,
  agora: Date = new Date(),
): boolean {
  const horas = Number(minHoras ?? 0);
  if (!Number.isFinite(horas) || horas <= 0) return false;
  const limite = new Date(inicio).getTime() - horas * 3_600_000;
  return agora.getTime() > limite;
}

export function mensagemDoPrazoDeCancelamento(minHoras: number): string {
  const unidade = minHoras === 1 ? "hora" : "horas";
  return `Este horário só pode ser cancelado até ${minHoras} ${unidade} antes. Fale com o negócio para combinar.`;
}
