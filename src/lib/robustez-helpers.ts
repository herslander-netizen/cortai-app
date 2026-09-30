import { motivoForaDoHorario } from "./disponibilidade";
import type { HorarioDeFuncionamento } from "./horarios";

export { horarioDoDia } from "./horarios";

/** Atalho de teste: motivoForaDoHorario em Brasília a partir de um ISO. */
export function motivoForaDoHorarioWrapper(iso: string, duracao: number, horarios: HorarioDeFuncionamento[]) {
  return motivoForaDoHorario(Date.parse(iso), duracao, horarios, "America/Sao_Paulo");
}
