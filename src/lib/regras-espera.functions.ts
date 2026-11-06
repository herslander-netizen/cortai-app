/**
 * Regras da lista de espera escolhidas pelo negócio (dono, 06/11/2026; migração 0060). Leitura pela equipe; gravação
 * pela função do banco `definir_regras_lista_espera`, que confere a permissão `alterar_dados_barbearia` — o navegador
 * nunca decide permissão.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { regrasDaEsperaDoTenant, type RegrasDaEspera } from "@/lib/fila-compatibilidade";
import { tenantIdDoMembro } from "@/lib/tenant";

export const PRAZOS_DA_ESPERA = [10, 15, 30, 60] as const;
export const ANTECEDENCIAS_DA_ESPERA = [10, 30, 60, 120] as const;

export const getRegrasDaEspera = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<RegrasDaEspera & { disponivel: boolean }> => {
    const tenantId = await tenantIdDoMembro(context);
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { data, error } = await db
      .from("tenants")
      .select("espera_prazo_min, espera_antecedencia_min, espera_qualquer_profissional")
      .eq("id", tenantId)
      .maybeSingle();
    // 42703: colunas ainda não existem neste banco (migração 0060 pendente). A tela mostra o padrão e não deixa salvar.
    if (error?.code === "42703") return { ...regrasDaEsperaDoTenant(null), disponivel: false };
    if (error) throw new Error("Não foi possível carregar as regras.");
    return { ...regrasDaEsperaDoTenant(data), disponivel: true };
  });

export const definirRegrasDaEspera = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        prazoMin: z
          .number()
          .refine((n) => (PRAZOS_DA_ESPERA as readonly number[]).includes(n), "Prazo inválido"),
        antecedenciaMin: z
          .number()
          .refine(
            (n) => (ANTECEDENCIAS_DA_ESPERA as readonly number[]).includes(n),
            "Antecedência inválida",
          ),
        qualquerProfissional: z.boolean(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }): Promise<{ ok: true }> => {
    const tenantId = await tenantIdDoMembro(context);
    const { error } = await context.supabase.rpc("definir_regras_lista_espera", {
      _tenant_id: tenantId,
      _prazo_min: data.prazoMin,
      _antecedencia_min: data.antecedenciaMin,
      _qualquer_profissional: data.qualquerProfissional,
    });
    if (error) throw new Error("Não foi possível salvar as regras.");
    return { ok: true };
  });
