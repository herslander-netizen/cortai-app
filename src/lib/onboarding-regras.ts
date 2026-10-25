import { z } from "zod";

/** Limites seguros para a grade de horários oferecidos ao público. */
export const PASSO_MINIMO_MINUTOS = 5;
export const PASSO_MAXIMO_MINUTOS = 120;
/** Valores sugeridos na interface; qualquer inteiro dentro dos limites é permitido. */
export const PASSOS_PERMITIDOS = [15, 20, 30, 40] as const;

export function passoValido(n: unknown): number {
  const v = Number(n);
  return Number.isInteger(v) && v >= PASSO_MINIMO_MINUTOS && v <= PASSO_MAXIMO_MINUTOS ? v : 30;
}

export const esquemaRegrasDeAgendamento = z.object({
  antecedenciaMinMinutos: z.number().int().min(0).max(10080),
  cancelamentoMinHoras: z.number().int().min(0).max(168),
  intervaloEntreMin: z.number().int().min(0).max(120),
  aceitaEncaixe: z.boolean(),
  janelaDias: z.number().int().min(7).max(90).default(30),
  passoMin: z.number().int().min(PASSO_MINIMO_MINUTOS).max(PASSO_MAXIMO_MINUTOS).default(30),
});
