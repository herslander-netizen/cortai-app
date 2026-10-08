/**
 * Remetente de qualquer envio do negócio, com reserva:
 * (a) conexão própria, conectada e não compartilhada;
 * (b) senão, o número oficial do Cortaí (conexão compartilhada) — criada
 *     automaticamente para o negócio que ainda não tem linha;
 * (c) senão, nenhuma: quem chama registra "Nenhum WhatsApp disponível".
 *
 * Cada conexão carrega o próprio `provedor` (evolution/meta): o envio usa o
 * serviço da conexão escolhida, nunca o de outro negócio.
 */
import { logConexao, podeEnviarPelaConexao } from "./saude-conexao";

export type ConexaoDeEnvio = {
  id: string;
  sessao_id: string;
  compartilhada: boolean;
  provedor: string | null;
};

export const SEM_WHATSAPP_DISPONIVEL = "Nenhum WhatsApp disponível.";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function conexaoDeEnvio(tenantId: string): Promise<ConexaoDeEnvio | null> {
  const db = await admin();
  const { data: propria } = await db
    .from("conexoes_whatsapp")
    .select("id, sessao_id, status, compartilhada, provedor")
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (propria && propria.status === "conectado") {
    return {
      id: propria.id,
      sessao_id: propria.sessao_id,
      compartilhada: propria.compartilhada === true,
      provedor: propria.provedor ?? null,
    };
  }

  const { data: oficial } = await db
    .from("conexoes_whatsapp")
    .select("id, sessao_id, provedor, numero, nome_exibicao, meta_phone_number_id")
    .eq("compartilhada", true)
    .eq("status", "conectado")
    .order("criado_em", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!oficial) return null;
  const doOficial = { compartilhada: true, provedor: oficial.provedor ?? null };

  // Já tem linha própria (desconectada): não sobrescreve; usa o número oficial.
  if (propria) {
    logConexao("envio_pela_reserva", { tenantId, motivo: `propria_${propria.status}` });
    return { id: oficial.id, sessao_id: oficial.sessao_id, ...doOficial };
  }

  const { data: criada, error } = await db
    .from("conexoes_whatsapp")
    .insert({
      tenant_id: tenantId,
      provedor: oficial.provedor,
      sessao_id: `cortai_oficial_${tenantId.replace(/-/g, "").slice(0, 12)}`,
      numero: oficial.numero,
      nome_exibicao: oficial.nome_exibicao,
      meta_phone_number_id: oficial.meta_phone_number_id,
      compartilhada: true,
      status: "conectado",
      conectado_em: new Date().toISOString(),
    })
    .select("id, sessao_id")
    .single();
  if (error || !criada) {
    // Corrida com outra execução: relê a linha criada.
    const { data: relida } = await db
      .from("conexoes_whatsapp")
      .select("id, sessao_id, status")
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (relida?.status === "conectado")
      return { id: relida.id, sessao_id: relida.sessao_id, ...doOficial };
    return { id: oficial.id, sessao_id: oficial.sessao_id, ...doOficial };
  }
  return { id: criada.id, sessao_id: criada.sessao_id, ...doOficial };
}

/**
 * Gateway da sessão, com trava de isolamento: um negócio nunca envia pela
 * sessão de outro (exceto o número oficial compartilhado). Lança se a sessão
 * não existe ou pertence a outro negócio.
 */
export async function gatewayDaSessao(sessaoId: string, tenantId: string) {
  const db = await admin();
  const { data } = await db
    .from("conexoes_whatsapp")
    .select("tenant_id, compartilhada, provedor")
    .eq("sessao_id", sessaoId)
    .maybeSingle();
  if (!podeEnviarPelaConexao(data, tenantId)) {
    logConexao("envio_bloqueado_isolamento", { tenantId, sessaoId });
    throw new Error("Sessão de WhatsApp não pertence a este negócio.");
  }
  const { gatewayDoProvedor } = await import("./gateway.server");
  return gatewayDoProvedor(data?.provedor ?? null);
}
