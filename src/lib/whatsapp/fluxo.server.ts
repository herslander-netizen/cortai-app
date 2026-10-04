import { normalizarTelefone, variantesDoTelefone } from "@/lib/telefone";
/**
 * Fluxo de uma mensagem de WhatsApp dentro do Cortaí.
 *
 * mensagem recebida → negócio (pela sessão, nunca pelo corpo) → registro →
 * ação pendente oficial OU orientação curta para o Cortaí.
 *
 * Idempotência: a mesma entrega (mesmo id externo) nunca é processada duas vezes.
 */
import {
  CONFIGURACAO_PADRAO,
  type ConfiguracaoDoAtendimento,
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
  const { data, error } = await db.rpc("recurso_do_tenant_ativo", {
    _tenant_id: tenantId,
    _chave: "cortai_whatsapp",
  });
  if (error) return true;
  return data !== false;
}

/**
 * Número compartilhado: o negócio escolhido fica salvo por telefone
 * (whatsapp_contexto_numero) até o cliente pedir troca. Regras, sem IA.
 * As opções são só os negócios com os quais o telefone tem relação.
 */
async function negocioDoNumeroCompartilhado(
  telefone: string,
  texto: string,
  citadaId: string | null = null,
): Promise<{ tenantId: string } | { semContexto: true; menu?: string }> {
  const db = await admin();
  const { decidirBarbearia, ehPedidoDeTroca } = await import("./multi-barbearia");

  const variantes = variantesDoTelefone(telefone);
  const desde = new Date(Date.now() - 60 * 24 * 3600_000).toISOString();
  const [{ data: comoCliente }, { data: envios }] = await Promise.all([
    db
      .from("clientes")
      .select("tenant_id")
      .in("telefone", variantes)
      .is("arquivado_em", null)
      .limit(50),
    db
      .from("envios_de_whatsapp")
      .select("tenant_id")
      .in("telefone", variantes)
      .gte("criado_em", desde)
      .limit(50),
  ]);
  const relacionados = [
    ...new Set([...(comoCliente ?? []), ...(envios ?? [])].map((r) => r.tenant_id)),
  ];
  const { data: tenants } = relacionados.length
    ? await db.from("tenants").select("id, nome, ativo").in("id", relacionados).order("nome")
    : { data: [] as { id: string; nome: string; ativo: boolean | null }[] };
  const opcoes = (tenants ?? [])
    .filter((t) => t.ativo !== false)
    .map((t) => ({ id: t.id, nome: t.nome }));

  const { data: ctx } = await db
    .from("whatsapp_contexto_numero")
    .select("tenant_id, aguardando_escolha")
    .eq("telefone", telefone)
    .maybeSingle();

  let porNotificacao: string | null = null;
  const idNoBotao = texto.trim().match(/^CORTAI_[A-Z_]+:([0-9a-fA-F-]{36})$/)?.[1];
  if (idNoBotao || citadaId) {
    const q = db
      .from("envios_de_whatsapp")
      .select("tenant_id, telefone, aguarda_resposta, respondido_em, valido_ate");
    const { data } = idNoBotao
      ? await q.eq("id", idNoBotao.toLowerCase()).maybeSingle()
      : await q.eq("mensagem_externa_id", citadaId!).maybeSingle();
    const pendente =
      data &&
      data.aguarda_resposta &&
      !data.respondido_em &&
      data.valido_ate &&
      new Date(data.valido_ate).getTime() > Date.now() &&
      variantesDoTelefone(data.telefone).some((v) => variantesDoTelefone(telefone).includes(v));
    porNotificacao = pendente ? data.tenant_id : null;
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
    // Um só negócio com relação: é ele. Nenhum: orientação genérica.
    if (opcoes.length === 1 && !ehPedidoDeTroca(texto)) {
      await db.from("whatsapp_contexto_numero").upsert({
        telefone,
        tenant_id: opcoes[0]!.id,
        aguardando_escolha: false,
        atualizado_em: agora,
      });
      return { tenantId: opcoes[0]!.id };
    }
    if (opcoes.length < 2) return { semContexto: true };
    await db.from("whatsapp_contexto_numero").upsert({
      telefone,
      tenant_id: ctx?.tenant_id ?? null,
      aguardando_escolha: true,
      atualizado_em: agora,
    });
    return { semContexto: true, menu: d.texto };
  }
  if (d.salvar) {
    const { error } = await db
      .from("whatsapp_contexto_numero")
      .upsert({ telefone, tenant_id: d.tenantId, aguardando_escolha: false, atualizado_em: agora });
    if (error) throw new Error(error.message);
    console.info("[whatsapp/multi] negócio selecionado", {
      telefone: telefone.slice(-4),
      tenant: d.tenantId,
    });
  }
  return { tenantId: d.tenantId };
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
  const [{ data }, { data: tenant }] = await Promise.all([
    db.from("config_atendimento_ia").select("*").eq("tenant_id", tenantId).maybeSingle(),
    db.from("tenants").select("segmento").eq("id", tenantId).maybeSingle(),
  ]);
  const segmento =
    tenant?.segmento === "barbearia" ||
    tenant?.segmento === "salao" ||
    tenant?.segmento === "cabeleireiro" ||
    tenant?.segmento === "esmalteria" ||
    tenant?.segmento === "sobrancelha_cilios" ||
    tenant?.segmento === "estetica"
      ? tenant.segmento
      : "outro";
  if (!data) return { ...CONFIGURACAO_PADRAO, segmento };
  return {
    segmento,
    atendimentoAutomatico: data.atendimento_automatico,
    saudacaoAtiva: data.saudacao_ativa,
    mensagemBoasVindas: data.mensagem_boas_vindas ?? "",
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
    textosConversa:
      data.textos_conversa &&
      typeof data.textos_conversa === "object" &&
      !Array.isArray(data.textos_conversa)
        ? (data.textos_conversa as Record<string, string>)
        : {},
    situacoesDesligadas: (data.situacoes_desligadas as string[] | null) ?? [],
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
  /** Modelo aprovado do catálogo: único formato aceito fora da janela de 24h. */
  modelo?: import("./gateway.server").ModeloComBotoes | null;
  /** Botões de resposta (até 3) para a mensagem interativa dentro da janela. */
  interativo?: { id: string; titulo: string }[] | null;
  /** Lembrete, pós-atendimento, reativação: sujeito à janela de 24h no canal oficial. */
  iniciadaPelaBarbearia?: boolean;
}) {
  const db = await admin();
  const { gatewayDeWhatsapp } = await import("./gateway.server");
  const { decidirFormato } = await import("./modelos");
  const oficial = gatewayDeWhatsapp.capacidades().botoes;

  let janelaAberta = true;
  if (oficial && input.iniciadaPelaBarbearia) {
    const { data: ultima } = await db
      .from("mensagens_whatsapp")
      .select("criado_em")
      .eq("conversa_id", input.conversaId)
      .eq("direcao", "entrada")
      .order("criado_em", { ascending: false })
      .limit(1)
      .maybeSingle();
    const em = (ultima as { criado_em?: string } | null)?.criado_em;
    janelaAberta = Boolean(em && Date.now() - new Date(em).getTime() <= 24 * 3600_000);
  }
  const { formato } = decidirFormato({
    oficial,
    iniciadaPeloNegocio: Boolean(input.iniciadaPelaBarbearia),
    janelaAberta,
    temBotoes: Boolean(input.interativo?.length),
    modeloAprovado: Boolean(input.modelo),
  });
  // Sem modelo aprovado fora da janela: nunca tenta texto livre.
  if (formato === "sem_modelo") {
    throw new Error("Fora da janela de 24h: sem modelo aprovado para este aviso.");
  }

  let externoId: string | null = null;
  let erro: string | null = null;
  try {
    let r: { id: string | null } | null = null;
    if (formato === "modelo" && input.modelo) {
      r = await gatewayDeWhatsapp.enviarTemplate(input.telefone, input.modelo);
    } else if (formato === "interativo" && input.interativo?.length) {
      try {
        r = await gatewayDeWhatsapp.enviarInterativo(input.telefone, {
          texto: input.texto,
          botoes: input.interativo,
        });
      } catch (e) {
        // 131047: a janela fechou entre a leitura e o envio → uma vez como modelo aprovado.
        const msg = e instanceof Error ? e.message : "";
        if (/131047/.test(msg) && input.modelo) {
          r = await gatewayDeWhatsapp.enviarTemplate(input.telefone, input.modelo);
        } else throw e;
      }
    }
    r ??= await gatewayDeWhatsapp.enviarMensagem(input.sessaoId, input.telefone, input.texto);
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

  if (!erro) {
    // Número compartilhado: a resposta do cliente volta para este negócio.
    const { data: cx } = await db
      .from("conexoes_whatsapp")
      .select("compartilhada")
      .eq("id", input.conexaoId)
      .maybeSingle();
    if (cx?.compartilhada) {
      await db.from("whatsapp_contexto_numero").upsert({
        telefone: somenteDigitos(input.telefone),
        tenant_id: input.tenantId,
        aguardando_escolha: false,
        atualizado_em: new Date().toISOString(),
      });
    }
  }

  if (erro) throw new Error(erro);
  return { externoId };
}

/** Liga a conversa ao cadastro do cliente quando ele passa a existir. */
async function vincularCliente(
  tenantId: string,
  conversaId: string,
  telefone: string,
  atual: string | null,
) {
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
  let conexao = await conexaoPorSessao(input.sessaoId);
  if (!conexao) return { tratada: false, motivo: "sessao_desconhecida" };
  // Deduplicação antes de qualquer resposta: mensagem reprocessada nunca responde duas vezes.
  if (input.mensagemExternaId) {
    const { data: jaRecebida } = await db
      .from("mensagens_whatsapp")
      .select("id")
      .eq("mensagem_externa_id", input.mensagemExternaId)
      .eq("direcao", "entrada")
      .limit(1)
      .maybeSingle();
    if (jaRecebida) return { tratada: true, motivo: "duplicada" };
  }

  const telefone = somenteDigitos(input.telefone);
  // Equipe confirmando o próprio WhatsApp ("CODIGO 123456"): antes de qualquer menu.
  if (input.tipo === "text") {
    const { tentarVerificarPorMensagem } = await import("./identidade.server");
    const resposta = await tentarVerificarPorMensagem(telefone, input.conteudo).catch(() => null);
    if (resposta) {
      const { gatewayDeWhatsapp } = await import("./gateway.server");
      await gatewayDeWhatsapp.enviarMensagem(input.sessaoId, telefone, resposta).catch(() => undefined);
      return { tratada: true, motivo: "verificacao_equipe" };
    }
  }
  let tenantId = conexao.tenant_id;
  if ((conexao as { compartilhada?: boolean }).compartilhada) {
    const r = await negocioDoNumeroCompartilhado(
      telefone,
      input.tipo === "text" ? input.conteudo : "",
      input.citadaId ?? null,
    );
    if ("semContexto" in r) {
      const { gatewayDeWhatsapp } = await import("./gateway.server");
      const conversa = await conversaDoTelefone({
        tenantId: conexao.tenant_id,
        conexaoId: conexao.id,
        telefone,
        nomeContato: input.nomeContato ?? null,
      });
      await db.from("mensagens_whatsapp").insert({
        tenant_id: conexao.tenant_id,
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
      await gatewayDeWhatsapp
        .enviarMensagem(
          input.sessaoId,
          telefone,
          r.menu ??
            "Olá! Aqui é o CortAI. Me diga o nome do lugar onde você quer ser atendido e eu continuo por aqui.",
        )
        .catch(() => undefined);
      return { tratada: true, motivo: "sem_contexto_transacional" };
    }
    tenantId = r.tenantId;
    // Uma conversa, um remetente: responde pela conexão do negócio escolhido.
    const { conexaoDeEnvio } = await import("./conexao-envio.server");
    const doNegocio = await conexaoDeEnvio(tenantId);
    if (doNegocio) {
      conexao = {
        ...conexao,
        id: doNegocio.id,
        sessao_id: doNegocio.sessao_id,
        tenant_id: tenantId,
      };
    }
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
          sessaoId: conexao.sessao_id,
          telefone,
          texto: lembrete.texto,
          porIa: false,
        }).catch(() => undefined);
      }
      return { tratada: true, motivo: "acao_contextual" };
    }
  }
  // Secretária CortAI: mesmo cérebro do painel; falha ou falta de crédito cai na orientação fixa abaixo.
  if (input.tipo === "text" && input.conteudo.trim()) {
    const respondida = await responderComCerebro({
      tenantId,
      conversaId: conversa.id,
      conexaoId: conexao.id,
      sessaoId: conexao.sessao_id,
      telefone,
      texto: input.conteudo,
    }).catch((e: unknown) => {
      console.error("[cerebro] whatsapp", e);
      return false;
    });
    if (respondida) return { tratada: true, motivo: "secretaria_cortai" };
  }
  const { data: tenant } = await db.from("tenants").select("slug").eq("id", tenantId).maybeSingle();
  const link = tenant?.slug ? `https://cortai.dev/agendar/${tenant.slug}` : "https://cortai.dev";
  const fallback = `Este número é usado pelo Cortaí para avisos do seu atendimento. Para agendar ou gerenciar seu horário, use o Cortaí: ${link}`;
  const desde = new Date(Date.now() - 24 * 60 * 60_000).toISOString();
  const { data: jaOrientado } = await db
    .from("mensagens_whatsapp")
    .select("id")
    .eq("conversa_id", conversa.id)
    .eq("direcao", "saida")
    .eq("conteudo", fallback)
    .gte("criado_em", desde)
    .limit(1)
    .maybeSingle();
  if (!jaOrientado && (await whatsappLiberadoNoPlano(tenantId))) {
    await enviarPelaBarbearia({
      tenantId,
      conversaId: conversa.id,
      conexaoId: conexao.id,
      sessaoId: conexao.sessao_id,
      telefone,
      texto: fallback,
      porIa: false,
    }).catch(() => undefined);
  }
  return {
    tratada: true,
    motivo: jaOrientado ? "fallback_ja_enviado" : "fallback_informativo_whatsapp",
  };
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
      qr_code: status === "qr_pronto" ? (estado.qrCode ?? null) : null,
      qr_expira_em: status === "qr_pronto" ? (estado.qrExpiraEm ?? null) : null,
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

/**
 * Entrega a mensagem livre ao cérebro CortAI (persona Secretária) e envia a
 * resposta pelo provedor do negócio. Devolve false quando não respondeu
 * (atendimento humano, plano, IA desligada/pausada, limite) para o chamador
 * seguir a orientação fixa — o canal nunca trava.
 */
async function responderComCerebro(input: {
  tenantId: string;
  conversaId: string;
  conexaoId: string;
  sessaoId: string;
  telefone: string;
  texto: string;
}): Promise<boolean> {
  const db = await admin();
  const { iaDisponivel } = await import("@/lib/brain/gateway.server");
  if (!iaDisponivel()) return false;
  const { data: conversa } = await db
    .from("conversas_whatsapp")
    .select("modo_humano, ia_ativa, contexto")
    .eq("id", input.conversaId)
    .maybeSingle();
  // Quem fala: equipe com telefone verificado deste negócio, ou cliente.
  const { identificarEquipe } = await import("./identidade.server");
  const equipe = await identificarEquipe(input.tenantId, input.telefone).catch(() => null);
  if (!conversa || conversa.ia_ativa === false) return false;
  if (!equipe && conversa.modo_humano) return false;
  const config = await configuracaoDoTenant(input.tenantId);
  if (!equipe && !config.responderWhatsapp) return false;
  if (!(await whatsappLiberadoNoPlano(input.tenantId))) return false;
  const { bloqueioDeUso } = await import("@/lib/brain/uso.server");
  if (await bloqueioDeUso(input.tenantId, "whatsapp", input.telefone, !!equipe)) return false;

  const [{ data: tenant }, { data: historico }] = await Promise.all([
    db.from("tenants").select("nome, segmento").eq("id", input.tenantId).maybeSingle(),
    db
      .from("mensagens_whatsapp")
      .select("direcao, conteudo")
      .eq("conversa_id", input.conversaId)
      .order("criado_em", { ascending: false })
      .limit(17),
  ]);
  // A mensagem atual já foi gravada; o restante é o histórico.
  const linhas = (historico ?? []).reverse();
  if (linhas.length && linhas[linhas.length - 1]?.direcao === "entrada") linhas.pop();
  const contexto = (conversa.contexto ?? {}) as Record<string, any>;
  const { pensarCortai } = await import("@/lib/brain/agente.server");
  const r = await pensarCortai({
    ctx: {
      tenantId: input.tenantId,
      canal: "whatsapp",
      ator: input.telefone,
      telefoneCliente: equipe ? null : input.telefone,
      papel: equipe?.papel ?? "cliente",
      profissionalId: equipe?.profissionalId ?? null,
    },
    persona: {
      nome: equipe
        ? `o CortAI${equipe.nome ? `, falando com ${equipe.nome.split(" ")[0]}` : ""}`
        : `a secretária de ${tenant?.nome ?? "o negócio"}`,
      negocio: tenant?.nome ?? "o negócio",
      segmento: tenant?.segmento ?? null,
      tom: config.tom ?? null,
      instrucoesExtras: config.instrucoesExtras || null,
    },
    historico: linhas
      .filter((l) => l.conteudo)
      .map((l) => ({
        autor: l.direcao === "entrada" ? ("usuario" as const) : ("assistente" as const),
        texto: String(l.conteudo),
      })),
    mensagem: input.texto,
    pendente: contexto["cerebro"]?.pendente ?? null,
    conversaId: input.conversaId,
  });
  if (r.indisponivel && !r.acoes.some((a) => a.sucesso)) return false;

  await db
    .from("conversas_whatsapp")
    .update({
      contexto: { ...contexto, cerebro: { pendente: r.pendente } } as never,
      ...(r.pedirHumano && !equipe ? { modo_humano: true } : {}),
    })
    .eq("id", input.conversaId);
  if (r.pedirHumano && !equipe) {
    await db
      .rpc("criar_notificacao", {
        _tenant: input.tenantId,
        _tipo: "whatsapp_humano",
        _titulo: "Cliente pediu atendimento",
        _corpo: `${input.telefone}: "${input.texto.slice(0, 100)}"`,
        _link: "/painel",
      })
      .then(
        () => undefined,
        () => undefined,
      );
  }
  if (!r.texto) return false;
  await enviarPelaBarbearia({
    tenantId: input.tenantId,
    conversaId: input.conversaId,
    conexaoId: input.conexaoId,
    sessaoId: input.sessaoId,
    telefone: input.telefone,
    texto: r.texto,
    porIa: true,
  });
  return true;
}
