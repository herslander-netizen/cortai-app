/**
 * Ponte de ENTRADA: ALVO IA / CortAI → Cortaí.
 *
 * O atendente inteligente nunca fala com o banco e nunca recebe um `tenant_id`
 * do próprio corpo da requisição. Ele apresenta um token exclusivo da barbearia
 * (emitido no painel de Integrações) e o servidor descobre a barbearia a partir
 * do hash desse token. Um token só abre a porta de uma barbearia.
 *
 * O token em texto puro nunca é gravado: guardamos apenas o SHA-256 e um
 * prefixo curto para a barbearia reconhecer qual chave está ativa.
 */
import { PROVEDOR_PADRAO } from "./contrato";
import type { ContextoDoAgente } from "./acoes.server";

const PREFIXO_DO_TOKEN = "cortai_";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function hashDoToken(token: string): Promise<string> {
  const { createHash } = await import("node:crypto");
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/** Gera um token novo. O texto puro é devolvido UMA única vez a quem pediu. */
export async function gerarToken(): Promise<{ token: string; hash: string; prefixo: string }> {
  const { randomBytes } = await import("node:crypto");
  const token = `${PREFIXO_DO_TOKEN}${randomBytes(32).toString("hex")}`;
  return { token, hash: await hashDoToken(token), prefixo: token.slice(0, 14) };
}

/** Lê o token do cabeçalho `Authorization: Bearer …` (ou `X-Cortai-Token`). */
export function tokenDaRequisicao(request: Request): string | null {
  const autorizacao = request.headers.get("authorization");
  if (autorizacao?.toLowerCase().startsWith("bearer ")) return autorizacao.slice(7).trim() || null;
  return request.headers.get("x-cortai-token")?.trim() || null;
}

/**
 * Resolve a barbearia dona do token. Devolve `null` quando o token não existe,
 * está suspenso ou a barbearia está desativada — nunca diz qual dos casos.
 */
export async function contextoDoToken(token: string | null): Promise<ContextoDoAgente | null> {
  if (!token || !token.startsWith(PREFIXO_DO_TOKEN)) return null;
  const db = await admin();
  const { data } = await db
    .from("integracoes_de_ia")
    .select("tenant_id, status, external_agent_id")
    .eq("provedor", PROVEDOR_PADRAO)
    .eq("token_hash", await hashDoToken(token))
    .maybeSingle();
  if (!data || data.status === "suspenso" || data.status === "desconectado") return null;

  const { data: tenant } = await db
    .from("tenants")
    .select("id, ativo")
    .eq("id", data.tenant_id)
    .maybeSingle();
  if (!tenant || tenant.ativo === false) return null;

  await db
    .from("integracoes_de_ia")
    .update({ token_usado_em: new Date().toISOString() })
    .eq("tenant_id", data.tenant_id)
    .eq("provedor", PROVEDOR_PADRAO);

  return {
    tenantId: data.tenant_id as string,
    externalAgentId: (data.external_agent_id as string) ?? null,
  };
}
