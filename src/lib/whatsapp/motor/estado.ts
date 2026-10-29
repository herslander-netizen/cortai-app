/**
 * Estado da conversa no motor determinístico do Flow.
 *
 * O estado vive na coluna `contexto` (jsonb) de `conversas_whatsapp` — nenhuma
 * tabela nova, nenhuma migração. O estado de fluxo expira em 2 horas.
 */
import type { ContextoDaConversa } from "../contrato";

export const ESTADOS = [
  "IDENTIFYING",
  "MAIN_MENU",
  "CHOOSING_SERVICE",
  "CHOOSING_PROFESSIONAL",
  "CHOOSING_DATE",
  "CHOOSING_TIME",
  "CONFIRMING_BOOKING",
  "BOOKING_CONFIRMED",
  "VIEWING_BOOKING",
  "RESCHEDULING",
  "CANCELLING",
  "WAITING_HUMAN",
  "COMPLETED",
] as const;

export type EstadoDaConversa = (typeof ESTADOS)[number];

/** Tipo do menu numerado apresentado na última mensagem. */
export type TipoDeMenu =
  "servico" | "profissional" | "horario" | "agendamento" | "retomar" | "barbearia";

export type ItemDeMenu = {
  rotulo: string;
  /** Identificador real do item (id do serviço, ISO do horário, etc.). */
  valor: string;
  /** Informação auxiliar (ex.: profissional do horário oferecido). */
  extra?: string | null;
};

/** Contexto completo usado pelo motor: extensão compatível do contexto atual. */
export type ContextoDoMotor = ContextoDaConversa & {
  estado?: EstadoDaConversa;
  menuTipo?: TipoDeMenu | null;
  menuItens?: ItemDeMenu[] | null;
  /** Ação aguardando confirmação explícita do cliente. */
  pendente?: "criar" | "cancelar" | "remarcar" | null;
  /** Horário escolhido e ainda não confirmado (ISO). */
  inicioEscolhido?: string | null;
  /** Estado salvo antes de expirar, para retomada. */
  estadoAnterior?: EstadoDaConversa | null;
  /** Aguardando o nome da pessoa para concluir o cadastro do agendamento. */
  aguardandoNome?: boolean;
  /** Tentativas seguidas sem entender a pessoa. */
  semEntender?: number;
};

const DUAS_HORAS_MS = 2 * 60 * 60 * 1000;

const ESTADOS_DE_FLUXO: EstadoDaConversa[] = [
  "CHOOSING_SERVICE",
  "CHOOSING_PROFESSIONAL",
  "CHOOSING_DATE",
  "CHOOSING_TIME",
  "CONFIRMING_BOOKING",
  "RESCHEDULING",
  "CANCELLING",
];

export function estaEmFluxo(estado: EstadoDaConversa | undefined): boolean {
  return Boolean(estado && ESTADOS_DE_FLUXO.includes(estado));
}

/** Um fluxo parado há mais de 2 horas precisa ser retomado, não continuado. */
export function expirou(contexto: ContextoDoMotor, agora = Date.now()): boolean {
  if (!estaEmFluxo(contexto.estado)) return false;
  if (!contexto.atualizadoEm) return false;
  const quando = new Date(contexto.atualizadoEm).getTime();
  return Number.isFinite(quando) && agora - quando > DUAS_HORAS_MS;
}

/** Limpa o que pertence a um fluxo encerrado, preservando a identidade. */
export function limparFluxo(contexto: ContextoDoMotor): ContextoDoMotor {
  return {
    clienteId: contexto.clienteId ?? null,
    estado: "MAIN_MENU",
    menuTipo: null,
    menuItens: null,
    pendente: null,
    inicioEscolhido: null,
    servicoId: null,
    servicoNome: null,
    profissionalId: null,
    profissionalNome: null,
    dia: null,
    agendamentoId: null,
    aguardandoNome: false,
    semEntender: 0,
    atualizadoEm: new Date().toISOString(),
  };
}
