/**
 * Contingência do atendimento automático (dono, 06/11/2026: "em caso de desconexão, mandar uma mensagem dizendo que
 * não está conseguindo conversar e o link do agendamento"). Usada quando nem o Flow Bot nem a Flow IA responderam.
 */

/** Intervalo mínimo entre duas mensagens de contingência na mesma conversa. */
export const INTERVALO_DA_CONTINGENCIA_MS = 30 * 60_000;

/** Verdade, link do agendamento e a equipe por trás — nunca "instabilidade" nem promessa de prazo. */
export function textoDeContingencia(link: string): string {
  return `No momento não estou conseguindo conversar por aqui. Para agendar, use o link: ${link}\nSe precisar de outra coisa, a equipe responde assim que possível.`;
}

/** Áudio sem transcrição porque o serviço está fora do ar ou sem configuração: repetir não adianta. */
export function textoDeAudioIndisponivel(link: string): string {
  return `No momento não consigo ouvir áudios por aqui. Pode escrever sua mensagem? Para agendar, use o link: ${link}`;
}
