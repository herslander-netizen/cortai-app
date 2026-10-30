/**
 * Bloqueios por data e escala por profissional viram "ocupações" do motor oficial
 * (`disponibilidade.ts`). Assim todos os pontos que já calculam horários livres
 * respeitam as duas regras sem lógica paralela. Horário especial numa data (`horarios-especiais.ts`): quem não
 * estende fica bloqueado na parte a mais, e quem tem especial próprio deixa de seguir a escala naquele dia.
 */
import type { Ocupado } from "@/lib/disponibilidade";
import { isoNoFusoDaBarbearia, somarDias, diaDaSemanaDoDia, hojeNoFuso } from "@/lib/horarios";
import { bloqueiosDosHorariosEspeciais } from "@/lib/horarios-especiais";
import { horariosDaSemana, horariosEspeciaisDoPeriodo } from "@/lib/horarios-especiais.server";

export async function ocupacoesExtras(
  db: any,
  p: { tenantId: string; fuso: string; desde: Date; ate: Date; profissionalIds?: string[] },
): Promise<Ocupado[]> {
  let ids = p.profissionalIds;
  if (!ids) {
    const { data } = await db.from("profissionais").select("id").eq("tenant_id", p.tenantId);
    ids = ((data ?? []) as { id: string }[]).map((x) => x.id);
  }
  const [{ data: bloqueios, error: erroBloqueios }, { data: escalas, error: erroEscalas }] = await Promise.all([
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
  if (erroBloqueios) throw new Error("Não foi possível carregar os bloqueios da agenda.");
  if (erroEscalas) throw new Error("Não foi possível carregar a escala dos profissionais.");
  const primeiroDia = hojeNoFuso(p.fuso, p.desde);
  const ultimoDia = hojeNoFuso(p.fuso, p.ate);
  // A leitura só retorna vazio quando a tabela ainda não existe (migração pendente).
  // Erros reais de banco precisam interromper a validação, nunca liberar horários por omissão.
  const especiais = await horariosEspeciaisDoPeriodo(db, p.tenantId, primeiroDia, ultimoDia);
  // Quem tem horário especial próprio no dia não segue a escala naquele dia.
  const especialProprio = new Set(
    especiais.filter((e) => e.profissionalId).map((e) => `${e.profissionalId}|${e.dia}`),
  );
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
    let dia = primeiroDia;
    const ultimo = ultimoDia;
    for (let i = 0; i < 120 && dia <= ultimo; i++, dia = somarDias(dia, 1)) {
      const dow = diaDaSemanaDoDia(dia);
      const ini = isoNoFusoDaBarbearia(dia, "00:00", p.fuso);
      const fim = isoNoFusoDaBarbearia(somarDias(dia, 1), "00:00", p.fuso);
      for (const e of lista) {
        if (e.dia_semana !== dow) continue;
        const pid = e.profissional_id;
        if (especialProprio.has(`${pid}|${dia}`)) continue;
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
  if (especiais.length) {
    const semana = await horariosDaSemana(db, p.tenantId);
    for (const dia of new Set(especiais.map((e) => e.dia))) {
      const dow = diaDaSemanaDoDia(dia);
      const comEscala = new Set(
        lista.filter((e) => e.dia_semana === dow).map((e) => e.profissional_id),
      );
      extras.push(
        ...bloqueiosDosHorariosEspeciais({
          dia,
          horarios: semana,
          especiais,
          profissionalIds: ids,
          fuso: p.fuso,
          comEscala,
        }),
      );
    }
  }
  return extras;
}
