import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import { estadoDaAgendaOnline, type EstadoAgendaOnline } from "@/lib/agenda-online";
import { inicioDoMesNoFuso } from "@/lib/horarios";
import { condicaoDaLinha, planoDaLinha } from "@/lib/monetizacao.functions";
import { condicaoVigente, limiteVigente } from "@/lib/monetizacao";
import { testeAtivo } from "@/lib/teste-gratis";

/** Uso e limite de agendamentos do mês (fuso do negócio, sem cancelados). */
export async function usoDaAgendaOnline(
  db: SupabaseClient<Database>,
  tenantId: string,
): Promise<{ emTeste: boolean; limite: number | null; uso: number; estado: EstadoAgendaOnline }> {
  const { data: t } = await db
    .from("tenants")
    .select("plano, assinatura_status, teste_fim, fuso")
    .eq("id", tenantId)
    .maybeSingle();
  const emTeste = testeAtivo({
    status: (t?.assinatura_status as string) ?? null,
    testeFim: (t?.teste_fim as string) ?? null,
    plano: (t?.plano as string) ?? null,
  });
  if (emTeste) return { emTeste, limite: null, uso: 0, estado: "aberta" };
  const [{ data: planos }, { data: conds }] = await Promise.all([
    db.from("planos_da_plataforma").select("*"),
    db.from("condicoes_comerciais").select("*").eq("tenant_id", tenantId),
  ]);
  const condicao = condicaoVigente((conds ?? []).map(condicaoDaLinha));
  const chave = condicao?.planoChave ?? (t?.plano as string) ?? "essencial";
  const plano = (planos ?? []).map(planoDaLinha).find((p) => p.chave === chave) ?? null;
  const limite = limiteVigente(plano, condicao, "agendamentos_mes");
  if (limite == null) return { emTeste, limite, uso: 0, estado: "aberta" };
  const inicio = inicioDoMesNoFuso((t?.fuso as string) || undefined);
  const { count } = await db
    .from("agendamentos")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .neq("status", "cancelado")
    .gte("inicio", inicio.toISOString());
  const uso = count ?? 0;
  return { emTeste, limite, uso, estado: estadoDaAgendaOnline({ emTeste, limite, uso }) };
}
