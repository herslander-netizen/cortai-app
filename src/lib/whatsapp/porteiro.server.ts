/** Leitura da ficha para o porteiro do WhatsApp (`porteiro.ts`). Só servidor. */
import { podeMandarWhatsapp, type Decisao } from "./porteiro";

export async function decisaoDeEnvio(
  clienteId: string | null | undefined,
  opcoes: { relacionamento?: boolean } = {},
): Promise<Decisao> {
  if (!clienteId) return { pode: false, motivo: "Cliente não encontrado." };
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // `*` mantém a leitura válida antes e depois da migração 0033.
  const { data } = await supabaseAdmin
    .from("clientes")
    .select("*")
    .eq("id", clienteId)
    .maybeSingle();
  return podeMandarWhatsapp(data, opcoes);
}
