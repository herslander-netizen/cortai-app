/**
 * Proteção contra abuso e custo desnecessário de IA.
 *
 * Sem tabela nova: a contagem usa os registros que o próprio sistema já grava
 * (`acoes_de_ia_log` para a API do CortAI e `mensagens_whatsapp` para a
 * conversa). Tudo é contado por barbearia e por conversa/telefone, em janela
 * de tempo curta, sempre no servidor.
 */

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function desde(janelaSegundos: number) {
  return new Date(Date.now() - janelaSegundos * 1000).toISOString();
}

/** Chamadas da API do CortAI por barbearia. */
export async function limiteDaApiExcedido(
  tenantId: string,
  limite = 60,
  janelaSegundos = 60,
): Promise<boolean> {
  try {
    const db = await admin();
    const { count } = await db
      .from("acoes_de_ia_log")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .gte("criado_em", desde(janelaSegundos));
    return (count ?? 0) >= limite;
  } catch {
    return false;
  }
}

/** Mensagens recebidas na mesma conversa — evita responder a rajadas/scripts. */
export async function limiteDaConversaExcedido(
  conversaId: string,
  limite = 12,
  janelaSegundos = 60,
): Promise<boolean> {
  try {
    const db = await admin();
    const { count } = await db
      .from("mensagens_whatsapp")
      .select("id", { count: "exact", head: true })
      .eq("conversa_id", conversaId)
      .eq("direcao", "entrada")
      .gte("criado_em", desde(janelaSegundos));
    return (count ?? 0) > limite;
  } catch {
    return false;
  }
}

/** Registro de observabilidade (nunca guarda segredos). */
export async function registrarChamadaDaApi(entrada: {
  tenantId: string;
  acao: string;
  sucesso: boolean;
  duracaoMs: number;
  erro?: string | null;
}) {
  try {
    const db = await admin();
    await db.from("acoes_de_ia_log").insert({
      tenant_id: entrada.tenantId,
      acao: `api.${entrada.acao}`,
      sucesso: entrada.sucesso,
      erro: entrada.erro ?? null,
      resultado: { duracao_ms: entrada.duracaoMs } as never,
    });
  } catch {
    /* observabilidade nunca derruba a chamada */
  }
}
