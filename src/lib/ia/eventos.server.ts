/**
 * Fila (outbox) de eventos de negócio destinados à plataforma de IA.
 *
 * Regras:
 * - sempre por barbearia (`tenant_id`), nunca global;
 * - idempotente: a mesma chave nunca entra duas vezes;
 * - gravar evento nunca pode derrubar a operação de negócio que o originou.
 */
import type { EventoDeNegocio, TipoDeEventoDeIA } from "./contrato";
import { PROVEDOR_PADRAO } from "./contrato";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Monta o evento no formato do contrato, com chave de idempotência estável. */
export function montarEvento(
  tenantId: string,
  tipo: TipoDeEventoDeIA,
  entidadeId: string,
  payload: Record<string, unknown> = {},
  versao: string = new Date().toISOString(),
): EventoDeNegocio {
  return {
    tenantId,
    tipo,
    chaveIdempotencia: `${tipo}:${entidadeId}:${versao}`,
    ocorridoEm: new Date().toISOString(),
    payload,
  };
}

/**
 * Grava o evento na fila. Só grava quando a barbearia tem integração criada —
 * sem integração não há para quem enviar e não faz sentido acumular dados.
 * Retorna `false` quando o evento foi ignorado ou já existia.
 */
export async function registrarEvento(evento: EventoDeNegocio): Promise<boolean> {
  try {
    const db = await admin();
    const { data: integracao } = await db
      .from("integracoes_de_ia")
      .select("id, status")
      .eq("tenant_id", evento.tenantId)
      .eq("provedor", PROVEDOR_PADRAO)
      .maybeSingle();
    if (!integracao || integracao.status === "suspenso") return false;

    const { error } = await db.from("eventos_de_ia").insert({
      tenant_id: evento.tenantId,
      provedor: PROVEDOR_PADRAO,
      tipo: evento.tipo,
      chave_idempotencia: evento.chaveIdempotencia,
      payload: { ...evento.payload, ocorrido_em: evento.ocorridoEm },
    });
    // 23505 = chave duplicada: reentrega já registrada, nada a fazer.
    if (error && error.code !== "23505") throw new Error(error.message);
    return !error;
  } catch (erro) {
    console.error("[alvo-ia] falha ao registrar evento", erro);
    return false;
  }
}

/** Atalho usado pelos módulos de negócio: nunca lança, nunca bloqueia. */
export async function emitirEvento(
  tenantId: string,
  tipo: TipoDeEventoDeIA,
  entidadeId: string,
  payload: Record<string, unknown> = {},
): Promise<void> {
  await registrarEvento(montarEvento(tenantId, tipo, entidadeId, payload));
}
