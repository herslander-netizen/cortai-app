/**
 * Trava por mensagem do agendamento na conversa (pendência de 08/11, resolvida em 14/11).
 *
 * As etapas abaixo são as únicas em que a resposta do cliente pode gravar (criar, remarcar,
 * cancelar, avisar atraso). Nelas, a linha do rastro é inserida ANTES de conduzir: o índice
 * único `flow_bot_rastro_mensagem_unica` (conversa + mensagem) faz o banco escolher uma só
 * entrega do webhook para executar. Conferir com SELECT antes e inserir depois deixava duas
 * entregas simultâneas passarem juntas.
 */
import type { EstadoDaAgenda } from "./conduzir";

type Etapa = EstadoDaAgenda["etapa"];

const ETAPAS_QUE_GRAVAM: ReadonlySet<Etapa> = new Set<Etapa>(["confirmar", "minutos"]);

export function etapaPodeGravar(etapa: Etapa | null | undefined): boolean {
  return !!etapa && ETAPAS_QUE_GRAVAM.has(etapa);
}

export const FLUXO_DA_AGENDA = "agenda-na-conversa";
/** A mensagem foi reservada e a ação ainda não terminou (ou caiu no meio: ver ocorrências). */
export const MOTIVO_EM_EXECUCAO = "agenda:em_execucao";
/** A agenda reservou a mensagem, não gravou nada e devolveu o turno: o bot pode assumir a linha. */
export const MOTIVO_DEVOLVIDA = "agenda:devolvida";
