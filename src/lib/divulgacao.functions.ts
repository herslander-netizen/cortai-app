import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { tenantIdDoMembro } from "@/lib/tenant";

/** Dados do negócio usados pelo estúdio de divulgação (RLS do próprio usuário). */
export const getDadosDivulgacao = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const tenantId = await tenantIdDoMembro(context);
    const [{ data: tenant }, { data: servicos }] = await Promise.all([
      context.supabase.from("tenants").select("nome, slug, segmento").eq("id", tenantId).maybeSingle(),
      context.supabase
        .from("servicos")
        .select("id, nome, preco_centavos")
        .eq("tenant_id", tenantId)
        .eq("ativo", true)
        .order("nome"),
    ]);
    if (!tenant) throw new Error("Negócio não encontrado");
    return {
      nome: tenant.nome as string,
      slug: tenant.slug as string,
      segmento: (tenant.segmento as string | null) ?? null,
      servicos: (servicos ?? []).map((s) => ({
        id: s.id as string,
        nome: s.nome as string,
        preco: s.preco_centavos as number | null,
      })),
    };
  });
