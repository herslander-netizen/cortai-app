import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { tenantIdDoMembro } from "@/lib/tenant";
import { condicaoVigente, limiteVigente } from "@/lib/monetizacao";
import { condicaoDaLinha, planoDaLinha } from "@/lib/monetizacao.functions";
import type { CapacidadesDoTenant } from "@/lib/capacidades";
import { diasRestantesDoTeste, planoEfetivo, testeAtivo } from "@/lib/teste-gratis";

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
    db
      .from("tenants")
      .select("plano, assinatura_status, teste_fim")
      .eq("id", tenantId)
      .maybeSingle(),
    db
      .from("condicoes_comerciais")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("inicio", { ascending: false }),
    db.from("profissionais").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
    db
      .from("servicos")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("ativo", true),
    db.from("recursos_do_tenant").select("chave, ativo").eq("tenant_id", tenantId),
  ]);

  const condicao = condicaoVigente((condRes.data ?? []).map(condicaoDaLinha));
  const estado = {
    status: (tenantRes.data?.assinatura_status as string) ?? null,
    testeFim: (tenantRes.data?.teste_fim as string) ?? null,
    plano: (tenantRes.data?.plano as string) ?? null,
  };
  const emTeste = testeAtivo(estado);
  const chaveDoPlano = emTeste
    ? planoEfetivo(estado)
    : (condicao?.planoChave ?? estado.plano ?? "essencial");

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
    teste: {
      ativo: emTeste,
      diasRestantes: diasRestantesDoTeste(estado.testeFim),
      fim: estado.testeFim,
    },
  };
}

/** Uso do limite mensal de agendamentos para o aviso do dono (80% e 100%). */
export const getUsoDaAgendaOnline = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const tenantId = await tenantIdDoMembro(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { usoDaAgendaOnline } = await import("@/lib/agenda-online.server");
    const { avisoDoLimiteMensal } = await import("@/lib/agenda-online");
    const r = await usoDaAgendaOnline(supabaseAdmin, tenantId);
    return { limite: r.limite, uso: r.uso, aviso: avisoDoLimiteMensal(r) };
  });
