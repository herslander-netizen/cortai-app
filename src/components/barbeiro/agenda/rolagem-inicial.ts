/**
 * A linha rosa do horário atual não é uma âncora de navegação por datas.
 * O reposicionamento automático existe só na abertura original da Timeline;
 * gestos, calendário e setas mantêm a rolagem vertical até tocar em "Agora".
 */
export function podePosicionarAutomaticamente(
  dia: string,
  diaDaMontagem: string,
  diaJaPosicionado: string | null,
  ehHoje: boolean,
  diaCompleto: boolean,
) {
  return dia === diaDaMontagem && diaJaPosicionado === null && ehHoje && diaCompleto;
}
