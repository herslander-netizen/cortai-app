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

/**
 * Passo do arrasto na Agenda: o do negócio quando for menor que 15 min (mais fino, até 5),
 * nunca maior que 15 (o arrasto já é assim hoje) e nunca menor que 5.
 */
export function passoDoGesto(passoMin: number | null | undefined): number {
  const passo = Math.round(Number(passoMin));
  if (!Number.isFinite(passo) || passo <= 0) return 15;
  return Math.min(15, Math.max(5, passo));
}
