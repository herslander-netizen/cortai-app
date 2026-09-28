/** Um profissional está livre se nenhum horário ocupado dele cruza o intervalo [inicio, fim). */
export function profissionalLivre(
  profId: string,
  inicio: number,
  fim: number,
  ocupados: { profissional_id: string | null; inicio: string; fim: string }[],
) {
  return !ocupados.some(
    (o) => o.profissional_id === profId && new Date(o.inicio).getTime() < fim && new Date(o.fim).getTime() > inicio,
  );
}
