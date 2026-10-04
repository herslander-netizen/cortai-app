/**
 * Respostas aos lembretes do WhatsApp — regra + banco + botão, sem IA.
 *
 * Fica ANTES do motor determinístico e não altera a lógica dele: quando a
 * mensagem é a resposta a um lembrete (botão da API oficial, número da lista
 * ou palavra exata), a ação é feita aqui. Remarcação e novo agendamento
 * continuam na própria conversa com o CortAI (o link oficial fica como opção).
 */
import { fusoDoTenant } from "@/lib/fuso.server";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function normalizar(t: string) {
  return t
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hora(iso: string, fuso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: fuso,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function dia(iso: string, fuso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: fuso,
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(iso));
}

export type RespostaDeLembrete = {
  /** Texto a enviar ao cliente (vazio = a própria ação já enviou o aviso). */
  texto: string;
};

const SAIR = new Set(["sair", "parar", "cortai_sair", "descadastrar", "nao quero mais receber"]);

/** Identifica e executa a resposta a um lembrete. `null` = não é resposta a lembrete. */
export async function tratarRespostaDeLembrete(input: {
  tenantId: string;
  conversaId: string;
  telefone: string;
  texto: string;
  /** ID externo da mensagem citada pelo cliente, quando houver. */
  citadaId?: string | null;
}): Promise<RespostaDeLembrete | null> {
  const db = await admin();
  const bruto = input.texto.trim();
  const t = normalizar(bruto);
  if (!t) return null;

  // Pedido de saída vale sempre, com ou sem lembrete recente.
  if (SAIR.has(t)) {
    await db
      .from("clientes")
      .update({ opt_in_whatsapp: false })
      .eq("tenant_id", input.tenantId)
      .eq("telefone", input.telefone);
    return {
      texto:
        "Pronto, você não receberá mais lembretes de relacionamento. Avisos essenciais dos seus horários continuarão sendo enviados.",
    };
  }

  type Envio = {
    id: string;
    agendamento_id: string | null;
    tipo: string;
    telefone: string;
    conteudo: string | null;
    acoes: string[] | null;
  };
  const campos = "id, agendamento_id, tipo, telefone, conteudo, acoes";
  const bruto2 = bruto.toUpperCase();
  const agoraIso = new Date().toISOString();
  let envio: Envio | null = null;
  let acao: string | null = null;

  // 1) Botão do canal oficial (modelo ou interativo): "ACAO:<id do envio>".
  const { lerToque, estadoDoToque, TEXTO_BOTAO_VENCIDO } = await import("./modelos");
  const toque = lerToque(bruto);
  if (toque) {
    const { data } = await db
      .from("envios_de_whatsapp")
      .select(`${campos}, valido_ate, respondido_em, oferta_id`)
      .eq("id", toque.envioId)
      .eq("tenant_id", input.tenantId)
      .maybeSingle();
    const comEstado = data as
      | (Envio & {
          valido_ate: string | null;
          respondido_em: string | null;
          oferta_id: string | null;
        })
      | null;
    if (comEstado && telefoneCorresponde(comEstado.telefone, input.telefone)) {
      const estado = estadoDoToque(comEstado, toque.acao);
      if (estado === "vencido") {
        return { texto: `${TEXTO_BOTAO_VENCIDO} ${await linkDoCortai(input.tenantId)}` };
      }
      if (estado === "repetido") return { texto: "Já registramos sua resposta. Obrigado!" };
      if (estado === "ok") {
        if (toque.acao === "CORTAI_QUERO" || toque.acao === "CORTAI_NAO_POSSO") {
          return responderOferta(comEstado.id, comEstado.oferta_id, toque.acao, input.tenantId);
        }
        envio = comEstado;
        acao = toque.acao;
      }
    }
  }

  // 2) Resposta citando a notificação: usa o ID da mensagem citada.
  if (!envio && input.citadaId) {
    const { data } = await db
      .from("envios_de_whatsapp")
      .select(campos)
      .eq("mensagem_externa_id", input.citadaId)
      .eq("tenant_id", input.tenantId)
      .maybeSingle();
    if (data && telefoneCorresponde(data.telefone, input.telefone)) envio = data as Envio;
  }

  // Escolha pendente ("a qual horário você se refere?").
  const { data: conv } = await db
    .from("conversas_whatsapp")
    .select("contexto")
    .eq("id", input.conversaId)
    .maybeSingle();
  const ctx = (conv?.contexto ?? {}) as Record<string, unknown>;
  const escolha = ctx["escolherNotificacao"] as
    { ids: string[]; acao: string | null; validoAte?: string } | undefined;
  const escolhaValida =
    escolha && (!escolha.validoAte || escolha.validoAte > agoraIso) ? escolha : undefined;
  if (!envio && escolhaValida && /^\d$/.test(t)) {
    const id = escolhaValida.ids[Number(t) - 1];
    if (id) {
      const { data } = await db
        .from("envios_de_whatsapp")
        .select(campos)
        .eq("id", id)
        .eq("tenant_id", input.tenantId)
        .eq("aguarda_resposta", true)
        .is("respondido_em", null)
        .gt("valido_ate", agoraIso)
        .maybeSingle();
      if (
        data &&
        telefoneCorresponde(data.telefone, input.telefone) &&
        escolhaValida.acao &&
        data.acoes?.includes(escolhaValida.acao)
      ) {
        envio = data as Envio;
        acao = escolhaValida.acao;
      }
    }
  }

  // 3) Notificações abertas dentro do prazo, para este número nesta barbearia.
  let abertas: Envio[] = [];
  if (!envio) {
    const { variantesDoTelefone } = await import("@/lib/telefone");
    const { data } = await db
      .from("envios_de_whatsapp")
      .select(campos)
      .eq("tenant_id", input.tenantId)
      .in("telefone", variantesDoTelefone(input.telefone))
      .eq("aguarda_resposta", true)
      .is("respondido_em", null)
      .gt("valido_ate", agoraIso)
      .order("enviado_em", { ascending: false });
    abertas = (data ?? []) as Envio[];
    if (!abertas.length) return null; // prazo vencido: volta ao fluxo normal
    if (abertas.length === 1) envio = abertas[0] ?? null;
  }

  // Ação pelo texto: botão sem ID, número da lista ou palavra exata.
  const acoesPossiveis = new Set((envio ? [envio] : abertas).flatMap((e) => e.acoes ?? []));
  if (!acao && acoesPossiveis.has(bruto2)) acao = bruto2;
  if (!acao && envio && /^\d$/.test(t)) {
    const { data: ultima } = await db
      .from("mensagens_whatsapp")
      .select("conteudo")
      .eq("conversa_id", input.conversaId)
      .eq("direcao", "saida")
      .order("criado_em", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (ultima?.conteudo && ultima.conteudo === envio.conteudo)
      acao = envio.acoes?.[Number(t) - 1] ?? null;
  }
  if (!acao) {
    if (["confirmar", "confirmo", "confirmado", "confirma"].includes(t)) acao = "CORTAI_CONFIRMAR";
    else if (/^(cheguei|to aqui|estou aqui|ja cheguei|cheguei aqui)$/.test(t))
      acao = "CORTAI_CHEGUEI";
    else if (/^(cancelar|cancela|quero cancelar)$/.test(t)) acao = "CORTAI_CANCELAR";
    else if (/^(quero|quero sim|sim quero)$/.test(t)) acao = "CORTAI_QUERO";
    else if (/^(nao posso|nao da|nao quero)$/.test(t)) acao = "CORTAI_NAO_POSSO";
    if (acao && !acoesPossiveis.has(acao)) acao = null;
  }
  if (!acao) return null;

  // Mais de uma notificação aberta: pergunta, nunca adivinha.
  if (!envio) {
    const fusoP = await fusoDoTenant(input.tenantId);
    const ids = abertas.map((e) => e.agendamento_id).filter(Boolean) as string[];
    const { data: ags } = await db.from("agendamentos").select("id, inicio").in("id", ids);
    const inicioDe = new Map((ags ?? []).map((a) => [a.id, a.inicio as string]));
    await db
      .from("conversas_whatsapp")
      .update({
        contexto: {
          ...ctx,
          escolherNotificacao: {
            ids: abertas.map((e) => e.id),
            acao,
            validoAte: new Date(Date.now() + 15 * 60_000).toISOString(),
          },
        } as never,
      })
      .eq("id", input.conversaId);
    return {
      texto: [
        "Você tem mais de um horário. A qual deles se refere?",
        ...abertas.map((e, i) => {
          const ini = e.agendamento_id ? inicioDe.get(e.agendamento_id) : null;
          return `${i + 1} - ${ini ? `${dia(ini, fusoP)} às ${hora(ini, fusoP)}` : "Retorno"}`;
        }),
        "",
        "Responda com o número.",
      ].join("\n"),
    };
  }
  if (acao === "CORTAI_QUERO" || acao === "CORTAI_NAO_POSSO") {
    const { data: comOferta } = await db
      .from("envios_de_whatsapp")
      .select("oferta_id")
      .eq("id", envio.id)
      .maybeSingle();
    return responderOferta(
      envio.id,
      (comOferta as { oferta_id?: string | null } | null)?.oferta_id ?? null,
      acao,
      input.tenantId,
    );
  }
  if (!envio.agendamento_id) return null;

  // Respondida: encerra o estado da notificação e da conversa.
  const RESPOSTA: Record<string, string> = {
    CORTAI_CONFIRMAR: "confirmado",
    CORTAI_CHEGUEI: "cheguei",
    CORTAI_CANCELAR: "cancelado",
    CORTAI_REMARCAR: "remarcar",
    CORTAI_AGENDAR: "agendar",
    CORTAI_ABRIR: "abrir_cortai",
    CORTAI_AGORA_NAO: "agora_nao",
  };
  const { data: respondido } = await db
    .from("envios_de_whatsapp")
    .update({ respondido_em: agoraIso, resposta: RESPOSTA[acao] ?? acao.toLowerCase() } as never)
    .eq("id", envio.id)
    .eq("tenant_id", input.tenantId)
    .is("respondido_em", null)
    .gt("valido_ate", agoraIso)
    .select("id")
    .maybeSingle();
  if (!respondido)
    return {
      texto: "Essa ação não está mais disponível. Abra o Cortaí para ver seu horário atualizado.",
    };
  const { escolherNotificacao: _e, estado: _s, notificacao: _n, ...resto } = ctx;
  await db
    .from("conversas_whatsapp")
    .update({ contexto: resto as never })
    .eq("id", input.conversaId);

  const agendamentoId = envio.agendamento_id;
  const { data: ag } = await db
    .from("agendamentos")
    .select("id, inicio, status, tenant_id")
    .eq("id", agendamentoId)
    .eq("tenant_id", input.tenantId)
    .maybeSingle();
  if (!ag) return null;
  const fuso = await fusoDoTenant(input.tenantId);

  const registrar = (nome: string, sucesso: boolean, erro?: string) =>
    db.from("acoes_de_ia_log").insert({
      tenant_id: input.tenantId,
      conversa_id: input.conversaId,
      acao: nome,
      intencao: "lembrete",
      sucesso,
      erro: erro ?? null,
    });

  switch (acao) {
    case "CORTAI_CONFIRMAR": {
      const { data } = await db.rpc(
        "confirmar_presenca_whatsapp" as never,
        { _agendamento_id: ag.id } as never,
      );
      const r = (data ?? {}) as { ok?: boolean };
      await registrar("lembrete_confirmar", Boolean(r.ok));
      if (r.ok) {
        // A equipe fica sabendo na agenda e no WhatsApp; falha aqui não afeta o cliente.
        const { avisarEquipeDaConfirmacao } = await import("./aviso-equipe.server");
        await avisarEquipeDaConfirmacao(ag.id);
      }
      return r.ok
        ? {
            texto: `Confirmado ✅ Te esperamos ${dia(ag.inicio, fuso)} às ${hora(ag.inicio, fuso)}.`,
          }
        : { texto: "Esse horário não está mais ativo. Abra o Cortaí para ver seus horários." };
    }
    case "CORTAI_CHEGUEI": {
      const { data } = await db.rpc(
        "checkin_whatsapp" as never,
        { _agendamento_id: ag.id } as never,
      );
      const r = (data ?? {}) as { ok?: boolean; motivo?: string };
      await registrar("lembrete_cheguei", Boolean(r.ok), r.ok ? undefined : r.motivo);
      if (r.ok) return { texto: "Check-in feito ✅ Já avisamos que você chegou." };
      if (r.motivo === "cedo") {
        const abre = new Date(new Date(ag.inicio).getTime() - 30 * 60_000).toISOString();
        return {
          texto: `Ainda está cedo para o check-in. Ele abre às ${hora(abre, fuso)}, 30 minutos antes do seu horário.`,
        };
      }
      if (r.motivo === "tarde") {
        return {
          texto:
            "Já passou do horário do check-in pelo WhatsApp. Fale com a recepção quando chegar, por favor.",
        };
      }
      return { texto: "Esse horário não está mais ativo. Abra o Cortaí para ver seus horários." };
    }
    case "CORTAI_CANCELAR": {
      const { error } = await db.rpc("cancelar_agendamento", { _agendamento_id: ag.id });
      await registrar("lembrete_cancelar", !error, error?.message);
      if (error) {
        return error.message.includes("encerrado")
          ? { texto: "Esse horário já estava cancelado." }
          : {
              texto:
                "Não consegui cancelar agora. Me escreva aqui o que precisa que eu verifico com você.",
            };
      }
      // Libera o horário (já livre no banco), avisa a lista de espera e envia a confirmação.
      const { notificarAgendamento } = await import("./notificacoes.server");
      const aviso = await notificarAgendamento(ag.id, "cancelamento");
      return {
        texto: aviso.enviado
          ? ""
          : "Cancelado ✅ Quando quiser voltar, é só me chamar aqui.",
      };
    }
    case "CORTAI_REMARCAR": {
      await registrar("lembrete_remarcar", true);
      const link = await linkDoCortai(input.tenantId);
      return {
        texto: `Claro! Para qual dia e horário você quer remarcar? Me diga aqui que eu vejo os horários livres.\nSe preferir, escolha pelo link: ${link}`,
      };
    }
    case "CORTAI_AGENDAR": {
      await registrar("retorno_agendar", true);
      const link = await linkDoCortai(input.tenantId);
      return {
        texto: `Ótimo! Qual serviço e qual dia você prefere? Me conte aqui que eu vejo os horários livres.\nSe preferir, escolha pelo link: ${link}`,
      };
    }
    case "CORTAI_ABRIR": {
      await registrar("abrir_cortai", true);
      const link = await linkDoCortai(input.tenantId);
      return { texto: `Abra o Cortaí para continuar: ${link}` };
    }
    case "CORTAI_AGORA_NAO":
      await registrar("retorno_agora_nao", true);
      return { texto: "Tudo bem. Os avisos essenciais dos seus horários continuam ativos." };
    default:
      return null;
  }
}

function telefoneCorresponde(a: string, b: string) {
  const normalizar = (valor: string) => valor.replace(/\D/g, "");
  const variantes = (valor: string) => {
    const n = normalizar(valor);
    const comDdi = n.length === 10 || n.length === 11 ? `55${n}` : n;
    const itens = new Set([comDdi, comDdi.startsWith("55") ? comDdi.slice(2) : comDdi]);
    const ddd = comDdi.startsWith("55") ? comDdi.slice(2, 4) : comDdi.slice(0, 2);
    const numero = comDdi.startsWith("55") ? comDdi.slice(4) : comDdi.slice(2);
    if (numero.length === 9 && numero.startsWith("9")) itens.add(`55${ddd}${numero.slice(1)}`);
    if (numero.length === 8 && /^[6-9]/.test(numero)) itens.add(`55${ddd}9${numero}`);
    return itens;
  };
  const vb = variantes(b);
  return [...variantes(a)].some((v) => vb.has(v) || vb.has(v.startsWith("55") ? v.slice(2) : v));
}

async function linkDoCortai(tenantId: string) {
  const db = await admin();
  const { data } = await db.from("tenants").select("slug").eq("id", tenantId).maybeSingle();
  return data?.slug ? `https://cortai.dev/agendar/${data.slug}` : "https://cortai.dev";
}

/** Quero / Não posso da vaga da lista de espera. Reserva atômica: toque duplo não repete. */
export async function responderOferta(
  envioId: string,
  ofertaId: string | null,
  acao: string,
  tenantId: string,
): Promise<RespostaDeLembrete> {
  const db = await admin();
  const agoraIso = new Date().toISOString();
  const { data: reservado } = await db
    .from("envios_de_whatsapp")
    .update({
      respondido_em: agoraIso,
      resposta: acao === "CORTAI_QUERO" ? "quero" : "nao_posso",
    } as never)
    .eq("id", envioId)
    .is("respondido_em", null)
    .select("id")
    .maybeSingle();
  if (!reservado) return { texto: "Já registramos sua resposta. Obrigado!" };
  const { data: oferta } = ofertaId
    ? await db
        .from("ofertas_da_fila")
        .select("token, inicio, profissionais(nome)")
        .eq("id", ofertaId)
        .eq("tenant_id", tenantId)
        .maybeSingle()
    : { data: null };
  if (!oferta) return { texto: "Essa vaga não está mais disponível." };
  const { aceitarOferta, recusarOferta } = await import("./fila-ofertas.server");
  if (acao === "CORTAI_NAO_POSSO") {
    await recusarOferta(oferta.token);
    return { texto: "Tudo bem, você continua na lista." };
  }
  const r = await aceitarOferta(oferta.token);
  if (!r.ok) {
    return {
      texto: `Essa vaga não está mais disponível. Quer marcar outro horário? ${await linkDoCortai(tenantId)}`,
    };
  }
  // A confirmação do agendamento já avisou o cliente: nada de mensagem dupla.
  if (r.confirmacaoEnviada) return { texto: "" };
  const fuso = await fusoDoTenant(tenantId);
  const { textoDaVagaMarcada } = await import("./modelos");
  return {
    texto: textoDaVagaMarcada(
      oferta.inicio,
      fuso,
      (oferta.profissionais as { nome?: string } | null)?.nome ?? null,
    ),
  };
}

/**
 * Horário cancelado: oferece a vaga ao primeiro cliente compatível da lista
 * de espera (serviço, duração, profissional, dia e período). Ver fila-ofertas.
 */
export async function avisarListaDeEspera(agendamentoId: string) {
  const { ofertarVaga } = await import("./fila-ofertas.server");
  await ofertarVaga(agendamentoId);
}

/**
 * Clientes perto da data sugerida de retorno que ainda não marcaram:
 * último atendimento finalizado + intervalo médio (30 dias com pouco histórico),
 * sem nenhum horário depois dele, com consentimento de WhatsApp.
 */
export type AtendimentoParaRetorno = {
  id: string;
  inicio: number;
  status: string;
  retornoDias: number | null;
};

const DIA_MS = 24 * 3600_000;

/**
 * Prazo de retorno: o do último serviço concluído (retorno_dias); sem prazo
 * no serviço, o prazo geral de hoje (30 dias ou a média do cliente).
 */
export function prazoDeRetornoMs(finalizados: AtendimentoParaRetorno[]): number {
  const ultimo = finalizados[finalizados.length - 1];
  if (ultimo?.retornoDias) return ultimo.retornoDias * DIA_MS;
  if (finalizados.length >= 3) {
    const gaps = finalizados.slice(1).map((a, i) => a.inicio - finalizados[i]!.inicio);
    const media = gaps.reduce((s, g) => s + g, 0) / gaps.length;
    return Math.min(120 * DIA_MS, Math.max(10 * DIA_MS, media));
  }
  return 30 * DIA_MS;
}

/** Regra pura: último atendimento finalizado, sem horário depois, dentro da janela do prazo. */
export function selecionarCandidatosAoRetorno(
  porCliente: Iterable<AtendimentoParaRetorno[]>,
  agora: number,
  jaAvisados: Set<string> = new Set(),
): string[] {
  const candidatos: string[] = [];
  for (const lista of porCliente) {
    const ordenada = [...lista].sort((a, b) => a.inicio - b.inicio);
    const ultimo = ordenada[ordenada.length - 1];
    if (!ultimo || ultimo.status !== "finalizado") continue; // já tem horário marcado depois
    if (jaAvisados.has(ultimo.id)) continue; // um aviso por atendimento
    const sugerido =
      ultimo.inicio + prazoDeRetornoMs(ordenada.filter((a) => a.status === "finalizado"));
    // Janela: 2 dias antes até 5 dias depois da data sugerida.
    if (agora >= sugerido - 2 * DIA_MS && agora <= sugerido + 5 * DIA_MS)
      candidatos.push(ultimo.id);
  }
  return candidatos;
}

export async function candidatosAoRetorno(agora = new Date()): Promise<string[]> {
  const db = await admin();
  const desde = new Date(agora.getTime() - 400 * DIA_MS).toISOString();
  const { data } = await db
    .from("agendamentos")
    .select(
      "id, cliente_id, inicio, status, servicos(retorno_dias), clientes!inner(opt_in_whatsapp, arquivado_em)",
    )
    .gte("inicio", desde)
    .not("status", "in", "(cancelado,nao_compareceu,remarcado,falta)")
    .eq("clientes.opt_in_whatsapp", true)
    .is("clientes.arquivado_em", null)
    .order("inicio", { ascending: true })
    .limit(5000);

  const porCliente = new Map<string, AtendimentoParaRetorno[]>();
  for (const a of data ?? []) {
    if (!a.cliente_id) continue;
    const lista = porCliente.get(a.cliente_id) ?? [];
    const retornoDias =
      (a as { servicos?: { retorno_dias: number | null } | null }).servicos?.retorno_dias ?? null;
    lista.push({
      id: a.id,
      inicio: new Date(a.inicio).getTime(),
      status: String(a.status),
      retornoDias,
    });
    porCliente.set(a.cliente_id, lista);
  }

  const candidatos = selecionarCandidatosAoRetorno(porCliente.values(), agora.getTime());
  if (candidatos.length === 0) return [];

  const { data: jaEnviados } = await db
    .from("envios_de_whatsapp")
    .select("agendamento_id")
    .eq("tipo", "retorno")
    .in("agendamento_id", candidatos.slice(0, 500));
  const feitos = new Set((jaEnviados ?? []).map((e) => e.agendamento_id));
  return candidatos.filter((id) => !feitos.has(id)).slice(0, 200);
}
