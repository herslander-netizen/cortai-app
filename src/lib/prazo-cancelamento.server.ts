import { mensagemDoPrazoDeCancelamento, prazoDeCancelamentoVencido } from "./prazo-cancelamento";

/**
 * Prazo de cancelamento do negócio (`tenants.cancelamento_min_horas`), aplicado só onde o
 * próprio cliente cancela (link público, app do cliente, atendimento ao cliente). A equipe e
 * os processos internos cancelam a qualquer hora e não passam por aqui.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- cliente do banco já usado como `any` nos servidores
export async function exigirPrazoDeCancelamento(db: any, agendamentoId: string): Promise<void> {
  const { data: ag } = await db
    .from("agendamentos")
    .select("inicio, tenant_id")
    .eq("id", agendamentoId)
    .maybeSingle();
  if (!ag) return;
  const { data: tenant } = await db
    .from("tenants")
    .select("cancelamento_min_horas")
    .eq("id", ag.tenant_id)
    .maybeSingle();
  const horas = Number(tenant?.cancelamento_min_horas ?? 0);
  if (prazoDeCancelamentoVencido(ag.inicio, horas)) {
    throw new Error(mensagemDoPrazoDeCancelamento(horas));
  }
}
