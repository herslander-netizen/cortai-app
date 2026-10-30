/**
 * Regras puras de editar o horário de um agendamento (arrastar ou esticar na Agenda).
 * A tela usa para avisar antes de salvar; o servidor usa de novo, porque a tela nunca é a autoridade.
 * Choque com outro agendamento não está aqui: continua em `STATUS_QUE_OCUPAM` e na trava do banco.
 */
import { hojeNoFuso } from "@/lib/horarios";

export const DURACAO_MIN_MINUTOS = 5;
export const DURACAO_MAX_MINUTOS = 480;

export type MotivoDaRecusa = "passado" | "outro_dia" | "duracao";

export const TEXTO_DO_MOTIVO: Record<MotivoDaRecusa, string> = {
  passado: "Deve ser após agora",
  outro_dia: "Para mudar de dia, use Remarcar",
  duracao: "Duração fora do limite",
};

export type EdicaoDeHorario = {
  /** Instantes em milissegundos. */
  inicio: number;
  fim: number;
  inicioOriginal: number;
  agora: number;
  /** Dia (AAAA-MM-DD) em que a Agenda está aberta, no fuso do negócio. */
  dia: string;
  fuso: string;
};

function diaNoFuso(instante: number, fuso: string): string {
  return hojeNoFuso(fuso, new Date(instante));
}

/**
 * Por que a edição não pode ser salva (ou `null` se pode).
 * "Após agora" só vale quando o início mudou: esticar a duração de quem já começou é permitido.
 */
export function motivoDaRecusa(e: EdicaoDeHorario): MotivoDaRecusa | null {
  const duracaoMin = Math.round((e.fim - e.inicio) / 60_000);
  if (duracaoMin < DURACAO_MIN_MINUTOS || duracaoMin > DURACAO_MAX_MINUTOS) return "duracao";
  if (e.inicio !== e.inicioOriginal && e.inicio <= e.agora) return "passado";
  if (diaNoFuso(e.inicio, e.fuso) !== e.dia || diaNoFuso(e.fim - 1, e.fuso) !== e.dia)
    return "outro_dia";
  return null;
}

/** Soma o deslocamento e a nova duração ao agendamento, em minutos. */
export function aplicarEdicao(
  original: { inicio: string; fim: string },
  deltaInicioMin: number,
  deltaDuracaoMin: number,
): { inicio: number; fim: number } {
  const inicio = new Date(original.inicio).getTime() + deltaInicioMin * 60_000;
  const duracao = new Date(original.fim).getTime() - new Date(original.inicio).getTime();
  return { inicio, fim: inicio + duracao + deltaDuracaoMin * 60_000 };
}

/** Arredonda ao passo do negócio (mínimo 5 min, como a grade da agenda). */
export function arredondarAoPasso(minutos: number, passoMin: number): number {
  const passo = Math.max(5, Math.round(passoMin) || 15);
  return Math.round(minutos / passo) * passo;
}

/** Passo do ajuste por gesto na Agenda: 5 min, o mesmo das listras que aparecem ao segurar. */
export const PASSO_DO_AJUSTE_MIN = 5;

/**
 * Passo do arrasto e da alça de duração na Agenda (decisão do dono, 18/10/2026): sempre de 5 em
 * 5 minutos, como as listras marcam, qualquer que seja o intervalo de horários do negócio (o
 * intervalo continua valendo para os horários oferecidos ao cliente).
 */
export function passoDoGesto(_passoMin?: number | null): number {
  return PASSO_DO_AJUSTE_MIN;
}

/**
 * Até onde a alça de duração pode ir (minutos, em passos inteiros): o fim nunca sobe acima do início mais a duração
 * mínima nem passa da duração máxima ou da meia-noite (dono, 30/10: arrastar para cima deixava o fim antes do início).
 */
export function limitesDaAlca(inicio: number, fim: number, passo: number) {
  const duracao = fim - inicio;
  const encolher = Math.floor(Math.max(0, duracao - DURACAO_MIN_MINUTOS) / passo) * passo;
  const crescer = Math.min(Math.max(0, DURACAO_MAX_MINUTOS - duracao), Math.max(0, 24 * 60 - fim));
  return { min: -encolher || 0, max: Math.floor(crescer / passo) * passo };
}
