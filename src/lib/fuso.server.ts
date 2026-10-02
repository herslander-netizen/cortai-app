/**
 * Fuso horário por barbearia.
 *
 * O fuso fica em `tenants.fuso`. Como ele quase nunca muda e é lido em todo
 * cálculo de agenda, lembrete e conversa do WhatsApp, guardamos um cache curto
 * em memória para não bater no banco a cada mensagem.
 */
import { FUSO_BARBEARIA, normalizarFuso } from "@/lib/horarios";

const CACHE = new Map<string, { fuso: string; ate: number }>();
const VALIDADE_MS = 5 * 60 * 1000;

/** Fuso da barbearia; cai no padrão quando não houver valor válido. */
export async function fusoDoTenant(tenantId: string): Promise<string> {
  const agora = Date.now();
  const guardado = CACHE.get(tenantId);
  if (guardado && guardado.ate > agora) return guardado.fuso;

  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("tenants")
      .select("fuso")
      .eq("id", tenantId)
      .maybeSingle();
    const fuso = normalizarFuso((data as { fuso?: string } | null)?.fuso);
    CACHE.set(tenantId, { fuso, ate: agora + VALIDADE_MS });
    return fuso;
  } catch {
    return FUSO_BARBEARIA;
  }
}

/** Limpa o cache logo após o painel salvar um novo fuso. */
export function esquecerFusoDoTenant(tenantId: string) {
  CACHE.delete(tenantId);
}
