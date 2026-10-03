import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { hojeNoFuso, isoNoFusoDaBarbearia, normalizarFuso, somarDias } from "@/lib/horarios";
import { resumoDoFunil } from "@/lib/funil";

/** Desempenho da página pública nos últimos 7 dias (só números, nenhum dado pessoal). */
export const getDesempenhoDaSemana = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ tenantId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: pode } = await context.supabase.rpc("has_tenant_permission", {
      _tenant_id: data.tenantId,
      _permission: "relatorios",
    });
    if (!pode) throw new Error("Sem permissão");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("fuso")
      .eq("id", data.tenantId)
      .maybeSingle();
    const fuso = normalizarFuso(tenant?.fuso);
    const desde = isoNoFusoDaBarbearia(somarDias(hojeNoFuso(fuso), -6), "00:00", fuso);
    const contar = async (etapa: string, foraDaVitrine = false) => {
      let q = supabaseAdmin
        .from("eventos_funil")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", data.tenantId)
        .eq("etapa", etapa)
        .gte("criado_em", desde);
      if (foraDaVitrine) q = q.neq("experiencia", "vitrine");
      const { count, error } = await q;
      if (error) throw new Error(error.message);
      return count ?? 0;
    };
    const [vitrine, entradaDireta, confirmados] = await Promise.all([
      contar("vitrine_visita"),
      contar("agendamento_aberto", true),
      contar("confirmado"),
    ]);
    return resumoDoFunil({ vitrine, entradaDireta, confirmados });
  });
