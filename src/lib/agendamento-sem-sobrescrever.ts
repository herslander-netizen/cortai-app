/**
 * Grava a mudança de horário só se o agendamento ainda estiver como a tela viu (mesmo início, fim e um status que
 * permite remarcar). A conferência antes de gravar não basta: duas pessoas salvando no mesmo instante passavam as
 * duas e a segunda sobrescrevia a primeira. Aqui a condição vai junto no próprio UPDATE, então só uma grava.
 */
export const STATUS_QUE_REMARCAM = ["agendado", "chegou"] as const;

export const TEXTO_MUDOU_ENQUANTO_EDITAVA =
  "Este agendamento mudou enquanto você editava. Confira e tente de novo.";

export type Visto = { id: string; inicio: string; fim: string };

export async function gravarHorarioSemSobrescrever(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- cliente Supabase do servidor ou falso nos testes
  db: any,
  tenantId: string,
  visto: Visto,
  mudancas: Record<string, unknown>,
): Promise<{ error: { code?: string; message: string } | null; mudou: boolean }> {
  const { data, error } = await db
    .from("agendamentos")
    .update(mudancas)
    .eq("id", visto.id)
    .eq("tenant_id", tenantId)
    .eq("inicio", visto.inicio)
    .eq("fim", visto.fim)
    .in("status", [...STATUS_QUE_REMARCAM])
    .select("id");
  if (error) return { error, mudou: false };
  return { error: null, mudou: !data || data.length === 0 };
}
