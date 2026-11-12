import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { fusoDoTenant } from "@/lib/fuso.server";
import { exigirPermissao, tenantIdDoMembro } from "@/lib/tenant";

/** Contexto somente leitura da etapa de planejamento. Não expõe cupons nem cria campanhas. */
export const getContextoDeCampanhas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "alterar_dados_barbearia");
    const [fuso, servicos] = await Promise.all([
      fusoDoTenant(tenantId),
      context.supabase
        .from("servicos")
        .select("id, nome, preco_centavos")
        .eq("tenant_id", tenantId)
        .eq("ativo", true)
        .order("nome"),
    ]);
    if (servicos.error)
      throw new Error("Não foi possível consultar os serviços do negócio.");
    return {
      fuso,
      servicos: (servicos.data ?? []).map((s) => ({
        id: s.id as string,
        nome: s.nome as string,
        precoCentavos: s.preco_centavos as number,
      })),
    };
  });
