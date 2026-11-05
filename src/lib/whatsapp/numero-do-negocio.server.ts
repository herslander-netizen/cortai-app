import { mesmoNumero, numeroParaCadastro } from "./numero-do-negocio";

/**
 * Conexão de atendimento aberta com um número diferente do cadastro: o cadastro passa a ser o conectado (página e agenda
 * abrem o número que de fato atende). Registra na auditoria. Nunca lança: a conexão não depende disto.
 */
export async function alinharNumeroDoNegocio(p: {
  tenantId: string | null;
  tipo: string | null;
  numeroConectado: string | null | undefined;
}): Promise<boolean> {
  if (!p.tenantId || p.tipo !== "atendimento" || !p.numeroConectado) return false;
  try {
    const novo = numeroParaCadastro(p.numeroConectado);
    if (!novo) return false;
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { data: tenant } = await db
      .from("tenants")
      .select("whatsapp")
      .eq("id", p.tenantId)
      .maybeSingle();
    const anterior = (tenant?.whatsapp as string | null) ?? null;
    if (mesmoNumero(anterior, p.numeroConectado)) return false;
    await db.from("tenants").update({ whatsapp: novo }).eq("id", p.tenantId);
    await db.from("auditoria_da_barbearia").insert({
      tenant_id: p.tenantId,
      ator_user_id: null,
      acao: "whatsapp.numero_do_negocio_atualizado",
      alvo: "tenants.whatsapp",
      detalhes: { anterior, novo, origem: "conexao" },
    });
    return true;
  } catch (e) {
    console.error(
      "[whatsapp] não foi possível alinhar o número do negócio",
      e instanceof Error ? e.message : e,
    );
    return false;
  }
}
