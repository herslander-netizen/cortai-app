import { fusoDoTenant } from "@/lib/fuso.server";
import { normalizarTelefone, variantesDoTelefone } from "@/lib/telefone";
/**
 * Fluxo de uma mensagem de WhatsApp dentro do Cortaí.
 *
 * mensagem recebida → barbearia (pela sessão, nunca pelo corpo) → conversa →
 * registro → CortAI → ação controlada → resposta → envio → registro.
 *
 * Idempotência: a mesma entrega (mesmo id externo) nunca é processada duas vezes.
 */
import {
  CONFIGURACAO_PADRAO,
  type ConfiguracaoDoAtendimento,
  type ContextoDaConversa,
  type TomDoAtendimento,
} from "./contrato";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function somenteDigitos(telefone: string) {
  return normalizarTelefone(telefone);
}

/** WhatsApp automático só a partir do Pro. Na dúvida, não bloqueia. */
async function whatsappLiberadoNoPlano(tenantId: string): Promise<boolean> {
  const db = await admin();
  const { data, error } = await db.rpc("recurso_do_tenant_ativo", { _tenant_id: tenantId, _chave: "cortai_whatsapp" });
  if (error) return true;
  return data !== false;
}

/**
 * Número compartilhado: a barbearia escolhida fica salva por telefone
 * (whatsapp_contexto_numero) até o cliente pedir troca. Regras, sem IA.
 */
async function barbeariaDoNumeroCompartilhado(
  telefone: string,
  texto: string,
  citadaId: string | null = null,
): Promise<{ tenantId: string; escolheuAgora: boolean } | { perguntar: string }> {
  const db = await admin();
  const { decidirBarbearia } = await import("./multi-barbearia");

  // Opções: barbearias ativas que compartilham o número oficial.
  const { data: conexoes } = await db.from("conexoes_whatsapp").select("tenant_id").eq("compartilhada", true);
  const idsCompartilhados = [...new Set((conexoes ?? []).map((c) => c.tenant_id))];
  const { data: tenants } = idsCompartilhados.length
    ? await db.from("tenants").select("id, nome, ativo").in("id", idsCompartilhados).order("nome")
    : { data: [] as { id: string; nome: string; ativo: boolean | null }[] };
  const opcoes = (tenants ?? []).filter((t) => t.ativo !== false).map((t) => ({ id: t.id, nome: t.nome }));

  const { data: ctx } = await db
    .from("whatsapp_contexto_numero")
    .select("tenant_id, aguardando_escolha")
    .eq("telefone", telefone)
    .maybeSingle();

  let porNotificacao: string | null = null;
  const idNoBotao = texto.trim().match(/^CORTAI_[A-Z_]+:([0-9a-fA-F-]{36})$/)?.[1];
  if (idNoBotao || citadaId) {
    const q = db.from("envios_de_whatsapp").select("tenant_id");
    const { data } = idNoBotao
      ? await q.eq("id", idNoBotao.toLowerCase()).maybeSingle()
      : await q.eq("mensagem_externa_id", citadaId!).maybeSingle();
    porNotificacao = data?.tenant_id ?? null;
  }
  let porSlug: string | null = null;
  const tokens = (texto.toLowerCase().match(/[a-z0-9][a-z0-9-]{2,}/g) ?? []).slice(0, 40);
  if (tokens.length && !ctx?.tenant_id) {
    const { data } = await db.from("tenants").select("id").in("slug", tokens).limit(1);
    porSlug = data?.[0]?.id ?? null;
  }

  const d = decidirBarbearia({
    texto,
    opcoes,
    contexto: ctx ? { tenantId: ctx.tenant_id, aguardandoEscolha: ctx.aguardando_escolha } : null,
    porNotificacao,
    porSlug,
  });
  const agora = new Date().toISOString();
  if (d.tipo === "menu") {
    await db
      .from("whatsapp_contexto_numero")
      .upsert({ telefone, tenant_id: null, aguardando_escolha: true, atualizado_em: agora });
    if (d.evento === "troca") {
      console.info("[whatsapp/multi] troca de barbearia", { telefone: telefone.slice(-4), anterior: ctx?.tenant_id ?? null });
    }
    return { perguntar: d.texto };
  }
  if (d.salvar) {
    const { error } = await db
      .from("whatsapp_contexto_numero")
      .upsert({ telefone, tenant_id: d.tenantId, aguardando_escolha: false, atualizado_em: agora });
    if (error) throw new Error(error.message);
    console.info("[whatsapp/multi] barbearia selecionada", { telefone: telefone.slice(-4), tenant: d.tenantId });
  }
  return { tenantId: d.tenantId, escolheuAgora: d.salvar && !porNotificacao && Boolean(ctx?.aguardando_escolha || /^\d{1,2}$/.test(texto.trim())) };
}

export async function conexaoPorSessao(sessaoId: string) {
  const db = await admin();
  const { data } = await db
    .from("conexoes_whatsapp")
    .select("id, tenant_id, sessao_id, status, compartilhada")
    .eq("sessao_id", sessaoId)
    .maybeSingle();
  return data ?? null;
}

export async function configuracaoDoTenant(tenantId: string): Promise<ConfiguracaoDoAtendimento> {
  const db = await admin();
  const { data } = await db.from("config_atendimento_ia").select("*").eq("tenant_id", tenantId).maybeSingle();
  if (!data) return CONFIGURACAO_PADRAO;
  return {
    atendimentoAutomatico: data.atendimento_automatico,
    saudacaoAtiva: data.saudacao_ativa,
    mensagemBoasVindas: data.mensagem_boas_vindas,
    mensagemForaDoHorario: data.mensagem_fora_do_horario,
    permiteConfirmar: data.permite_confirmar,
    permiteCancelar: data.permite_cancelar,
    permiteRemarcar: data.permite_remarcar,
    encaminhamentoHumano: data.encaminhamento_humano,
    lembretes: data.lembretes,
    tom: data.tom as TomDoAtendimento,
    recuperacaoAtiva: data.recuperacao_ativa ?? false,
    recuperacaoDias: data.recuperacao_dias ?? 30,
    responderWhatsapp: data.responder_whatsapp ?? true,
    instrucoesExtras: data.instrucoes_extras ?? "",
    horarioProprio: data.horario_proprio ?? false,
    horarioDias: (data.horario_dias as number[] | null) ?? [1, 2, 3, 4, 5, 6],
    horarioInicio: String(data.horario_inicio ?? "09:00:00").slice(0, 5),
    horarioFim: String(data.horario_fim ?? "19:00:00").slice(0, 5),
    confirmacaoAutomatica: data.confirmacao_automatica ?? true,
    pagamentoAntecipado: data.pagamento_antecipado ?? false,
    linkPagamento: data.link_pagamento ?? "",
  };
}

/** A IA só atende dentro do horário próprio, quando a barbearia define um. */
export function dentroDoHorarioDaIa(
  config: ConfiguracaoDoAtendimento,
  fuso: string,
  agora = new Date(),
): boolean {
  if (!config.horarioProprio) return true;
  // Relógio da barbearia, nunca o do servidor.
  const p = new Intl.DateTimeFormat("en-US", {
    timeZone: fuso,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(agora);
  const v = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  const semana = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(v("weekday"));
  if (!config.horarioDias.includes(semana)) return false;
  const minutos = Number(v("hour")) * 60 + Number(v("minute"));
  const paraMinutos = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));
  return minutos >= paraMinutos(config.horarioInicio) && minutos <= paraMinutos(config.horarioFim);
}

export async function conversaDoTelefone(input: {
  tenantId: string;
  conexaoId: string;
  telefone: string;
  nomeContato: string | null;
}) {
  const db = await admin();
  const telefone = somenteDigitos(input.telefone);
  const variantes = variantesDoTelefone(telefone);
  const { data: existente } = await db
    .from("conversas_whatsapp")
    .select("id, status, ia_ativa, modo_humano, cliente_id, contexto")
    .eq("tenant_id", input.tenantId)
    .in("telefone", variantes)
    .limit(1)
    .maybeSingle();
  if (existente) return existente;

  const { data: cliente } = await db
    .from("clientes")
    .select("id")
    .eq("tenant_id", input.tenantId)
    .in("telefone", variantes)
    .is("arquivado_em", null)
    .limit(1)
    .maybeSingle();

  const { data, error } = await db
    .from("conversas_whatsapp")
    .insert({
      tenant_id: input.tenantId,
      conexao_id: input.conexaoId,
      telefone,
      nome_contato: input.nomeContato,
      cliente_id: cliente?.id ?? null,
    })
    .select("id, status, ia_ativa, modo_humano, cliente_id, contexto")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

/** Envia uma mensagem pelo WhatsApp da barbearia e registra o envio. */
export async function enviarPelaBarbearia(input: {
  tenantId: string;
  conversaId: string;
  conexaoId: string;
  sessaoId: string;
  telefone: string;
  texto: string;
  porIa: boolean;
  autorUserId?: string | null;
  /** Modelo com botões (API oficial). Se o canal não suportar, vai o texto. */
  modelo?: import("./gateway.server").ModeloComBotoes | null;
  /** Lembrete, pós-atendimento, reativação: sujeito à janela de 24h no canal oficial. */
  iniciadaPelaBarbearia?: boolean;
}) {
  const db = await admin();
  const { gatewayDeWhatsapp } = await import("./gateway.server");

  // Fora da janela de 24h, o canal oficial só aceita template aprovado.
  if (input.iniciadaPelaBarbearia && gatewayDeWhatsapp.capacidades().exigeTemplateForaDaJanela && !input.modelo) {
    const { data: ultima } = await db
      .from("mensagens_whatsapp")
      .select("criado_em")
      .eq("conversa_id", input.conversaId)
      .eq("direcao", "entrada")
      .order("criado_em", { ascending: false })
      .limit(1)
      .maybeSingle();
    const em = (ultima as { criado_em?: string } | null)?.criado_em;
    if (!em || Date.now() - new Date(em).getTime() > 24 * 3600_000) {
      throw new Error("Fora da janela de 24h: só sai por template aprovado.");
    }
  }

  let externoId: string | null = null;
  let erro: string | null = null;
  try {
    const viaModelo = input.modelo
      ? await gatewayDeWhatsapp.enviarTemplate(input.telefone, input.modelo)
      : null;
    const r = viaModelo ?? (await gatewayDeWhatsapp.enviarMensagem(input.sessaoId, input.telefone, input.texto));
    externoId = r.id;
  } catch (e) {
    erro = e instanceof Error ? e.message : "Falha ao enviar.";
  }

  await db.from("mensagens_whatsapp").insert({
    tenant_id: input.tenantId,
    conversa_id: input.conversaId,
    conexao_id: input.conexaoId,
    mensagem_externa_id: externoId,
    direcao: "saida",
    telefone_destinatario: input.telefone,
    tipo: "text",
    conteudo: input.texto,
    gerada_por_ia: input.porIa,
    gerada_por_humano: !input.porIa,
    autor_user_id: input.autorUserId ?? null,
    status: erro ? "falhou" : "enviada",
    erro,
  });

  await db
    .from("conversas_whatsapp")
    .update({ ultima_mensagem_em: new Date().toISOString() })
    .eq("id", input.conversaId);

  if (erro) throw new Error(erro);
  return { externoId };
}



/** Liga a conversa ao cadastro do cliente quando ele passa a existir. */
async function vincularCliente(tenantId: string, conversaId: string, telefone: string, atual: string | null) {
  if (atual) return atual;
  const db = await admin();
  const { data } = await db
    .from("clientes")
    .select("id")
    .eq("tenant_id", tenantId)
    .in("telefone", variantesDoTelefone(telefone))
    .is("arquivado_em", null)
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  await db.from("conversas_whatsapp").update({ cliente_id: data.id }).eq("id", conversaId);
  return data.id;
}

/** Trata uma mensagem recebida do gateway. */
export async function processarMensagemRecebida(input: {
  sessaoId: string;
  mensagemExternaId: string | null;
  telefone: string;
  nomeContato?: string | null;
  tipo: string;
  conteudo: string;
  midiaUrl?: string | null;
  /** ID externo da mensagem citada (resposta a uma notificação). */
  citadaId?: string | null;
}): Promise<{ tratada: boolean; motivo?: string }> {
  const db = await admin();
  const conexao = await conexaoPorSessao(input.sessaoId);
  if (!conexao) return { tratada: false, motivo: "sessao_desconhecida" };

  const telefone = somenteDigitos(input.telefone);
  let tenantId = conexao.tenant_id;
  if ((conexao as { compartilhada?: boolean }).compartilhada) {
    const r = await barbeariaDoNumeroCompartilhado(telefone, input.tipo === "text" ? input.conteudo : "", input.citadaId ?? null);
    if ("perguntar" in r) {
      const { gatewayDeWhatsapp } = await import("./gateway.server");
      await gatewayDeWhatsapp.enviarMensagem(input.sessaoId, telefone, r.perguntar).catch(() => undefined);
      return { tratada: true, motivo: "identificando_barbearia" };
    }
    tenantId = r.tenantId;
    // A escolha "1"/"2" não segue ao motor como texto: vira uma saudação na barbearia escolhida.
    if (r.escolheuAgora) input = { ...input, conteudo: "oi" };
  }
  const conversa = await conversaDoTelefone({
    tenantId,
    conexaoId: conexao.id,
    telefone,
    nomeContato: input.nomeContato ?? null,
  });

  const { error: erroInsercao } = await db.from("mensagens_whatsapp").insert({
    tenant_id: tenantId,
    conversa_id: conversa.id,
    conexao_id: conexao.id,
    mensagem_externa_id: input.mensagemExternaId,
    direcao: "entrada",
    telefone_remetente: telefone,
    tipo: input.tipo,
    conteudo: input.conteudo,
    midia_url: input.midiaUrl ?? null,
    status: "recebida",
  });
  // 23505 = entrega repetida; nada é reprocessado.
  if (erroInsercao) {
    if (erroInsercao.code === "23505") return { tratada: true, motivo: "duplicada" };
    throw new Error(erroInsercao.message);
  }

  const { data: linhaAtual } = await db
    .from("conversas_whatsapp")
    .select("nao_lidas")
    .eq("id", conversa.id)
    .maybeSingle();
  await db
    .from("conversas_whatsapp")
    .update({
      ultima_mensagem_em: new Date().toISOString(),
      nao_lidas: (linhaAtual?.nao_lidas ?? 0) + 1,
      ...(input.nomeContato ? { nome_contato: input.nomeContato } : {}),
    })
    .eq("id", conversa.id);

  // Resposta a lembrete (botão, número ou palavra exata): regra + banco, sem motor.
  let conteudo = input.conteudo;
  if (input.tipo === "text") {
    const { tratarRespostaDeLembrete } = await import("./lembretes.server");
    const lembrete = await tratarRespostaDeLembrete({
      tenantId,
      conversaId: conversa.id,
      telefone,
      texto: input.conteudo,
      citadaId: input.citadaId ?? null,
    }).catch(() => null);
    if (lembrete) {
      if (lembrete.texto) {
        await enviarPelaBarbearia({
          tenantId,
          conversaId: conversa.id,
          conexaoId: conexao.id,
          sessaoId: input.sessaoId,
          telefone,
          texto: lembrete.texto,
          porIa: false,
        }).catch(() => undefined);
      }
      if (!lembrete.repassar) return { tratada: true, motivo: "lembrete" };
      conteudo = lembrete.repassar;
    }
  }

  const config = await configuracaoDoTenant(tenantId);
  if (conversa.modo_humano || conversa.status === "humano") return { tratada: true, motivo: "humano" };
  if (!config.atendimentoAutomatico || !conversa.ia_ativa) return { tratada: true, motivo: "automatico_desligado" };
  if (!config.responderWhatsapp) return { tratada: true, motivo: "whatsapp_desligado" };
  if (!(await whatsappLiberadoNoPlano(tenantId))) return { tratada: true, motivo: "plano_sem_whatsapp" };
  if (!dentroDoHorarioDaIa(config, await fusoDoTenant(tenantId))) return { tratada: true, motivo: "fora_do_horario_da_ia" };

  // Proteção contra rajada na mesma conversa (abuso e custo de IA).
  const { limiteDaConversaExcedido } = await import("@/lib/ia/limite.server");
  if (await limiteDaConversaExcedido(conversa.id)) return { tratada: true, motivo: "limite_da_conversa" };

  const { data: tenant } = await db.from("tenants").select("nome").eq("id", tenantId).maybeSingle();


  // Mídia (áudio, imagem, figurinha): resposta padrão, sem transcrição e sem
  // qualquer custo de IA. O motor só conversa por texto.
  if (input.tipo !== "text") {
    const aviso =
      "Recebi sua mensagem, mas por aqui eu só consigo ler texto. Pode me escrever o que precisa? Se preferir, chamo alguém da equipe.";
    await enviarPelaBarbearia({
      tenantId,
      conversaId: conversa.id,
      conexaoId: conexao.id,
      sessaoId: input.sessaoId,
      telefone,
      texto: aviso,
      porIa: true,
    }).catch(() => undefined);
    return { tratada: true, motivo: "midia_nao_suportada" };
  }

  const clienteId = await vincularCliente(tenantId, conversa.id, telefone, conversa.cliente_id ?? null);
  const contexto = ((conversa as { contexto?: unknown }).contexto ?? {}) as ContextoDaConversa;

  // Rajada de mensagens curtas vira uma única frase para o motor.
  const { textoAgrupado } = await import("./motor/agrupador.server");
  const textoDoCliente = await textoAgrupado({ conversaId: conversa.id, textoAtual: conteudo });

  // Motor determinístico: nenhum provedor de IA é chamado — custo zero.
  const { responderComMotor } = await import("./motor/motor.server");
  let resposta: Awaited<ReturnType<typeof responderComMotor>> | null = null;
  try {
    resposta = await responderComMotor({
      tenantId,
      conversaId: conversa.id,
      telefone,
      nomeContato: input.nomeContato ?? null,
      clienteId,
      nomeDaBarbearia: tenant?.nome ?? "a barbearia",
      config,
      contexto: { ...contexto, ...(clienteId ? { clienteId } : {}) },
      texto: textoDoCliente,
    });
  } catch (erro) {
    await db.from("acoes_de_ia_log").insert({
      tenant_id: tenantId,
      conversa_id: conversa.id,
      acao: "motor_conversa",
      sucesso: false,
      erro: erro instanceof Error ? erro.message : "Falha no motor de atendimento.",
    });
    return { tratada: true, motivo: "falha_no_motor" };
  }

  if (!resposta) return { tratada: true, motivo: "sem_resposta" };

  await enviarPelaBarbearia({
    tenantId,
    conversaId: conversa.id,
    conexaoId: conexao.id,
    sessaoId: input.sessaoId,
    telefone,
    texto: resposta.texto,
    porIa: true,
  }).catch(() => undefined);

  // Memória curta da conversa e intenção identificada ficam guardadas.
  await db
    .from("conversas_whatsapp")
    .update({
      contexto: { ...resposta.contexto, ...(clienteId ? { clienteId } : {}) } as never,
      ...(resposta.intencao ? { intencao: resposta.intencao } : {}),
    })
    .eq("id", conversa.id);

  if (resposta.pedirHumano && config.encaminhamentoHumano) {
    await db
      .from("conversas_whatsapp")
      .update({ status: "humano", modo_humano: true, ia_ativa: false })
      .eq("id", conversa.id);
    await db.from("acoes_de_ia_log").insert({
      tenant_id: tenantId,
      conversa_id: conversa.id,
      acao: "encaminhar_para_humano",
      intencao: "atendimento_humano",
      sucesso: true,
    });
  }

  return { tratada: true };
}

/** Atualiza o estado da conexão a partir de um aviso do gateway. */
export async function atualizarEstadoDaConexao(
  sessaoId: string,
  estado: {
    status: string;
    qrCode?: string | null;
    qrExpiraEm?: string | null;
    numero?: string | null;
    nomeExibicao?: string | null;
    erro?: string | null;
  },
) {
  const db = await admin();
  const { normalizarStatus } = await import("./gateway.server");
  const conexao = await conexaoPorSessao(sessaoId);
  if (!conexao) return false;
  const status = normalizarStatus(estado.status);
  await db
    .from("conexoes_whatsapp")
    .update({
      status,
      qr_code: status === "qr_pronto" ? estado.qrCode ?? null : null,
      qr_expira_em: status === "qr_pronto" ? estado.qrExpiraEm ?? null : null,
      ...(estado.numero ? { numero: estado.numero } : {}),
      ...(estado.nomeExibicao ? { nome_exibicao: estado.nomeExibicao } : {}),
      ultimo_erro: estado.erro ?? null,
      visto_em: new Date().toISOString(),
      ...(status === "conectado" ? { conectado_em: new Date().toISOString() } : {}),
      ...(status === "desconectado" ? { desconectado_em: new Date().toISOString() } : {}),
    })
    .eq("id", conexao.id);

  await db.from("auditoria_da_barbearia").insert({
    tenant_id: conexao.tenant_id,
    ator_user_id: null,
    acao: `whatsapp.${status}`,
    alvo: sessaoId,
    detalhes: { numero: estado.numero ?? null },
  });
  return true;
}
