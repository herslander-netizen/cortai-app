/**
 * Agrupador de mensagens: quem escreve em rajada ("oi", "quero cortar",
 * "amanhã") recebe UMA resposta, não três.
 *
 * Sem temporizador (o servidor é serverless): ao processar uma mensagem, o
 * motor junta as mensagens de entrada dos últimos segundos que ainda não foram
 * respondidas. A mensagem mais recente manda no fluxo.
 */

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

const JANELA_SEGUNDOS = 8;

/** Texto consolidado das mensagens recentes ainda sem resposta. */
export async function textoAgrupado(input: {
  conversaId: string;
  textoAtual: string;
}): Promise<string> {
  try {
    const db = await admin();
    const desde = new Date(Date.now() - JANELA_SEGUNDOS * 1000).toISOString();
    const { data } = await db
      .from("mensagens_whatsapp")
      .select("direcao, conteudo, criado_em")
      .eq("conversa_id", input.conversaId)
      .gte("criado_em", desde)
      .order("criado_em", { ascending: true })
      .limit(10);

    const linhas = data ?? [];
    // Se a barbearia (ou o CortAI) já respondeu dentro da janela, não agrupa.
    if (linhas.some((m) => m.direcao === "saida")) return input.textoAtual;

    const textos = linhas
      .filter((m) => m.direcao === "entrada" && String(m.conteudo ?? "").trim() !== "")
      .map((m) => String(m.conteudo).trim());

    if (textos.length <= 1) return input.textoAtual;
    return textos.join(". ").slice(0, 600);
  } catch {
    return input.textoAtual;
  }
}
