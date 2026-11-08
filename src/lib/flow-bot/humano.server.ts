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

/** A Evolution pode devolver o eco antes do Flow persistir o envio. */
const ESPERA_DO_PROPRIO_ENVIO_MS = 2500;

export async function registrarRespostaDoNegocio(input: {
  sessaoId: string;
  telefone: string;
  mensagemExternaId: string | null;
  texto: string;
  esperar?: (ms: number) => Promise<void>;
}): Promise<"pessoa" | "flow" | "sem_conversa"> {
  const db = await admin();
  const { conexaoPorSessao, conversaDoTelefone } = await import("@/lib/whatsapp/fluxo.server");
  const conexao = await conexaoPorSessao(input.sessaoId);
  if (!conexao?.tenant_id) return "sem_conversa";

  const buscarConversa = async () => {
    const { data, error } = await db
      .from("conversas_whatsapp")
      .select("id")
      .eq("tenant_id", conexao.tenant_id)
      .in("telefone", variantesDoTelefone(input.telefone))
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  };
  const esperar = input.esperar ?? ((ms: number) => new Promise<void>((ok) => setTimeout(ok, ms)));

  let conversa = await buscarConversa();
  let jaEsperou = false;
  if (!conversa) {
    // A conversa pode estar sendo criada por um envio do Flow em outra requisição.
    await esperar(ESPERA_DO_PROPRIO_ENVIO_MS);
    jaEsperou = true;
    conversa = await buscarConversa();
  }
  // Se a primeira mensagem do negócio foi digitada no celular, ela também precisa assumir o atendimento.
  conversa ??= await conversaDoTelefone({
    tenantId: conexao.tenant_id,
    conexaoId: conexao.id,
    telefone: input.telefone,
    nomeContato: null,
  });

  const recentes = async () => {
    const { data, error } = await db
      .from("mensagens_whatsapp")
      .select("mensagem_externa_id, conteudo")
      .eq("conversa_id", conversa.id)
      .eq("direcao", "saida")
      .gte("criado_em", new Date(Date.now() - JANELA_DO_ENVIO_PROPRIO_MS).toISOString())
      .order("criado_em", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);
    return data ?? [];
  };
  const mensagem = { id: input.mensagemExternaId, texto: input.texto };
  if (ehEnvioDoFlow(mensagem, await recentes())) return "flow";
  if (!jaEsperou) {
    // Não chamar de humana uma resposta do Flow cujo registro ainda está sendo persistido.
    await esperar(ESPERA_DO_PROPRIO_ENVIO_MS);
    if (ehEnvioDoFlow(mensagem, await recentes())) return "flow";
  }

  const { data: linha, error: erroConfig } = await db
    .from("flow_bot_config")
    .select("modo, horario, pausa_humano_min, versao_publicada")
    .eq("tenant_id", conexao.tenant_id)
    .maybeSingle();
  // Na ausência de configuração (Flow Bot desligado), a Flow IA ainda deve respeitar a pausa de 2h.
  if (erroConfig && erroConfig.code !== "42P01") throw new Error(erroConfig.message);
  const pausa = configDoBot(linha as Record<string, unknown> | null)?.pausaHumanoMin ?? 120;
  const agora = Date.now();
  const { error: erroPausa } = await db
    .from("conversas_whatsapp")
    .update({
      modo_humano_ate: prazoDoHumano(agora, pausa),
      ultima_mensagem_em: new Date(agora).toISOString(),
    })
    .eq("id", conversa.id)
    .eq("tenant_id", conexao.tenant_id);
  if (erroPausa) throw new Error(erroPausa.message);

  // A resposta humana precisa aparecer no histórico para o próximo turno da IA entender o contexto.
  // O mesmo ID de webhook nunca gera duas mensagens; não confundir com envio automático do Flow.
  const { error: erroMensagem } = await db.from("mensagens_whatsapp").insert({
    tenant_id: conexao.tenant_id,
    conversa_id: conversa.id,
    conexao_id: conexao.id,
    mensagem_externa_id: input.mensagemExternaId,
    direcao: "saida",
    telefone_destinatario: input.telefone,
    tipo: input.texto.trim() ? "text" : "unknown",
    conteudo: input.texto,
    gerada_por_ia: false,
    gerada_por_humano: true,
    status: "enviada",
  });
  if (erroMensagem && erroMensagem.code !== "23505") throw new Error(erroMensagem.message);
  return "pessoa";
}
