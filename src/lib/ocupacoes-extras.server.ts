/**
 * Bloqueios por data e escala por profissional viram "ocupações" do motor oficial
 * (`disponibilidade.ts`). Assim todos os pontos que já calculam horários livres
 * respeitam as duas regras sem lógica paralela.
 */
import type { Ocupado } from "@/lib/disponibilidade";
import { isoNoFusoDaBarbearia, somarDias, diaDaSemanaDoDia, hojeNoFuso } from "@/lib/horarios";

export async function ocupacoesExtras(
  db: any,
  p: { tenantId: string; fuso: string; desde: Date; ate: Date; profissionalIds?: string[] },
): Promise<Ocupado[]> {
  let ids = p.profissionalIds;
  if (!ids) {
    const { data } = await db.from("profissionais").select("id").eq("tenant_id", p.tenantId);
    ids = ((data ?? []) as { id: string }[]).map((x) => x.id);
  }
  const [{ data: bloqueios }, { data: escalas }] = await Promise.all([
    db
      .from("bloqueios_de_agenda")
      .select("profissional_id, inicio, fim")
      .eq("tenant_id", p.tenantId)
      .lt("inicio", p.ate.toISOString())
      .gt("fim", p.desde.toISOString()),
    db
      .from("escalas_de_profissional")
      .select("profissional_id, dia_semana, trabalha, abre, fecha")
      .eq("tenant_id", p.tenantId),
  ]);
  const extras: Ocupado[] = [];
  for (const b of (bloqueios ?? []) as {
    profissional_id: string | null;
    inicio: string;
    fim: string;
  }[]) {
    const alvo = b.profissional_id ? [b.profissional_id] : ids;
    for (const id of alvo)
      extras.push({ profissional_id: id, inicio: b.inicio, fim: b.fim, bloqueio: true });
  }
  const lista = (escalas ?? []) as {
    profissional_id: string;
    dia_semana: number;
    trabalha: boolean;
    abre: string | null;
    fecha: string | null;
  }[];
  if (lista.length) {
    let dia = hojeNoFuso(p.fuso, p.desde);
    const ultimo = hojeNoFuso(p.fuso, p.ate);
    for (let i = 0; i < 120 && dia <= ultimo; i++, dia = somarDias(dia, 1)) {
      const dow = diaDaSemanaDoDia(dia);
      const ini = isoNoFusoDaBarbearia(dia, "00:00", p.fuso);
      const fim = isoNoFusoDaBarbearia(somarDias(dia, 1), "00:00", p.fuso);
      for (const e of lista) {
        if (e.dia_semana !== dow) continue;
        const pid = e.profissional_id;
        if (!e.trabalha || !e.abre || !e.fecha) {
          extras.push({ profissional_id: pid, inicio: ini, fim, bloqueio: true });
          continue;
        }
        const abre = isoNoFusoDaBarbearia(dia, e.abre.slice(0, 5), p.fuso);
        const fecha = isoNoFusoDaBarbearia(dia, e.fecha.slice(0, 5), p.fuso);
        if (Date.parse(abre) > Date.parse(ini))
          extras.push({ profissional_id: pid, inicio: ini, fim: abre, bloqueio: true });
        if (Date.parse(fecha) < Date.parse(fim))
          extras.push({ profissional_id: pid, inicio: fecha, fim, bloqueio: true });
      }
    }
  }
  return extras;
}
