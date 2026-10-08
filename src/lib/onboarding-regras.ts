import { z } from "zod";

/** Valores aceitos pelo CHECK `tenants_passo_horarios_chk`. */
export const PASSOS_PERMITIDOS = [15, 20, 30, 40] as const;

export function passoValido(n: unknown): (typeof PASSOS_PERMITIDOS)[number] {
  const v = Number(n);
  return (PASSOS_PERMITIDOS as readonly number[]).includes(v)
    ? (v as (typeof PASSOS_PERMITIDOS)[number])
    : 30;
}

export const esquemaRegrasDeAgendamento = z.object({
  antecedenciaMinMinutos: z.number().int().min(0).max(10080),
  cancelamentoMinHoras: z.number().int().min(0).max(168),
  intervaloEntreMin: z.number().int().min(0).max(120),
  aceitaEncaixe: z.boolean(),
  janelaDias: z.number().int().min(7).max(90).default(30),
  passoMin: z.union([z.literal(15), z.literal(20), z.literal(30), z.literal(40)]).default(30),
});
