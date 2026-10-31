/**
 * Alguém do negócio respondeu o cliente pelo celular (mensagem `fromMe` que o Flow não enviou): o bot e a Flow IA
 * ficam em silêncio naquela conversa pelo prazo do negócio (padrão 2 h), para nunca falar por cima da pessoa.
 */
import { configDoBot, ehEnvioDoFlow, JANELA_DO_ENVIO_PROPRIO_MS, prazoDoHumano } from "./decisao";
import { variantesDoTelefone } from "@/lib/telefone";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Tempo para o Flow terminar de gravar o próprio envio antes de concluir que foi uma pessoa. */
const ESPERA_DO_PROPRIO_ENVIO_MS = 2500;

export async function registrarRespostaDoNegocio(input: {
  sessaoId: string;
  telefone: string;
  mensagemExternaId: string | null;
  texto: string;
  esperar?: (ms: number) => Promise<void>;
}): Promise<"pessoa" | "flow" | "sem_conversa"> {
  const db = await admin();
  const { conexaoPorSessao } = await import("@/lib/whatsapp/fluxo.server");
  const conexao = await conexaoPorSessao(input.sessaoId);
  if (!conexao?.tenant_id) return "sem_conversa";
  const { data: conversa } = await db
    .from("conversas_whatsapp")
    .select("id")
    .eq("tenant_id", conexao.tenant_id)
    .in("telefone", variantesDoTelefone(input.telefone))
    .limit(1)
    .maybeSingle();
  if (!conversa) return "sem_conversa";

  const recentes = async () => {
    const { data } = await db
      .from("mensagens_whatsapp")
      .select("mensagem_externa_id, conteudo")
      .eq("conversa_id", conversa.id)
      .eq("direcao", "saida")
      .gte("criado_em", new Date(Date.now() - JANELA_DO_ENVIO_PROPRIO_MS).toISOString())
      .order("criado_em", { ascending: false })
      .limit(20);
    return data ?? [];
  };
  const mensagem = { id: input.mensagemExternaId, texto: input.texto };
  if (ehEnvioDoFlow(mensagem, await recentes())) return "flow";
  // A Evolution pode avisar antes de o Flow gravar o que acabou de enviar: confere de novo depois de um instante.
  await (input.esperar ?? ((ms) => new Promise((ok) => setTimeout(ok, ms))))(
    ESPERA_DO_PROPRIO_ENVIO_MS,
  );
  if (ehEnvioDoFlow(mensagem, await recentes())) return "flow";

  const { data: linha } = await db
    .from("flow_bot_config")
    .select("modo, horario, pausa_humano_min, versao_publicada")
    .eq("tenant_id", conexao.tenant_id)
    .maybeSingle();
  const pausa = configDoBot(linha as Record<string, unknown> | null)?.pausaHumanoMin ?? 120;
  await db
    .from("conversas_whatsapp")
    .update({ modo_humano_ate: prazoDoHumano(Date.now(), pausa) })
    .eq("id", conversa.id);
  return "pessoa";
}
