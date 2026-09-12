import { createServerFn } from "@tanstack/react-start";

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

async function tenantPadrao() {
  const db = await admin();
  const { data: tenant } = await db
    .from("tenants")
    .select("id")
    .order("criado_em", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!tenant) throw new Error("Nenhuma barbearia cadastrada");
  return { db, tenantId: tenant.id };
}

export const getConfigFidelidade = createServerFn({ method: "GET" }).handler(
  async (): Promise<ConfigFidelidade> => {
    const { db, tenantId } = await tenantPadrao();

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
  .inputValidator((data: { ativo: boolean; alvo: number }) => {
    const alvo = Math.round(data.alvo);
    if (alvo < 4 || alvo > 20) throw new Error("alvo fora da faixa");
    return { ativo: !!data.ativo, alvo };
  })
  .handler(async ({ data }) => {
    const { db, tenantId } = await tenantPadrao();

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
