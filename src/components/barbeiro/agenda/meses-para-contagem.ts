/**
 * Os pontinhos do Figaroo são carregados para a semana atual e para os meses
 * próximos da região visível do seletor. Montar 25 meses no DOM não deve
 * disparar 25 chamadas ao servidor no mesmo gesto de abrir o calendário.
 */
export function mesesParaContagem(
  mesesDaSemana: readonly string[],
  mesEscolhido: string,
  calendarioAberto: boolean,
  mesesVisitados: ReadonlySet<string>,
): string[] {
  return [
    ...new Set([
      ...mesesDaSemana,
      ...(calendarioAberto ? [mesEscolhido, ...mesesVisitados] : []),
    ]),
  ];
}
