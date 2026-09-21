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
  return telefone.replace(/\D/g, "");
}

export async function conexaoPorSessao(sessaoId: string) {
  const db = await admin();
  const { data } = await db
    .from("conexoes_whatsapp")
    .select("id, tenant_id, sessao_id, status")
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
export function dentroDoHorarioDaIa(config: ConfiguracaoDoAtendimento, agora = new Date()): boolean {
  if (!config.horarioProprio) return true;
  if (!config.horarioDias.includes(agora.getDay())) return false;
  const minutos = agora.getHours() * 60 + agora.getMinutes();
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
  const { data: existente } = await db
    .from("conversas_whatsapp")
    .select("id, status, ia_ativa, modo_humano, cliente_id, contexto")
    .eq("tenant_id", input.tenantId)
    .eq("telefone", telefone)
    .maybeSingle();
  if (existente) return existente;

  const { data: cliente } = await db
    .from("clientes")
    .select("id")
    .eq("tenant_id", input.tenantId)
    .eq("telefone", telefone)
    .is("arquivado_em", null)
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
}) {
  const db = await admin();
  const { gatewayDeWhatsapp } = await import("./gateway.server");
  let externoId: string | null = null;
  let erro: string | null = null;
  try {
    const r = await gatewayDeWhatsapp.enviarMensagem(input.sessaoId, input.telefone, input.texto);
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


/**
 * Memória do cliente em texto: só dados reais desta barbearia. Devolve `null`
 * quando a pessoa ainda não é cliente daqui.
 */
async function perfilDoCliente(tenantId: string, clienteId: string | null): Promise<string | null> {
  if (!clienteId) return null;
  try {
    const { historicoDoCliente } = await import("@/lib/ia/acoes.server");
    const h = await historicoDoCliente({ tenantId, externalAgentId: null }, { clienteId });
    const linhas = [
      `- clienteId: ${h.clienteId}`,
      `- nome: ${h.nome}`,
      `- visitas concluídas: ${h.visitas}`,
      h.ultimaVisita ? `- última visita: ${new Date(h.ultimaVisita).toLocaleString("pt-BR")}` : null,
      h.intervaloMedioDias ? `- costuma voltar a cada ${h.intervaloMedioDias} dias` : null,
      h.servicoPreferido?.nome ? `- serviço mais frequente: ${h.servicoPreferido.nome} (id ${h.servicoPreferido.id})` : null,
      h.profissionalPreferido?.nome
        ? `- profissional mais frequente: ${h.profissionalPreferido.nome} (id ${h.profissionalPreferido.id})`
        : null,
      h.ultimos.length
        ? `- últimos atendimentos: ${h.ultimos
            .map((u) => `${new Date(u.inicio).toLocaleDateString("pt-BR")} ${u.servico ?? "-"} com ${u.profissional ?? "-"}`)
            .join("; ")}`
        : null,
      h.preferencias.length
        ? `- preferências informadas: ${h.preferencias.map((m) => `${m.chave}: ${m.valor}`).join("; ")}`
        : null,
    ].filter(Boolean);
    return linhas.join("\n");
  } catch {
    return null;
  }
}

/** Liga a conversa ao cadastro do cliente quando ele passa a existir. */
async function vincularCliente(tenantId: string, conversaId: string, telefone: string, atual: string | null) {
  if (atual) return atual;
  const db = await admin();
  const { data } = await db
    .from("clientes")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("telefone", telefone)
    .is("arquivado_em", null)
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
}): Promise<{ tratada: boolean; motivo?: string }> {
  const db = await admin();
  const conexao = await conexaoPorSessao(input.sessaoId);
  if (!conexao) return { tratada: false, motivo: "sessao_desconhecida" };

  const tenantId = conexao.tenant_id;
  const telefone = somenteDigitos(input.telefone);
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

  const config = await configuracaoDoTenant(tenantId);
  if (conversa.modo_humano || conversa.status === "humano") return { tratada: true, motivo: "humano" };
  if (!config.atendimentoAutomatico || !conversa.ia_ativa) return { tratada: true, motivo: "automatico_desligado" };
  if (!config.responderWhatsapp) return { tratada: true, motivo: "whatsapp_desligado" };
  if (!dentroDoHorarioDaIa(config)) return { tratada: true, motivo: "fora_do_horario_da_ia" };

  // Proteção contra rajada na mesma conversa (abuso e custo de IA).
  const { limiteDaConversaExcedido } = await import("@/lib/ia/limite.server");
  if (await limiteDaConversaExcedido(conversa.id)) return { tratada: true, motivo: "limite_da_conversa" };

  const { iaConfigurada, responderConversa } = await import("./atendimento.server");
  if (!iaConfigurada()) return { tratada: true, motivo: "ia_indisponivel" };

  const { data: tenant } = await db.from("tenants").select("nome").eq("id", tenantId).maybeSingle();
  const { data: integracao } = await db
    .from("integracoes_de_ia")
    .select("agent_name")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  const { data: historicoBruto } = await db
    .from("mensagens_whatsapp")
    .select("direcao, conteudo, tipo, gerada_por_humano")
    .eq("conversa_id", conversa.id)
    .order("criado_em", { ascending: false })
    .limit(30);

  const anteriores = (historicoBruto ?? []).reverse();
  const historico = anteriores
    .filter((m) => m.conteudo.trim() !== "")
    .map((m) => ({
      autor: (m.direcao === "entrada" ? "cliente" : "atendente") as "cliente" | "atendente",
      texto: m.conteudo,
    }));
  // Contexto após atendimento humano: o CortAI retoma de onde a equipe parou.
  const houveAtendimentoHumano = anteriores.some((m) => m.gerada_por_humano);

  // Áudio: transcrição real quando o serviço entrega a mídia; nunca palpite.
  let textoDoCliente = input.conteudo;
  if (input.tipo !== "text") {
    const { transcreverAudio } = await import("./transcricao.server");
    const transcrito = input.tipo === "audio" || input.tipo === "voice" ? await transcreverAudio(input.midiaUrl) : null;
    if (transcrito) {
      textoDoCliente = transcrito;
      await db
        .from("mensagens_whatsapp")
        .update({ conteudo: transcrito })
        .eq("conversa_id", conversa.id)
        .eq("mensagem_externa_id", input.mensagemExternaId ?? "");
      historico.push({ autor: "cliente", texto: transcrito });
    } else {
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
  }
  const clienteId = await vincularCliente(tenantId, conversa.id, telefone, conversa.cliente_id ?? null);
  const perfil = await perfilDoCliente(tenantId, clienteId);
  const contexto = ((conversa as { contexto?: unknown }).contexto ?? {}) as ContextoDaConversa;

  // Controle de custo: um "oi" na primeira mensagem é respondido pela saudação
  // cadastrada pela barbearia, sem acionar a IA.
  const soSaudacao = /^\s*(oi+|ol[áa]+|bom dia|boa tarde|boa noite|e a[íi]+|opa+)[\s!.,]*$/i.test(textoDoCliente);
  if (soSaudacao && config.saudacaoAtiva && config.mensagemBoasVindas && historico.length <= 1 && !contexto.intencao) {
    await enviarPelaBarbearia({
      tenantId,
      conversaId: conversa.id,
      conexaoId: conexao.id,
      sessaoId: input.sessaoId,
      telefone,
      texto: config.mensagemBoasVindas,
      porIa: true,
    }).catch(() => undefined);
    return { tratada: true, motivo: "saudacao_sem_ia" };
  }

  const { responderConversa: responder } = await import("./atendimento.server");
  let resposta: Awaited<ReturnType<typeof responder>> = null;
  try {
    resposta = await responderConversa({
      ctx: { tenantId, externalAgentId: integracao?.agent_name ?? null },
      conversaId: conversa.id,
      telefone,
      nomeDaBarbearia: tenant?.nome ?? "a barbearia",
      nomeDoAgente: integracao?.agent_name ?? null,
      config,
      historico,
      contexto: { ...contexto, ...(clienteId ? { clienteId } : {}) },
      perfil,
      houveAtendimentoHumano,
    });
  } catch (erro) {
    await db.from("acoes_de_ia_log").insert({
      tenant_id: tenantId,
      conversa_id: conversa.id,
      acao: "responder_conversa",
      sucesso: false,
      erro: erro instanceof Error ? erro.message : "Falha na IA.",
    });
    return { tratada: true, motivo: "falha_na_ia" };
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
