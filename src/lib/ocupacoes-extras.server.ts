/**
 * Ocupações e indisponibilidades que alimentam o único motor de agenda.
 *
 * Prioridade: exceção individual por data > escala semanal individual >
 * expediente geral do negócio. A exceção só amplia a escala individual:
 * o expediente, intervalos e demais regras gerais continuam obrigatórios.
 */
import type { Ocupado } from "@/lib/disponibilidade";
import { isoNoFusoDaBarbearia, somarDias, diaDaSemanaDoDia, hojeNoFuso } from "@/lib/horarios";

type Turno = {
  trabalha: boolean;
  abre: string | null;
  fecha: string | null;
};
type TurnoSemanal = Turno & { profissional_id: string; dia_semana: number };
type TurnoPorData = Turno & { profissional_id: string; dia: string };

/** Função pura para impedir que a escala semanal se sobreponha à exceção por data. */
export function turnoEfetivo(
  semanal: Turno | undefined,
  excepcional: Turno | undefined,
): Turno | undefined {
  return excepcional ?? semanal;
}

export async function ocupacoesExtras(
  db: any,
  p: { tenantId: string; fuso: string; desde: Date; ate: Date; profissionalIds?: string[] },
): Promise<Ocupado[]> {
  let ids = p.profissionalIds;
  if (!ids) {
    const { data, error } = await db
      .from("profissionais")
      .select("id")
      .eq("tenant_id", p.tenantId)
      .eq("ativo", true);
    if (error) throw new Error("Não foi possível consultar os profissionais.");
    ids = ((data ?? []) as { id: string }[]).map((x) => x.id);
  }
  if (!ids.length) return [];

  const idsPermitidos = new Set(ids);
  const primeiroDia = hojeNoFuso(p.fuso, p.desde);
  const ultimoDia = hojeNoFuso(p.fuso, p.ate);

  const [{ data: bloqueios, error: erroBloqueios }, { data: escalas, error: erroEscalas }, { data: excecoes, error: erroExcecoes }] = await Promise.all([
    db
      .from("bloqueios_de_agenda")
      .select("profissional_id, inicio, fim")
      .eq("tenant_id", p.tenantId)
      .lt("inicio", p.ate.toISOString())
      .gt("fim", p.desde.toISOString()),
    db
      .from("escalas_de_profissional")
      .select("profissional_id, dia_semana, trabalha, abre, fecha")
      .eq("tenant_id", p.tenantId)
      .in("profissional_id", ids),
    db
      .from("excecoes_disponibilidade_profissional")
      .select("profissional_id, dia, trabalha, abre, fecha")
      .eq("tenant_id", p.tenantId)
      .in("profissional_id", ids)
      .gte("dia", primeiroDia)
      .lte("dia", ultimoDia),
  ]);
  if (erroBloqueios || erroEscalas || erroExcecoes) {
    // Nunca mostrar um horário livre se a consulta de um bloqueio falhou.
    throw new Error("Não foi possível verificar a disponibilidade da agenda.");
  }

  const extras: Ocupado[] = [];
  for (const b of (bloqueios ?? []) as { profissional_id: string | null; inicio: string; fim: string }[]) {
    const alvos = b.profissional_id ? [b.profissional_id] : ids;
    for (const id of alvos) {
      if (idsPermitidos.has(id)) {
        extras.push({ profissional_id: id, inicio: b.inicio, fim: b.fim, bloqueio: true });
      }
    }
  }

  const semana = (escalas ?? []) as TurnoSemanal[];
  const diasEspeciais = (excecoes ?? []) as TurnoPorData[];
  const especiais = new Map(diasEspeciais.map((d) => [d.profissional_id + ":" + d.dia, d]));
  const profissionaisComRegra = new Set([
    ...semana.map((e) => e.profissional_id),
    ...diasEspeciais.map((e) => e.profissional_id),
  ]);

  let dia = primeiroDia;
  for (let i = 0; i < 120 && dia <= ultimoDia; i++, dia = somarDias(dia, 1)) {
    const dow = diaDaSemanaDoDia(dia);
    const ini = isoNoFusoDaBarbearia(dia, "00:00", p.fuso);
    const fim = isoNoFusoDaBarbearia(somarDias(dia, 1), "00:00", p.fuso);

    for (const pid of profissionaisComRegra) {
      if (!idsPermitidos.has(pid)) continue;
      const e = semana.find((s) => s.profissional_id === pid && s.dia_semana === dow);
      const turno = turnoEfetivo(e, especiais.get(pid + ":" + dia));
      if (!turno) continue;
      if (!turno.trabalha || !turno.abre || !turno.fecha) {
        extras.push({ profissional_id: pid, inicio: ini, fim, bloqueio: true });
        continue;
      }
      const abre = isoNoFusoDaBarbearia(dia, turno.abre.slice(0, 5), p.fuso);
      const fecha = isoNoFusoDaBarbearia(dia, turno.fecha.slice(0, 5), p.fuso);
      if (Date.parse(abre) > Date.parse(ini)) {
        extras.push({ profissional_id: pid, inicio: ini, fim: abre, bloqueio: true });
      }
      if (Date.parse(fecha) < Date.parse(fim)) {
        extras.push({ profissional_id: pid, inicio: fecha, fim, bloqueio: true });
      }
    }
  }

  return extras;
}
