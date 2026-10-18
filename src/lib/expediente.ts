import { diaDaSemanaDoDia } from "@/lib/horarios";

export type Expediente = { trabalha: false } | { trabalha: true; abre: string; fecha: string };

type HorarioDoNegocio = { diaSemana: number; fechado: boolean; abre: string; fecha: string };
type EscalaDoDia = {
  profissional_id: string;
  dia_semana: number;
  trabalha: boolean;
  abre: string | null;
  fecha: string | null;
};

/**
 * Expediente de um profissional num dia, com as mesmas fontes do motor de horários: o horário
 * do negócio e, quando existe, a escala do profissional naquele dia da semana (que manda).
 * Negócio fechado no dia = ninguém trabalha.
 */
export function expedienteDoProfissional(
  dia: string,
  profissionalId: string,
  horarios: HorarioDoNegocio[],
  escalas: EscalaDoDia[],
): Expediente {
  const dow = diaDaSemanaDoDia(dia);
  const doNegocio = horarios.find((h) => h.diaSemana === dow);
  if (!doNegocio || doNegocio.fechado) return { trabalha: false };
  const escala = escalas.find((e) => e.profissional_id === profissionalId && e.dia_semana === dow);
  if (!escala) return { trabalha: true, abre: doNegocio.abre, fecha: doNegocio.fecha };
  if (!escala.trabalha || !escala.abre || !escala.fecha) return { trabalha: false };
  return { trabalha: true, abre: escala.abre.slice(0, 5), fecha: escala.fecha.slice(0, 5) };
}
