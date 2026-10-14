import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type AdminDb = SupabaseClient<Database>;
type WebhookEvent = Pick<
  Database["public"]["Tables"]["whatsapp_webhook_events"]["Row"],
  "id" | "payload"
>;

export type WebhookClaim = {
  evento: WebhookEvent;
  token: string;
};

// A execução normal é curta; a lease longa permite recuperar processos encerrados
// abruptamente sem disputar com uma execução legítima ainda em andamento.
export const WEBHOOK_PROCESSING_LEASE_MS = 10 * 60_000;

/**
 * Reivindica atomicamente um evento pendente.
 *
 * O UPDATE condicional é o lock: o Postgres reavalia os filtros depois de
 * aguardar um UPDATE concorrente, portanto apenas uma execução obtém a lease.
 */
export async function reivindicarWebhook(
  db: AdminDb,
  eventoId: string,
  agoraMs = Date.now(),
): Promise<WebhookClaim | null> {
  const token = globalThis.crypto.randomUUID();
  const agora = new Date(agoraMs).toISOString();
  const leaseExpiradaAntesDe = new Date(agoraMs - WEBHOOK_PROCESSING_LEASE_MS).toISOString();

  const { data, error } = await db
    .from("whatsapp_webhook_events")
    .update(
      {
        processing_started_at: agora,
        processing_token: token,
      } as never,
    )
    .eq("id", eventoId)
    .is("processed_at", null)
    .or(
      `processing_started_at.is.null,processing_started_at.lt.${leaseExpiradaAntesDe}`,
    )
    .select("id, payload")
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao reivindicar evento de webhook: ${error.message}`);
  }
  if (!data) return null;

  return { evento: data, token };
}

/** Marca como concluído somente se esta execução ainda for dona da lease. */
export async function concluirWebhook(
  db: AdminDb,
  claim: WebhookClaim,
  processadoEm = new Date().toISOString(),
): Promise<void> {
  const { data, error } = await db
    .from("whatsapp_webhook_events")
    .update(
      {
        processed_at: processadoEm,
        processing_error: null,
        processing_started_at: null,
        processing_token: null,
      } as never,
    )
    .eq("id", claim.evento.id)
    .eq("processing_token", claim.token)
    .is("processed_at", null)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    throw new Error("Falha ao registrar conclusão do webhook ou lease perdida.");
  }
}

/**
 * Registra a falha e libera a lease apenas para quem ainda possui o token.
 * Se outro processo já retomou o evento, esta atualização não interfere nele.
 */
export async function registrarFalhaWebhook(
  db: AdminDb,
  claim: WebhookClaim,
  erro: unknown,
): Promise<void> {
  const mensagem = erro instanceof Error ? erro.message : "Falha ao processar.";
  const { error: persistenciaErro } = await db
    .from("whatsapp_webhook_events")
    .update(
      {
        processing_error: mensagem,
        processing_started_at: null,
        processing_token: null,
      } as never,
    )
    .eq("id", claim.evento.id)
    .eq("processing_token", claim.token)
    .is("processed_at", null);

  if (persistenciaErro) {
    throw new Error(`Falha ao persistir erro do webhook: ${persistenciaErro.message}`);
  }
}
