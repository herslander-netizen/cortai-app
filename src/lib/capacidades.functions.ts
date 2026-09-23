import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { tenantIdDoMembro } from "@/lib/tenant";
import { condicaoVigente, limiteVigente } from "@/lib/monetizacao";
import { condicaoDaLinha, planoDaLinha } from "@/lib/monetizacao.functions";
import type { CapacidadesDoTenant } from "@/lib/capacidades";

/**
 * Fonte única das capacidades da barbearia: plano vigente, limites reais e
 * estado de cada recurso. Uma chamada só, para o onboarding, os menus e as
 * telas não repetirem a mesma leitura.
 */
export const getCapacidades = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CapacidadesDoTenant> => {
    const tenantId = await tenantIdDoMembro(context);
    return await capacidadesDoTenant(context.supabase, tenantId);
  });

/** Mesma leitura, reaproveitável por outras funções de servidor. */
export async function capacidadesDoTenant(db: any, tenantId: string): Promise<CapacidadesDoTenant> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const [tenantRes, condRes, profRes, servRes, ativosRes] = await Promise.all([
    db.from("tenants").select("plano").eq("id", tenantId).maybeSingle(),
    db.from("condicoes_comerciais").select("*").eq("tenant_id", tenantId).order("inicio", { ascending: false }),
    db.from("profissionais").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
    db.from("servicos").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("ativo", true),
    db.from("recursos_do_tenant").select("chave, ativo").eq("tenant_id", tenantId),
  ]);

  const condicao = condicaoVigente((condRes.data ?? []).map(condicaoDaLinha));
  const chaveDoPlano = condicao?.planoChave ?? (tenantRes.data?.plano as string) ?? "essencial";

  const [planoRes, regrasRes] = await Promise.all([
    supabaseAdmin.from("planos_da_plataforma").select("*").eq("chave", chaveDoPlano).maybeSingle(),
    supabaseAdmin.from("recursos_de_plano").select("chave, liberado").eq("plano", chaveDoPlano),
  ]);

  const plano = planoRes.data ? planoDaLinha(planoRes.data) : null;

  const liberados: Record<string, boolean> = {};
  for (const linha of regrasRes.data ?? []) {
    liberados[linha.chave as string] = Boolean(linha.liberado);
  }
  const ativos: Record<string, boolean> = {};
  for (const linha of ativosRes.data ?? []) {
    ativos[linha.chave as string] = Boolean(linha.ativo);
  }

  return {
    plano: { chave: chaveDoPlano, nome: plano?.nome ?? chaveDoPlano },
    limites: {
      profissionais: limiteVigente(plano, condicao, "profissionais"),
      clientes: limiteVigente(plano, condicao, "clientes"),
      agendamentos_mes: limiteVigente(plano, condicao, "agendamentos_mes"),
      unidades: limiteVigente(plano, condicao, "unidades"),
    },
    liberados,
    ativos,
    uso: { profissionais: profRes.count ?? 0, servicos: servRes.count ?? 0 },
  };
}
