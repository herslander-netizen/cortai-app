/**
 * Fila de chegada aparece na Agenda quando o negócio atende sem horário
 * ou, por segurança, enquanto ainda houver alguém esperando.
 */
export function filaDeChegadaVisivel(ativa: boolean | undefined, naFila: number) {
  return ativa !== false || naFila > 0;
}
