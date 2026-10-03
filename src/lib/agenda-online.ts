/** Agenda online pelo cliente: regra pura (todos os planos, limitada só pelo limite mensal). */

export type EstadoAgendaOnline = "aberta" | "limite_atingido";

export function estadoDaAgendaOnline(p: {
  emTeste: boolean;
  limite: number | null;
  uso: number;
}): EstadoAgendaOnline {
  if (p.emTeste || p.limite == null) return "aberta";
  return p.uso >= p.limite ? "limite_atingido" : "aberta";
}

/** Aviso ao dono: 80% e 100% do limite de agendamentos do mês. */
export function avisoDoLimiteMensal(p: {
  emTeste: boolean;
  limite: number | null;
  uso: number;
}): "perto" | "atingido" | null {
  if (p.emTeste || p.limite == null || p.limite <= 0) return null;
  if (p.uso >= p.limite) return "atingido";
  if (p.uso >= Math.ceil(p.limite * 0.8)) return "perto";
  return null;
}

export const MENSAGEM_AGENDA_INDISPONIVEL =
  "A agenda online está indisponível no momento. Fale direto com o negócio para marcar.";
