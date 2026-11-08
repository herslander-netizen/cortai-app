/** Indicadores CRM: leitura autorizada para membro do negócio. */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { tenantIdDoMembro, exigirPermissao } from "@/lib/tenant";
export const getIndicadoresCRM = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "relatorios");
    const { consultarIndicadoresCRMDoTenant } = await import("./indicadores.server");
    return consultarIndicadoresCRMDoTenant(tenantId);
  });
