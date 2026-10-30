/**
 * Leitura de `horarios_especiais` no servidor (cliente de serviço ou do usuário). Separado de
 * `agenda-regras.server.ts` para `ocupacoes-extras.server.ts` usar sem importação circular.
 */
import type { HorarioDeFuncionamento } from "@/lib/horarios";
import type { HorarioEspecial } from "@/lib/horarios-especiais";

/** Tabela ainda não criada no banco (migração não aplicada): segue sem o ajuste, como antes. */
export function tabelaAusente(error: { code?: string; message?: string }, tabela: string) {
  const mensagem = String(error.message ?? "");
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    (new RegExp(tabela, "i").test(mensagem) && /schema cache|not exist|not found/i.test(mensagem))
  );
}

/** Horários especiais (`horarios_especiais`) de um período, do negócio e de cada profissional. */
export async function horariosEspeciaisDoPeriodo(
  db: any,
  tenantId: string,
  de: string,
  ate: string = de,
): Promise<HorarioEspecial[]> {
  const { data, error } = await db
    .from("horarios_especiais")
    .select("dia, profissional_id, abre, fecha")
    .eq("tenant_id", tenantId)
    .gte("dia", de)
    .lte("dia", ate);
  if (error) {
    if (tabelaAusente(error, "horarios_especiais")) return [];
    throw new Error(
      String(error.message ?? "") || "Não foi possível carregar os horários especiais.",
    );
  }
  return (data ?? []).map(
    (l: { dia: string; profissional_id: string | null; abre: string; fecha: string }) => ({
      dia: String(l.dia).slice(0, 10),
      profissionalId: l.profissional_id,
      abre: String(l.abre).slice(0, 5),
      fecha: String(l.fecha).slice(0, 5),
    }),
  );
}

/** Horário da semana do negócio (só leitura), para combinar com os horários especiais. */
export async function horariosDaSemana(
  db: any,
  tenantId: string,
): Promise<HorarioDeFuncionamento[]> {
  const { data } = await db
    .from("horarios_de_funcionamento")
    .select("dia_semana, fechado, abre, fecha, intervalo_inicio, intervalo_fim")
    .eq("tenant_id", tenantId);
  return ((data ?? []) as Record<string, unknown>[]).map((h) => ({
    diaSemana: Number(h["dia_semana"]),
    fechado: Boolean(h["fechado"]),
    abre: String(h["abre"]).slice(0, 5),
    fecha: String(h["fecha"]).slice(0, 5),
    intervaloInicio: h["intervalo_inicio"] ? String(h["intervalo_inicio"]).slice(0, 5) : null,
    intervaloFim: h["intervalo_fim"] ? String(h["intervalo_fim"]).slice(0, 5) : null,
  }));
}
