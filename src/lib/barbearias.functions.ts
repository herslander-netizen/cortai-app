import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ETAPAS_DA_IMPLANTACAO } from "@/lib/onboarding.functions";

export type BarbeariaVinculada = {
  id: string;
  nome: string;
  slug: string | null;
  logoUrl: string | null;
  plano: string;
  planoNome: string;
  ativa: boolean;
  papel: string;
  acessoAtivo: boolean;
  etapa: string;
  concluida: boolean;
  ehAtiva: boolean;
};

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Lista todas as barbearias ligadas à conta, com plano e etapa real de configuração. */
export const getMinhasBarbearias = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<BarbeariaVinculada[]> => {
    const db = await admin();
    const [{ data: vinculos }, { data: perfil }, { data: planos }] = await Promise.all([
      db
        .from("tenant_usuarios")
        .select("tenant_id, papel, ativo, tenants(id, nome, slug, plano, ativo, logo_url)")
        .eq("user_id", context.userId),
      db.from("perfis").select("tenant_ativo").eq("user_id", context.userId).maybeSingle(),
      db.from("planos_da_plataforma").select("chave, nome"),
    ]);

    const lista = vinculos ?? [];
    if (!lista.length) return [];

    const ids = lista.map((v) => v.tenant_id);
    const { data: onboardings } = await db
      .from("onboarding_do_tenant")
      .select("tenant_id, etapa, concluido_em")
      .in("tenant_id", ids);

    const nomeDoPlano = new Map((planos ?? []).map((p) => [p.chave as string, p.nome as string]));
    const etapaPorTenant = new Map((onboardings ?? []).map((o) => [o.tenant_id as string, o]));
    const ativo = perfil?.tenant_ativo ?? lista[0]?.tenant_id ?? null;

    return lista
      .map((v) => {
        const t = v.tenants as unknown as {
          id: string;
          nome: string;
          slug: string | null;
          plano: string | null;
          ativo: boolean | null;
          logo_url: string | null;
        } | null;
        const ob = etapaPorTenant.get(v.tenant_id);
        const etapa = (ob?.etapa as string | undefined) ?? ETAPAS_DA_IMPLANTACAO[0];
        const plano = t?.plano ?? "essencial";
        return {
          id: v.tenant_id,
          nome: t?.nome ?? "Barbearia",
          slug: t?.slug ?? null,
          logoUrl: t?.logo_url ?? null,
          plano,
          planoNome: nomeDoPlano.get(plano) ?? plano,
          ativa: t?.ativo !== false,
          papel: v.papel as string,
          acessoAtivo: v.ativo !== false,
          etapa,
          concluida: Boolean(ob?.concluido_em) || etapa === "pronto",
          ehAtiva: v.tenant_id === ativo,
        } satisfies BarbeariaVinculada;
      })
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  });

/** Troca a barbearia em uso. Só aceita barbearias em que a conta tem vínculo ativo. */
export const definirBarbeariaAtiva = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ tenantId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { data: vinculo } = await db
      .from("tenant_usuarios")
      .select("tenant_id, ativo")
      .eq("user_id", context.userId)
      .eq("tenant_id", data.tenantId)
      .maybeSingle();
    if (!vinculo || vinculo.ativo === false) throw new Error("Sem acesso a esta barbearia.");

    const { error } = await db
      .from("perfis")
      .upsert({ user_id: context.userId, tenant_ativo: data.tenantId }, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
