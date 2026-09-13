import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { tenantIdDoMembro, type ContextoAutenticado } from "@/lib/tenant";
import { exigirRecurso } from "@/lib/planos";

export type ConfigFidelidade = {
  tenantId: string;
  ativo: boolean;
  alvo: number;
  precoBaseCentavos: number;
  clientesComProgresso: number;
};

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function tenantPadrao(context: ContextoAutenticado) {
  const db = await admin();
  const tenantId = await tenantIdDoMembro(context);
  return { db, tenantId };
}

export const getConfigFidelidade = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth]).handler(
  async ({ context }): Promise<ConfigFidelidade> => {
    const { db, tenantId } = await tenantPadrao(context);
    await exigirRecurso(db, tenantId, "fidelidade");

    const [regraRes, servicoRes, carteirasRes] = await Promise.all([
      db
        .from("regras_de_plano")
        .select("ativo, fidelidade_alvo")
        .eq("tenant_id", tenantId)
        .eq("tipo", "fidelidade")
        .maybeSingle(),
      db
        .from("servicos")
        .select("preco_centavos")
        .eq("tenant_id", tenantId)
        .eq("ativo", true)
        .order("ordem")
        .limit(1)
        .maybeSingle(),
      db.from("carteiras").select("id").eq("tenant_id", tenantId).gt("fidelidade_progresso", 0),
    ]);

    return {
      tenantId,
      ativo: regraRes.data?.ativo ?? false,
      alvo: regraRes.data?.fidelidade_alvo ?? 10,
      precoBaseCentavos: servicoRes.data?.preco_centavos ?? 0,
      clientesComProgresso: carteirasRes.data?.length ?? 0,
    };
  },
);

export const salvarFidelidade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { ativo: boolean; alvo: number }) => {
    const alvo = Math.round(data.alvo);
    if (alvo < 4 || alvo > 20) throw new Error("alvo fora da faixa");
    return { ativo: !!data.ativo, alvo };
  })
  .handler(async ({ data, context }) => {
    const { db, tenantId } = await tenantPadrao(context);
    await exigirRecurso(db, tenantId, "fidelidade");

    const { data: existente } = await db
      .from("regras_de_plano")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("tipo", "fidelidade")
      .maybeSingle();

    // Desligar o programa nunca zera o progresso acumulado nas carteiras:
    // aqui só mexemos na regra, nunca em carteiras nem em movimentos.
    if (existente) {
      const { error } = await db
        .from("regras_de_plano")
        .update({ ativo: data.ativo, fidelidade_alvo: data.alvo })
        .eq("id", existente.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await db
        .from("regras_de_plano")
        .insert({ tenant_id: tenantId, tipo: "fidelidade", ativo: data.ativo, fidelidade_alvo: data.alvo });
      if (error) throw new Error(error.message);
    }

    return { ok: true, ativo: data.ativo, alvo: data.alvo };
  });

export const getClientesFidelidade = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { db, tenantId } = await tenantPadrao(context);
  await exigirRecurso(db, tenantId, "fidelidade");
  const [regraRes, carteirasRes] = await Promise.all([
    db
      .from("regras_de_plano")
      .select("fidelidade_alvo")
      .eq("tenant_id", tenantId)
      .eq("tipo", "fidelidade")
      .maybeSingle(),
    db
      .from("carteiras")
      .select("cliente_id, fidelidade_progresso, clientes(nome)")
      .eq("tenant_id", tenantId)
      .gt("fidelidade_progresso", 0)
      .order("fidelidade_progresso", { ascending: false }),
  ]);
  const alvo = regraRes.data?.fidelidade_alvo ?? 10;
  return {
    alvo,
    clientes: (carteirasRes.data ?? []).map((c) => ({
      id: c.cliente_id,
      nome: (c as { clientes?: { nome?: string } | null }).clientes?.nome ?? "Cliente",
      progresso: c.fidelidade_progresso,
      elegivel: c.fidelidade_progresso >= alvo,
    })),
  };
});
