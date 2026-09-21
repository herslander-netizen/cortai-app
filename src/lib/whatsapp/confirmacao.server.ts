/**
 * Confirmação de agendamento pelo WhatsApp.
 *
 * A implementação real vive em `notificacoes.server.ts` (motor único de
 * mensagens transacionais). Este arquivo permanece como porta de entrada
 * histórica, para não quebrar as chamadas existentes.
 */
import { notificarAgendamento } from "./notificacoes.server";

export type TipoDeEnvio = "confirmacao_agendamento";

export async function enviarConfirmacaoDeAgendamento(agendamentoId: string) {
  return notificarAgendamento(agendamentoId, "confirmacao_agendamento");
}

export { montarMensagem } from "./notificacoes.server";
