import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { tenantIdDoMembro } from "@/lib/tenant";
import {
  LIMITE_WHATSAPP_NO_TESTE,
  faixaDoLimite,
  mesDeReferencia,
  testeAtivo,
  type FaixaDoLimite,
} from "@/lib/teste-gratis";

/**
 * Uso das mensagens automáticas de WhatsApp do mês, para o aviso do menu lateral. Só há cota durante o teste
 * (`reservarEnvioAutomatico`); fora dele a faixa é sempre "livre". Leitura somente, no negócio do usuário.
 */
export const statusDoWhatsappAutomatico = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(
    async ({
      context,
    }): Promise<{ faixa: FaixaDoLimite; enviados: number; limite: number; mes: string }> => {
      const tenantId = await tenantIdDoMembro(context);
      const { data: t } = await context.supabase
        .from("tenants")
        .select("assinatura_status, teste_fim, plano, envios_auto_mes, envios_auto_qtd")
        .eq("id", tenantId)
        .maybeSingle();
      const mes = mesDeReferencia();
      const emTeste =
        !!t && testeAtivo({ status: t.assinatura_status, testeFim: t.teste_fim, plano: t.plano });
      const enviados = emTeste && t.envios_auto_mes === mes ? (t.envios_auto_qtd ?? 0) : 0;
      return {
        faixa: emTeste ? faixaDoLimite(enviados) : "livre",
        enviados,
        limite: LIMITE_WHATSAPP_NO_TESTE,
        mes,
      };
    },
  );
