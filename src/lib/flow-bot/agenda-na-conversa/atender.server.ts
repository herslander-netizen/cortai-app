/**
 * Agendamento na conversa dentro do Flow Bot ligado: roda antes das regras do bot e da Flow IA. Devolve `null` quando
 * a mensagem não é de agendar/remarcar/cancelar/consultar horário (ou o cliente saiu do fluxo): quem vem depois segue.
 *
 * Um emissor por mensagem (fluxo cooperativo, 04/11): quando este passo responde, nem o bot nem a Flow IA falam, e
 * a ação pendente da Flow IA é descartada para um "sim" antigo nunca executar outra coisa.
 */
import { conduzir, estadoValido } from "./conduzir";
import { TEXTOS } from "./textos";
import { FLUXO_DA_AGENDA, MOTIVO_DEVOLVIDA, MOTIVO_EM_EXECUCAO, etapaPodeGravar } from "./trava";

export type EntradaDaAgenda = {
  tenantId: string;
  conversaId: string;
  conexaoId: string;
  sessaoId: string;
  telefone: string;
  texto: string;
  mensagemExternaId: string | null;
  /** O texto veio de um áudio transcrito. */
  viaAudio?: boolean;
  conversa: Record<string, unknown> | null;
  agora: number;
};

export async function atenderAgendaNaConversa(e: EntradaDaAgenda): Promise<boolean | null> {
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const contexto = ((e.conversa?.["contexto"] ?? {}) as Record<string, unknown>) || {};
  const agora = new Date(e.agora);
  const anterior = estadoValido(contexto["agenda"], agora);

  // Webhooks podem repetir o MESMO "SIM". Conferir o rastro antes de conduzir:
  // conduzir pode criar/cancelar/remarcar no banco, portanto a deduplicação após ele seria tarde.
  // Esta leitura só poupa trabalho na repetição tardia; quem decide a corrida é a trava abaixo.
  if (e.mensagemExternaId) {
    const { data: jaProcessado, error: erroConsultaRastro } = await db
      .from("flow_bot_rastro")
      .select("fluxo_ref, enviado")
      .eq("tenant_id", e.tenantId)
      .eq("conversa_id", e.conversaId)
      .eq("mensagem_externa_id", e.mensagemExternaId)
      .maybeSingle();
    if (erroConsultaRastro) {
      console.error("[agenda-na-conversa] não verificou idempotência", erroConsultaRastro.message);
      return true; // Falha fechada: não executar outra reserva quando não sabemos se já foi executada.
    }
    if (jaProcessado?.fluxo_ref === FLUXO_DA_AGENDA) {
      if (!jaProcessado.enviado) {
        console.warn("[agenda-na-conversa] mensagem repetida com resposta pendente; exige recuperação de entrega");
      }
      return true;
    }
  }

  // Trava atômica: nas etapas em que a resposta pode gravar, a linha do rastro nasce ANTES da ação.
  // Duas entregas simultâneas da mesma mensagem disputam o índice único e só uma segue.
  let travaId: string | null = null;
  if (e.mensagemExternaId && etapaPodeGravar(anterior?.etapa)) {
    const { data: trava, error: erroTrava } = await db
      .from("flow_bot_rastro")
      .insert({
        tenant_id: e.tenantId,
        conversa_id: e.conversaId,
        mensagem_externa_id: e.mensagemExternaId,
        modo: "ligado",
        fluxo_ref: FLUXO_DA_AGENDA,
        motivo: MOTIVO_EM_EXECUCAO,
        passos: [],
        respostas: [],
        realidade_ausente: [],
        enviado: false,
      })
      .select("id")
      .single();
    if (erroTrava?.code === "23505") return true; // Outra entrega desta mensagem já está cuidando dela.
    if (erroTrava || !trava) {
      console.error("[agenda-na-conversa] não reservou a mensagem", erroTrava?.message);
      return true; // Falha fechada: sem trava, não arriscar gravar duas vezes.
    }
    travaId = trava.id as string;
  }
  const atualizarTrava = async (campos: Record<string, unknown>) => {
    if (!travaId) return;
    const { error } = await db
      .from("flow_bot_rastro")
      .update(campos as never)
      .eq("id", travaId)
      .eq("tenant_id", e.tenantId);
    if (error) console.error("[agenda-na-conversa] não atualizou a trava", error.message);
  };

  const { registrarOcorrencia } = await import("@/lib/whatsapp/aprendizado.server");
  const ocorrencia = (motivo: "fora_da_etapa" | "erro", detalhe: string) =>
    registrarOcorrencia({
      tenantId: e.tenantId,
      conversaId: e.conversaId,
      mensagemExternaId: e.mensagemExternaId,
      motivo,
      origem: "bot",
      texto: e.texto,
      etapa: anterior?.etapa ?? null,
      detalhe,
    });

  const { portasDoNegocio } = await import("./portas.server");
  let r: Awaited<ReturnType<typeof conduzir>>;
  try {
    const portas = await portasDoNegocio({
      tenantId: e.tenantId,
      telefone: e.telefone,
      agora,
    });
    r = await conduzir(e.texto, anterior, { ...portas, viaAudio: e.viaAudio === true });
  } catch (erro) {
    if (!travaId) throw erro;
    // Caiu com a mensagem reservada: não se sabe se gravou. Ninguém responde por cima (nem o menu,
    // nem a IA) e a equipe vê a ocorrência; repetir a ação às cegas poderia duplicar.
    console.error(
      "[agenda-na-conversa] falha com a mensagem reservada",
      erro instanceof Error ? erro.message : erro,
    );
    await ocorrencia("erro", "Falha durante a ação do agendamento; conferir se foi gravada.").catch(
      () => undefined,
    );
    return true;
  }

  const gravarEstado = (agenda: unknown, limparCerebro: boolean) =>
    db
      .from("conversas_whatsapp")
      .update({
        contexto: {
          ...contexto,
          agenda,
          ...(limparCerebro ? { cerebro: { pendente: null } } : {}),
        } as never,
      })
      .eq("id", e.conversaId)
      .eq("tenant_id", e.tenantId)
      .select("id");

  if (!r) {
    // Nada foi gravado: libera a linha para o bot registrar a decisão dele sobre esta mensagem.
    await atualizarTrava({ motivo: MOTIVO_DEVOLVIDA });
    return null;
  }
  if (!r.textos.length) {
    await atualizarTrava({ motivo: MOTIVO_DEVOLVIDA });
    // Saiu do fluxo (pediu pessoa, ou não deu para entender duas vezes): limpa e devolve a conversa.
    if (anterior) {
      await gravarEstado(null, false);
      await ocorrencia("fora_da_etapa", "Conversa devolvida no meio do agendamento.");
    }
    return null;
  }
  // Aprendizado: o Bot precisou repetir que não entendeu, ou não conseguiu gravar.
  if (r.textos.includes(TEXTOS.falhaGravar)) await ocorrencia("erro", "Não conseguiu gravar.");
  else if (
    anterior &&
    r.textos.some((t) =>
      [TEXTOS.naoEntendiHorario, TEXTOS.naoEntendiOpcao, TEXTOS.nomeInvalido].includes(
        t as (typeof TEXTOS)["naoEntendiOpcao"],
      ),
    )
  )
    await ocorrencia("fora_da_etapa", "O Bot não entendeu a resposta nesta etapa.");

  const motivoDoRastro = `agenda:${anterior?.etapa ?? "inicio"}->${r.estado?.etapa ?? "fim"}`;
  let rastro: { id: string } | null = null;
  if (travaId) {
    // A linha já existe (trava): só recebe o resultado.
    await atualizarTrava({ motivo: motivoDoRastro, respostas: r.textos });
    rastro = { id: travaId };
  } else {
    const { data, error: erroRastro } = await db
      .from("flow_bot_rastro")
      .insert({
        tenant_id: e.tenantId,
        conversa_id: e.conversaId,
        mensagem_externa_id: e.mensagemExternaId,
        modo: "ligado",
        fluxo_ref: FLUXO_DA_AGENDA,
        motivo: motivoDoRastro,
        passos: [],
        respostas: r.textos,
        realidade_ausente: [],
        enviado: false,
      })
      .select("id")
      .single();
    // Mesma mensagem entregue de novo: já foi respondida.
    if (erroRastro?.code === "23505") return true;
    if (erroRastro) console.error("[agenda-na-conversa] rastro", erroRastro.message);
    rastro = data ? { id: data.id as string } : null;
  }

  const { data: estadoGravado, error: erroEstado } = await gravarEstado(r.estado, true);
  if (erroEstado || !estadoGravado?.length) {
    // A conversa não pode avançar sem salvar a pergunta/etapa que o cliente responderá em seguida.
    // Nunca devolver este turno ao menu antigo ou à IA: geraria duas respostas incoerentes.
    console.error(
      "[agenda-na-conversa] não persistiu etapa",
      erroEstado?.message ?? "conversa não encontrada",
    );
    await ocorrencia("erro", "Não foi possível guardar a etapa do agendamento.");
    return true;
  }

  const { enviarPelaBarbearia } = await import("@/lib/whatsapp/fluxo.server");
  const { humanoNoControle } = await import("../decisao");
  let enviou = 0;
  for (const texto of r.textos) {
    try {
      const { data: posse, error: erroPosse } = await db
        .from("conversas_whatsapp")
        .select("modo_humano, modo_humano_ate")
        .eq("id", e.conversaId)
        .eq("tenant_id", e.tenantId)
        .maybeSingle();
      if (erroPosse || !posse || humanoNoControle(posse, Date.now())) {
        console.info("[agenda-na-conversa] envio suspenso por posse humana ou leitura indisponível");
        break;
      }
      await enviarPelaBarbearia({
        tenantId: e.tenantId,
        conversaId: e.conversaId,
        conexaoId: e.conexaoId,
        sessaoId: e.sessaoId,
        telefone: e.telefone,
        texto,
        porIa: false,
      });
      enviou++;
    } catch (erro) {
      console.error("[agenda-na-conversa] envio", erro instanceof Error ? erro.message : erro);
      break;
    }
  }
  if (rastro && enviou === r.textos.length) {
    const { error: erroMarcarEnviado } = await db
      .from("flow_bot_rastro")
      .update({ enviado: true })
      .eq("id", rastro.id);
    if (erroMarcarEnviado)
      console.error("[agenda-na-conversa] não marcou entrega no rastro", erroMarcarEnviado.message);
  } else if (enviou !== r.textos.length) {
    // Registrar como pendente sem recriar reserva nem liberar fallback. A equipe pode auditar
    // o rastro de saída; recuperação automática requer idempotência do provedor.
    await ocorrencia("erro", "Resposta da agenda pendente de entrega após execução.").catch(() => undefined);
  }
  // Uma vez que a agenda assumiu o turno, nenhuma outra automação deve responder por cima.
  // Falha parcial/total de envio é registrada no rastro, mas não aciona o menu legado nem a IA.
  return true;
}
