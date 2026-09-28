/** Resumo operacional do dia, calculado a partir dos itens já carregados (funciona offline). */
type Item = { status: string; valor_centavos: number; inicio: string; startedAt: string | null; finishedAt: string | null };

export function resumoDoDia(itens: Item[], agora: number) {
  const feitos = itens.filter((i) => i.status === "finalizado");
  const restantes = itens.filter((i) => ["agendado", "chegou", "na_cadeira"].includes(i.status)).length;
  const faturado = feitos.reduce((s, i) => s + (i.valor_centavos || 0), 0);
  const previsto = faturado + itens.filter((i) => ["agendado", "chegou", "na_cadeira"].includes(i.status)).reduce((s, i) => s + (i.valor_centavos || 0), 0);
  const duracoes = feitos
    .filter((i) => i.startedAt && i.finishedAt)
    .map((i) => (new Date(i.finishedAt!).getTime() - new Date(i.startedAt!).getTime()) / 60_000)
    .filter((m) => m > 0 && m < 300);
  const tempoMedio = duracoes.length ? Math.round(duracoes.reduce((a, b) => a + b, 0) / duracoes.length) : null;
  const atrasados = itens.filter((i) => i.status === "agendado" && new Date(i.inicio).getTime() < agora - 10 * 60_000).length;
  return { feitos: feitos.length, restantes, faturado, previsto, tempoMedio, atrasados };
}
