/**
 * Indicação visual da folga global já aplicada pelo motor de agendamento.
 * Não ocupa horário, não acrescenta regras e não substitui o preparo por serviço.
 */
export type AtendimentoParaPreparo = {
  id: string;
  inicio: number;
  fim: number;
  profissionalId: string | null;
  status: string;
};
export type PreparoVisual = { id: string; inicio: number; fim: number; minutos: number };
const SEM_RESERVA = new Set(["cancelado", "cancelada", "remarcado", "faltou", "nao_compareceu"]);
export function calcularPreparoVisual(input: {
  itens: AtendimentoParaPreparo[];
  intervaloMin: number | undefined | null;
  escala: { inicio: number; fim: number };
  indisponiveis?: { inicio: number; fim: number }[];
}): PreparoVisual[] {
  const min = input.intervaloMin ?? 0;
  if (!Number.isInteger(min) || min < 1 || min > 120) return [];
  const ativos = input.itens.filter((i) =>
    !SEM_RESERVA.has(i.status) &&
    Number.isFinite(i.inicio) &&
    Number.isFinite(i.fim) && i.fim > i.inicio,
  );
  return ativos.flatMap((item) => {
    const inicio = item.fim;
    const fim = inicio + min;
    if (inicio < input.escala.inicio || fim > input.escala.fim || fim > 1440) return [];
    const ocupado = ativos.some((outro) =>
      outro.id !== item.id && outro.profissionalId === item.profissionalId &&
      outro.inicio < fim && outro.fim > inicio,
    );
    const indisponivel = (input.indisponiveis ?? [])
      .some((x) => x.inicio < fim && x.fim > inicio);
    if (ocupado || indisponivel) return [];
    return [{ id: item.id, inicio, fim, minutos: min }];
  });
}
