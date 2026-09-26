/**
 * Respostas aos lembretes do WhatsApp — regra + banco + botão, sem IA.
 *
 * Fica ANTES do motor determinístico e não altera a lógica dele: quando a
 * mensagem é a resposta a um lembrete (botão da API oficial, número da lista
 * ou palavra exata), a ação é feita aqui. "Remarcar" e "Agendar" são
 * repassados ao motor como frase comum, que já sabe conduzir esses fluxos.
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
  return new Intl.DateTimeFormat("pt-BR", { timeZone: fuso, hour: "2-digit", minute: "2-digit" }).format(
    new Date(iso),
  );
}

function dia(iso: string, fuso: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: fuso, day: "2-digit", month: "2-digit" }).format(
    new Date(iso),
  );
}

export type RespostaDeLembrete = {
  /** Texto a enviar ao cliente (vazio = a própria ação já enviou o aviso). */
  texto: string;
  /** Frase repassada ao motor determinístico (remarcar, agendar). */
  repassar?: string;
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
      texto: "Pronto, você não vai mais receber lembretes de retorno. Se quiser voltar a receber, é só avisar a barbearia.",
    };
  }

  type Envio = { id: string; agendamento_id: string | null; tipo: string; conteudo: string | null; acoes: string[] | null };
  const campos = "id, agendamento_id, tipo, conteudo, acoes";
  const bruto2 = bruto.toUpperCase();
  const agoraIso = new Date().toISOString();
  let envio: Envio | null = null;
  let acao: string | null = null;

  // 1) Botão do canal oficial: "ACAO:<id da notificação>".
  const porPayload = bruto2.match(/^(CORTAI_[A-Z_]+):([0-9A-F-]{36})$/);
  if (porPayload) {
    const { data } = await db.from("envios_de_whatsapp").select(campos).eq("id", porPayload[2]!.toLowerCase())
      .eq("tenant_id", input.tenantId).maybeSingle();
    if (data) { envio = data as Envio; acao = porPayload[1]!; }
  }

  // 2) Resposta citando a notificação: usa o ID da mensagem citada.
  if (!envio && input.citadaId) {
    const { data } = await db.from("envios_de_whatsapp").select(campos).eq("mensagem_externa_id", input.citadaId)
      .eq("tenant_id", input.tenantId).maybeSingle();
    if (data) envio = data as Envio;
  }

  // Escolha pendente ("a qual horário você se refere?").
  const { data: conv } = await db.from("conversas_whatsapp").select("contexto").eq("id", input.conversaId).maybeSingle();
  const ctx = ((conv?.contexto ?? {}) as Record<string, unknown>);
  const escolha = ctx["escolherNotificacao"] as { ids: string[]; acao: string | null } | undefined;
  if (!envio && escolha && /^\d$/.test(t)) {
    const id = escolha.ids[Number(t) - 1];
    if (id) {
      const { data } = await db.from("envios_de_whatsapp").select(campos).eq("id", id).maybeSingle();
      if (data) { envio = data as Envio; acao = escolha.acao; }
    }
  }

  // 3) Notificações abertas dentro do prazo, para este número nesta barbearia.
  let abertas: Envio[] = [];
  if (!envio) {
    const { variantesDoTelefone } = await import("@/lib/telefone");
    const { data } = await db.from("envios_de_whatsapp").select(campos)
      .eq("tenant_id", input.tenantId).in("telefone", variantesDoTelefone(input.telefone))
      .eq("aguarda_resposta", true).is("respondido_em", null).gt("valido_ate", agoraIso)
      .order("enviado_em", { ascending: false });
    abertas = (data ?? []) as Envio[];
    if (!abertas.length) return null; // prazo vencido: volta ao fluxo normal
    if (abertas.length === 1) envio = abertas[0]!;
  }

  // Ação pelo texto: botão sem ID, número da lista ou palavra exata.
  const acoesPossiveis = new Set((envio ? [envio] : abertas).flatMap((e) => e.acoes ?? []));
  if (!acao && acoesPossiveis.has(bruto2)) acao = bruto2;
  if (!acao && envio && /^\d$/.test(t)) {
    const { data: ultima } = await db.from("mensagens_whatsapp").select("conteudo").eq("conversa_id", input.conversaId)
      .eq("direcao", "saida").order("criado_em", { ascending: false }).limit(1).maybeSingle();
    if (ultima?.conteudo && ultima.conteudo === envio.conteudo) acao = envio.acoes?.[Number(t) - 1] ?? null;
  }
  if (!acao) {
    if (["confirmar", "confirmo", "confirmado", "confirma"].includes(t)) acao = "CORTAI_CONFIRMAR";
    else if (/^(cheguei|to aqui|estou aqui|ja cheguei|cheguei aqui)$/.test(t)) acao = "CORTAI_CHEGUEI";
    else if (/^(cancelar|cancela|quero cancelar)$/.test(t)) acao = "CORTAI_CANCELAR";
    if (acao && !acoesPossiveis.has(acao)) acao = null;
  }
  if (!acao) return null;

  // Mais de uma notificação aberta: pergunta, nunca adivinha.
  if (!envio) {
    const fusoP = await fusoDoTenant(input.tenantId);
    const ids = abertas.map((e) => e.agendamento_id).filter(Boolean) as string[];
    const { data: ags } = await db.from("agendamentos").select("id, inicio").in("id", ids);
    const inicioDe = new Map((ags ?? []).map((a) => [a.id, a.inicio as string]));
    await db.from("conversas_whatsapp").update({
      contexto: { ...ctx, escolherNotificacao: { ids: abertas.map((e) => e.id), acao } } as never,
    }).eq("id", input.conversaId);
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
  if (!envio.agendamento_id) return null;

  // Respondida: encerra o estado da notificação e da conversa.
  await db.from("envios_de_whatsapp").update({ respondido_em: agoraIso } as never).eq("id", envio.id);
  const { escolherNotificacao: _e, estado: _s, notificacao: _n, ...resto } = ctx;
  await db.from("conversas_whatsapp").update({ contexto: resto as never }).eq("id", input.conversaId);

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
      const { data } = await db.rpc("confirmar_presenca_whatsapp" as never, { _agendamento_id: ag.id } as never);
      const r = (data ?? {}) as { ok?: boolean };
      await registrar("lembrete_confirmar", Boolean(r.ok));
      if (r.ok) {
        // A equipe fica sabendo na agenda e no WhatsApp; falha aqui não afeta o cliente.
        const { avisarEquipeDaConfirmacao } = await import("./aviso-equipe.server");
        await avisarEquipeDaConfirmacao(ag.id);
      }
      return r.ok
        ? { texto: `Confirmado ✅ Te esperamos ${dia(ag.inicio, fuso)} às ${hora(ag.inicio, fuso)}.` }
        : { texto: "Esse horário não está mais ativo. Quer marcar outro? É só me dizer o dia." };
    }
    case "CORTAI_CHEGUEI": {
      const { data } = await db.rpc("checkin_whatsapp" as never, { _agendamento_id: ag.id } as never);
      const r = (data ?? {}) as { ok?: boolean; motivo?: string };
      await registrar("lembrete_cheguei", Boolean(r.ok), r.ok ? undefined : r.motivo);
      if (r.ok) return { texto: "Check-in feito ✅ Já avisamos que você chegou." };
      if (r.motivo === "cedo") {
        const abre = new Date(new Date(ag.inicio).getTime() - 30 * 60_000).toISOString();
        return { texto: `Ainda está cedo para o check-in. Ele abre às ${hora(abre, fuso)}, 30 minutos antes do seu horário.` };
      }
      if (r.motivo === "tarde") {
        return { texto: "Já passou do horário do check-in pelo WhatsApp. Fale com a recepção quando chegar, por favor." };
      }
      return { texto: "Esse horário não está mais ativo. Quer marcar outro? É só me dizer o dia." };
    }
    case "CORTAI_CANCELAR": {
      const { error } = await db.rpc("cancelar_agendamento", { _agendamento_id: ag.id });
      await registrar("lembrete_cancelar", !error, error?.message);
      if (error) {
        return error.message.includes("encerrado")
          ? { texto: "Esse horário já estava cancelado." }
          : { texto: "Não consegui cancelar por aqui. Vou pedir para alguém da equipe te ajudar." };
      }
      // Libera o horário (já livre no banco), avisa a lista de espera e envia a confirmação.
      const { notificarAgendamento } = await import("./notificacoes.server");
      const aviso = await notificarAgendamento(ag.id, "cancelamento");
      return { texto: aviso.enviado ? "" : "Cancelado ✅ Se quiser remarcar, é só me dizer o dia." };
    }
    case "CORTAI_REMARCAR":
      await registrar("lembrete_remarcar", true);
      return { texto: "", repassar: "quero remarcar" };
    case "CORTAI_AGENDAR":
      await registrar("retorno_agendar", true);
      return { texto: "", repassar: "quero agendar" };
    case "CORTAI_AGORA_NAO":
      await registrar("retorno_agora_nao", true);
      return { texto: "Tudo bem! Quando quiser, é só mandar uma mensagem por aqui." };
    default:
      return null;
  }
}

/**
 * Horário cancelado: avisa o primeiro da lista de espera (encaixe) daquele
 * profissional ou de qualquer um. Um aviso por cancelamento.
 */
export async function avisarListaDeEspera(agendamentoId: string) {
  const db = await admin();
  const { data: ag } = await db
    .from("agendamentos")
    .select("id, tenant_id, inicio, status, profissional_id, profissionais(nome)")
    .eq("id", agendamentoId)
    .maybeSingle();
  if (!ag || ag.status !== "cancelado" || new Date(ag.inicio).getTime() < Date.now()) return;

  const { data: fila } = await db
    .from("fila_de_espera")
    .select("id, cliente_id, profissional_id, clientes(nome, telefone)")
    .eq("tenant_id", ag.tenant_id)
    .not("janela_preferida", "is", null)
    .eq("status", "aguardando")
    .is("avisado_em", null)
    .order("posicao", { ascending: true })
    .order("criado_em", { ascending: true })
    .limit(20);
  const alvo = (fila ?? []).find((f) => !f.profissional_id || f.profissional_id === ag.profissional_id);
  if (!alvo) return;

  // Marca antes de enviar: dois cancelamentos simultâneos não avisam a mesma pessoa.
  const { data: marcado } = await db
    .from("fila_de_espera")
    .update({ avisado_em: new Date().toISOString(), status: "avisado" })
    .eq("id", alvo.id)
    .is("avisado_em", null)
    .select("id")
    .maybeSingle();
  if (!marcado) return;

  const fuso = await fusoDoTenant(ag.tenant_id);
  const profissional = (ag as { profissionais?: { nome?: string } | null }).profissionais?.nome;
  await db.rpc("criar_notificacao", {
    _tenant: ag.tenant_id,
    _tipo: "fila",
    _titulo: "Horário liberado",
    _corpo: `${(alvo as any).clientes?.nome ?? "Cliente"} da lista de espera foi avisado (${hora(ag.inicio, fuso)}).`,
    _link: "/barbeiro/fila",
  });

  const cliente = (alvo as any).clientes as { nome: string; telefone: string | null } | null;
  const telefone = String(cliente?.telefone ?? "").replace(/\D/g, "");
  if (telefone.length < 10) return;
  const { data: conexao } = await db
    .from("conexoes_whatsapp")
    .select("id, sessao_id, status")
    .eq("tenant_id", ag.tenant_id)
    .maybeSingle();
  if (!conexao || conexao.status !== "conectado") return;

  const { conversaDoTelefone, enviarPelaBarbearia } = await import("./fluxo.server");
  const conversa = await conversaDoTelefone({
    tenantId: ag.tenant_id,
    conexaoId: conexao.id,
    telefone,
    nomeContato: cliente?.nome ?? null,
  });
  const nome = (cliente?.nome ?? "").split(/\s+/)[0] || "Olá";
  await enviarPelaBarbearia({
    tenantId: ag.tenant_id,
    conversaId: conversa.id,
    conexaoId: conexao.id,
    sessaoId: conexao.sessao_id,
    telefone,
    texto: [
      `${nome}, abriu um horário! ✂️`,
      `${dia(ag.inicio, fuso)} às ${hora(ag.inicio, fuso)}${profissional ? ` com ${profissional}` : ""}.`,
      "",
      "Quer esse horário? Responda *quero agendar* que eu reservo para você.",
    ].join("\n"),
    porIa: false,
    iniciadaPelaBarbearia: true,
  }).catch(() => undefined);
}

/**
 * Clientes perto da data sugerida de retorno que ainda não marcaram:
 * último atendimento finalizado + intervalo médio (30 dias com pouco histórico),
 * sem nenhum horário depois dele, com consentimento de WhatsApp.
 */
export async function candidatosAoRetorno(agora = new Date()): Promise<string[]> {
  const db = await admin();
  const desde = new Date(agora.getTime() - 200 * 24 * 3600_000).toISOString();
  const { data } = await db
    .from("agendamentos")
    .select("id, cliente_id, inicio, status, clientes!inner(opt_in_whatsapp, arquivado_em)")
    .gte("inicio", desde)
    .not("status", "in", "(cancelado,nao_compareceu,remarcado,falta)")
    .eq("clientes.opt_in_whatsapp", true)
    .is("clientes.arquivado_em", null)
    .order("inicio", { ascending: true })
    .limit(5000);

  const porCliente = new Map<string, { id: string; inicio: number; status: string }[]>();
  for (const a of data ?? []) {
    if (!a.cliente_id) continue;
    const lista = porCliente.get(a.cliente_id) ?? [];
    lista.push({ id: a.id, inicio: new Date(a.inicio).getTime(), status: String(a.status) });
    porCliente.set(a.cliente_id, lista);
  }

  const DIA = 24 * 3600_000;
  const candidatos: string[] = [];
  for (const lista of porCliente.values()) {
    const ultimo = lista[lista.length - 1];
    if (!ultimo || ultimo.status !== "finalizado") continue; // já tem horário marcado depois
    const finalizados = lista.filter((a) => a.status === "finalizado");
    let intervalo = 30 * DIA;
    if (finalizados.length >= 3) {
      const gaps = finalizados.slice(1).map((a, i) => a.inicio - finalizados[i]!.inicio);
      const media = gaps.reduce((s, g) => s + g, 0) / gaps.length;
      intervalo = Math.min(120 * DIA, Math.max(10 * DIA, media));
    }
    const sugerido = ultimo.inicio + intervalo;
    // Janela: 2 dias antes até 5 dias depois da data sugerida.
    if (agora.getTime() >= sugerido - 2 * DIA && agora.getTime() <= sugerido + 5 * DIA) candidatos.push(ultimo.id);
  }
  if (candidatos.length === 0) return [];

  const { data: jaEnviados } = await db
    .from("envios_de_whatsapp")
    .select("agendamento_id")
    .eq("tipo", "retorno")
    .in("agendamento_id", candidatos.slice(0, 500));
  const feitos = new Set((jaEnviados ?? []).map((e) => e.agendamento_id));
  return candidatos.filter((id) => !feitos.has(id)).slice(0, 200);
}
