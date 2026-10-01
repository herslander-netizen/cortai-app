import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import { filaDeChegadaDoContainer } from "@/lib/pagina-config";

/** Lê se o negócio atende sem horário marcado (fila de chegada). Sem configuração = ligada. */
export async function filaDeChegadaAtiva(db: SupabaseClient<Database>, tenantId: string) {
  const { data } = await db
    .from("tenant_page_configs")
    .select("published_config, draft_config")
    .eq("tenant_id", tenantId)
    .maybeSingle();
  return filaDeChegadaDoContainer(data?.published_config ?? data?.draft_config ?? null);
}

/** Quantas pessoas estão na fila de chegada (não conta a lista de espera de vaga futura). */
export async function contarFilaDeChegada(db: SupabaseClient<Database>, tenantId: string) {
  const { count } = await db
    .from("fila_de_espera")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .in("status", ["aguardando", "avisado"])
    .is("janela_preferida", null);
  return count ?? 0;
}
