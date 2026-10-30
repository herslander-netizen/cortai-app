/**
 * Horário especial numa data ("abrir antes", "fechar depois" ou outro horário só naquele dia), para o negócio
 * todo ou para um profissional. Regra pura usada pelo motor oficial: o horário do negócio no dia vira a união
 * das janelas, e quem não estende ganha bloqueios na parte a mais (as mesmas "ocupações" de bloqueios e escalas).
 * O banco confere de novo em `criar_agendamento` (migração 0054).
 */
import type { Ocupado } from "@/lib/disponibilidade";
import {
  fimEmMinutos,
  horarioDoDia,
  isoNoFusoDaBarbearia,
  somarDias,
  type HorarioDeFuncionamento,
} from "@/lib/horarios";

export type HorarioEspecial = {
  dia: string;
  /** `null` vale para o negócio todo. */
  profissionalId: string | null;
  abre: string;
  fecha: string;
};

type Janela = { inicio: number; fim: number };

function emMinutos(hhmm: string) {
  const [h = 0, m = 0] = hhmm.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
}

function paraHora(total: number) {
  const m = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** Horário especial válido: HH:MM e fechamento depois da abertura no mesmo dia. */
export function horarioEspecialValido(abre: string, fecha: string) {
  return (
    /^\d{2}:\d{2}$/.test(abre) && /^\d{2}:\d{2}$/.test(fecha) && emMinutos(fecha) > emMinutos(abre)
  );
}

function janelaSemanal(dia: string, horarios: HorarioDeFuncionamento[]): Janela | null {
  const info = horarioDoDia(dia, horarios);
  if (info.fechado) return null;
  return { inicio: emMinutos(info.abre), fim: fimEmMinutos(info.abre, info.fecha) };
}

function janelaDoEspecial(e: HorarioEspecial): Janela {
  return { inicio: emMinutos(e.abre), fim: emMinutos(e.fecha) };
}

function doDia(especiais: readonly HorarioEspecial[], dia: string) {
  const doNegocio = especiais.find((e) => e.dia === dia && e.profissionalId === null) ?? null;
  const porProfissional = especiais.filter((e) => e.dia === dia && e.profissionalId !== null);
  return { doNegocio, porProfissional };
}

/** Janela de um profissional no dia: o especial dele, senão o do negócio, senão o horário da semana. */
export function janelaDoProfissional(
  dia: string,
  horarios: HorarioDeFuncionamento[],
  especiais: readonly HorarioEspecial[],
  profissionalId: string,
): Janela | null {
  const { doNegocio, porProfissional } = doDia(especiais, dia);
  const proprio = porProfissional.find((e) => e.profissionalId === profissionalId);
  if (proprio) return janelaDoEspecial(proprio);
  if (doNegocio) return janelaDoEspecial(doNegocio);
  return janelaSemanal(dia, horarios);
}

/**
 * Janela do negócio no dia, ou `null` quando a data não tem horário especial (vale o da semana).
 * É a união do horário do negócio (especial ou da semana) com os especiais dos profissionais.
 */
export function janelaDoNegocioNoDia(
  dia: string,
  horarios: HorarioDeFuncionamento[],
  especiais: readonly HorarioEspecial[],
): { abre: string; fecha: string } | null {
  const { doNegocio, porProfissional } = doDia(especiais, dia);
  if (!doNegocio && porProfissional.length === 0) return null;
  const janelas = [
    doNegocio ? janelaDoEspecial(doNegocio) : janelaSemanal(dia, horarios),
    ...porProfissional.map(janelaDoEspecial),
  ].filter((j): j is Janela => j !== null);
  if (!janelas.length) return null;
  const inicio = Math.min(...janelas.map((j) => j.inicio));
  const fim = Math.max(...janelas.map((j) => j.fim));
  return { abre: paraHora(inicio), fecha: paraHora(fim) };
}

/**
 * Bloqueios de quem não trabalha na parte estendida: dentro da janela do negócio no dia, tudo o que fica fora da
 * janela de cada profissional. Quem tem escala no dia e nenhum especial próprio fica com a escala (`comEscala`).
 */
export function bloqueiosDosHorariosEspeciais(p: {
  dia: string;
  horarios: HorarioDeFuncionamento[];
  especiais: readonly HorarioEspecial[];
  profissionalIds: readonly string[];
  fuso: string;
  comEscala?: ReadonlySet<string>;
}): Ocupado[] {
  const negocio = janelaDoNegocioNoDia(p.dia, p.horarios, p.especiais);
  if (!negocio) return [];
  const w = { inicio: emMinutos(negocio.abre), fim: fimEmMinutos(negocio.abre, negocio.fecha) };
  const comProprio = new Set(
    p.especiais.filter((e) => e.dia === p.dia && e.profissionalId).map((e) => e.profissionalId),
  );
  const instante = (minuto: number) =>
    isoNoFusoDaBarbearia(somarDias(p.dia, Math.floor(minuto / 1440)), paraHora(minuto), p.fuso);
  const saida: Ocupado[] = [];
  for (const id of p.profissionalIds) {
    if (p.comEscala?.has(id) && !comProprio.has(id)) continue;
    const propria = janelaDoProfissional(p.dia, p.horarios, p.especiais, id);
    if (!propria) {
      saida.push({
        profissional_id: id,
        inicio: instante(w.inicio),
        fim: instante(w.fim),
        bloqueio: true,
      });
      continue;
    }
    if (propria.inicio > w.inicio)
      saida.push({
        profissional_id: id,
        inicio: instante(w.inicio),
        fim: instante(Math.min(propria.inicio, w.fim)),
        bloqueio: true,
      });
    if (propria.fim < w.fim)
      saida.push({
        profissional_id: id,
        inicio: instante(Math.max(propria.fim, w.inicio)),
        fim: instante(w.fim),
        bloqueio: true,
      });
  }
  return saida;
}
