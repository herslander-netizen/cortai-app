/**
 * Prepara o atendimento de novos estabelecimentos quando o WhatsApp
 * é realmente conectado. Mantém as escolhas de quem já configurou a IA.
 *
 * A conexão e o consentimento do cliente são condições independentes:
 * ligar a automação nunca concede opt-in a um cliente.
 */
// A coluna cortai_ativa utiliza o DEFAULT true do banco; o tipo gerado
// impede atribuí-la no INSERT. Não substituir por cast que esconda o problema.
export const CONFIG_INICIAL_WHATSAPP = {
  atendimento_automatico: true,
  responder_whatsapp: true,
  saudacao_ativa: true,
  confirmacao_automatica: true,
  lembretes: true,
} as const;

export function devePrepararAtendimento(status: string | null | undefined): boolean {
  return status === "conectado";
}

export async function garantirAtendimentoAoConectar(tenantId: string): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("config_atendimento_ia").upsert(
    { tenant_id: tenantId, ...CONFIG_INICIAL_WHATSAPP },
    { onConflict: "tenant_id", ignoreDuplicates: true },
  );
  if (error) throw new Error("Não foi possível preparar o atendimento automático.");
}
