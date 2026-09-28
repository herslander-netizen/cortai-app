/**
 * WhatsApp operacional do Cortaí — mensagens transacionais, sem nenhuma IA.
 *
 * Tudo aqui é determinístico: evento do Cortaí → regra → template → envio pela
 * MESMA infraestrutura de WhatsApp já existente (`conexoes_whatsapp`,
 * `conversas_whatsapp`, `mensagens_whatsapp`, gateway Evolution).
 *
 * Garantias:
 * - nunca bloqueia o agendamento: qualquer falha vira registro em
 *   `envios_de_whatsapp` com status `erro`;
 * - idempotência por (agendamento_id, tipo), garantida por índice único;
 * - isolamento por barbearia: a conexão usada é sempre a do tenant do
 *   agendamento, nunca outra.
 */
import { fusoDoTenant } from "@/lib/fuso.server";
import { segmentoValido } from "@/lib/segmentos";

import { conversaDoTelefone, configuracaoDoTenant, enviarPelaBarbearia } from "./fluxo.server";

export type TipoDeNotificacao =
  | "confirmacao_agendamento"
  | "lembrete_24h"
  | "lembrete_2h"
  | "cancelamento"
  | "remarcacao"
  | "retorno";

/** Automação (liga/desliga por barbearia) correspondente a cada tipo. */
const AUTOMACAO_DO_TIPO = {
  confirmacao_agendamento: "confirmacao_agendamento",
  lembrete_24h: "lembrete_24h",
  lembrete_2h: "lembrete_2h",
  cancelamento: "cancelamento",
  remarcacao: "remarcacao",
  retorno: "retorno",
} as const;

/** Opções de cada lembrete: número (qualquer canal) e botão (API oficial). */
export const OPCOES_DO_LEMBRETE: Partial<Record<TipoDeNotificacao, { rotulo: string; acao: string }[]>> = {
  lembrete_24h: [
    { rotulo: "Confirmar", acao: "CORTAI_CONFIRMAR" },
    { rotulo: "Remarcar", acao: "CORTAI_REMARCAR" },
    { rotulo: "Cancelar", acao: "CORTAI_CANCELAR" },
  ],
  lembrete_2h: [
    { rotulo: "Confirmar", acao: "CORTAI_CONFIRMAR" },
    { rotulo: "Cheguei", acao: "CORTAI_CHEGUEI" },
    { rotulo: "Remarcar", acao: "CORTAI_REMARCAR" },
    { rotulo: "Cancelar", acao: "CORTAI_CANCELAR" },
  ],
  retorno: [
    { rotulo: "Agendar", acao: "CORTAI_AGENDAR" },
    { rotulo: "Agora não", acao: "CORTAI_AGORA_NAO" },
  ],
};

/** Nome do modelo aprovado na Meta para cada lembrete (opcional, por ambiente). */
function modeloDoTipo(tipo: TipoDeNotificacao): string | null {
  const chave =
    tipo === "lembrete_24h"
      ? "WHATSAPP_MODELO_LEMBRETE"
      : tipo === "lembrete_2h"
        ? "WHATSAPP_MODELO_LEMBRETE_DIA"
        : tipo === "retorno"
          ? "WHATSAPP_MODELO_RETORNO"
          : null;
  const nome = chave ? process.env[chave] : undefined;
  return nome && nome.trim() ? nome.trim() : null;
}

const MAX_TENTATIVAS = 3;

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function digitos(valor: string) {
  return valor.replace(/\D/g, "");
}

function dataBr(iso: string, fuso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: fuso,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso));
}

function horaBr(iso: string, fuso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: fuso,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function reais(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function primeiroNome(nome: string) {
  return (nome.trim().split(/\s+/)[0] ?? nome).trim() || "cliente";
}

export type DadosDaMensagem = {
  cliente: string;
  barbearia: string;
  servico: string | null;
  profissional: string | null;
  inicio: string;
  valorCentavos: number;
  endereco: string | null;
  linkAgendamento: string | null;
  linkPagamento: string | null;
  /** Fuso da barbearia; garante data e hora corretas para o cliente. */
  fuso: string;
  /** Segmento do negócio: fora da barbearia, o retorno usa o texto do segmento. */
  segmento?: string | null;
  /** Texto de retorno já preenchido (personalização > padrão do segmento). */
  textoRetorno?: string | null;
};

/**
 * Templates centralizados. Linha sem dado real simplesmente não aparece:
 * nunca "undefined", "null" ou "[object Object]".
 */
export function montarMensagem(tipo: TipoDeNotificacao, d: DadosDaMensagem): string {
  const nome = primeiroNome(d.cliente);
  const linha = (texto: string | null | undefined, prefixo: string) =>
    texto && String(texto).trim() ? `${prefixo}${String(texto).trim()}` : null;

  const blocos: (string | null)[] = [];

  if (tipo === "confirmacao_agendamento") {
    blocos.push(
      `Olá, ${nome}! 👋`,
      `Seu horário na ${d.barbearia} está confirmado.`,
      "",
      linha(d.servico, "✂️ Serviço: "),
      linha(d.profissional, "💈 Profissional: "),
      `📅 Data: ${dataBr(d.inicio, d.fuso)}`,
      `⏰ Horário: ${horaBr(d.inicio, d.fuso)}`,
      d.valorCentavos > 0 ? `💰 Valor: ${reais(d.valorCentavos)}` : null,
      linha(d.endereco, "📍 "),
    );
    if (d.linkPagamento) blocos.push("", "💳 Pagar agora", d.linkPagamento);
    blocos.push("", "Até lá! ✂️");
  } else if (tipo === "lembrete_24h") {
    blocos.push(
      `Olá, ${nome}! 👋`,
      `Lembrete do seu horário na ${d.barbearia}.`,
      "",
      linha(d.servico, "✂️ "),
      linha(d.profissional, "💈 "),
      `📅 ${dataBr(d.inicio, d.fuso)}`,
      `⏰ ${horaBr(d.inicio, d.fuso)}`,
      "",
      "Nos vemos lá! ✂️",
    );
  } else if (tipo === "lembrete_2h") {
    blocos.push(
      `Olá, ${nome}! 👋`,
      "Seu horário está chegando.",
      "",
      linha(d.servico, "✂️ "),
      linha(d.profissional, "💈 "),
      `⏰ ${horaBr(d.inicio, d.fuso)}`,
      "",
      "Até daqui a pouco! ✂️",
    );
  } else if (tipo === "retorno" && d.textoRetorno) {
    blocos.push(d.textoRetorno);
  } else if (tipo === "retorno") {
    blocos.push(
      `Olá, ${nome}! 👋`,
      `Já está chegando a hora do seu próximo corte na ${d.barbearia}.`,
      "",
      "Quer que eu veja um horário para você?",
    );
  } else if (tipo === "cancelamento") {
    blocos.push(
      `Olá, ${nome}.`,
      `Seu agendamento na ${d.barbearia} foi cancelado.`,
      "",
      `📅 ${dataBr(d.inicio, d.fuso)}`,
      `⏰ ${horaBr(d.inicio, d.fuso)}`,
      linha(d.servico, "✂️ "),
    );
    if (d.linkAgendamento) {
      blocos.push("", "Se quiser realizar um novo agendamento:", d.linkAgendamento);
    }
  } else {
    blocos.push(
      `Olá, ${nome}! 👋`,
      "Seu horário foi remarcado.",
      "",
      linha(d.servico, "✂️ "),
      linha(d.profissional, "💈 "),
      `📅 ${dataBr(d.inicio, d.fuso)}`,
      `⏰ ${horaBr(d.inicio, d.fuso)}`,
      "",
      "Até lá! ✂️",
    );
  }

  const opcoes = OPCOES_DO_LEMBRETE[tipo];
  if (opcoes) {
    blocos.push("", "Responda com o número:", ...opcoes.map((o, i) => `${i + 1} - ${o.rotulo}`));
    if (tipo === "retorno") blocos.push("", "Para não receber mais esses lembretes, responda SAIR.");
  }

  return blocos
    .filter((l) => l !== null && l !== undefined)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

type Resultado = { enviado: boolean; motivo?: string };

/** Liga/desliga por barbearia, reaproveitando `automacoes_de_ia`. */
async function automacaoAtiva(tenantId: string, tipo: TipoDeNotificacao, padrao: boolean) {
  const db = await admin();
  const { data } = await db
    .from("automacoes_de_ia")
    .select("ativa")
    .eq("tenant_id", tenantId)
    .eq("chave", AUTOMACAO_DO_TIPO[tipo])
    .maybeSingle();
  return data ? data.ativa : padrao;
}

async function modelosPagosLigados(tenantId: string) {
  const db = await admin();
  const { data } = await db
    .from("automacoes_de_ia")
    .select("ativa")
    .eq("tenant_id", tenantId)
    .eq("chave", "whatsapp_modelos_pagos")
    .maybeSingle();
  return data?.ativa === true;
}

/** Preferências do cliente: canal desligado, frequência e horário de silêncio. */
async function preferenciaBloqueia(clienteId: string | null, tipo: TipoDeNotificacao, fuso: string) {
  if (!clienteId) return null;
  const db = await admin();
  const { data: p } = await db
    .from("preferencias_do_cliente_avisos")
    .select("whatsapp_ativo, frequencia, silencio_inicio, silencio_fim")
    .eq("cliente_id", clienteId)
    .maybeSingle();
  if (!p) return null;
  return motivoDeBloqueio(p, tipo, new Date(), fuso);
}

export function motivoDeBloqueio(
  p: { whatsapp_ativo: boolean; frequencia: string; silencio_inicio: string | null; silencio_fim: string | null },
  tipo: string,
  agora: Date,
  fuso: string,
): string | null {
  if (!p.whatsapp_ativo) return "Cliente desligou avisos por WhatsApp.";
  if (p.frequencia === "minima" && tipo === "lembrete_24h") return "Cliente prefere só o aviso mais próximo.";
  if (p.silencio_inicio && p.silencio_fim) {
    const hm = new Intl.DateTimeFormat("en-GB", { timeZone: fuso, hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .format(agora);
    const ini = p.silencio_inicio.slice(0, 5);
    const fim = p.silencio_fim.slice(0, 5);
    const dentro = ini <= fim ? hm >= ini && hm < fim : hm >= ini || hm < fim;
    if (dentro) return "Horário de silêncio do cliente.";
  }
  return null;
}


/**
 * Único ponto de envio transacional. Nunca lança: o agendamento já existe e
 * não pode ser afetado por uma falha de WhatsApp.
 */
export async function notificarAgendamento(
  agendamentoId: string,
  tipo: TipoDeNotificacao,
): Promise<Resultado> {
  if (tipo === "cancelamento") {
    // O horário já está livre; a lista de espera é avisada em paralelo.
    const { avisarListaDeEspera } = await import("./lembretes.server");
    await avisarListaDeEspera(agendamentoId).catch(() => undefined);
  }
  try {
    // WhatsApp automático só a partir do Pro; a operação nunca é bloqueada.
    const db = await admin();
    const { data: ag } = await db.from("agendamentos").select("tenant_id").eq("id", agendamentoId).maybeSingle();
    if (ag?.tenant_id) {
      const { data: liberado, error } = await db.rpc("recurso_do_tenant_ativo", {
        _tenant_id: ag.tenant_id,
        _chave: "cortai_whatsapp",
      });
      if (!error && liberado === false) return { enviado: false, motivo: "plano_sem_whatsapp" } as Resultado;
    }
    return await executar(agendamentoId, tipo);
  } catch (e) {
    const motivo = e instanceof Error ? e.message : "Falha inesperada no envio.";
    try {
      const db = await admin();
      await db
        .from("envios_de_whatsapp")
        .update({ status: "erro", erro: motivo.slice(0, 500) })
        .eq("agendamento_id", agendamentoId)
        .eq("tipo", tipo);
    } catch {
      /* diagnóstico perdido; o agendamento continua íntegro */
    }
    return { enviado: false, motivo };
  }
}

async function executar(agendamentoId: string, tipo: TipoDeNotificacao): Promise<Resultado> {
  const db = await admin();

  const { data: ag } = await db
    .from("agendamentos")
    .select(
      "id, tenant_id, cliente_id, inicio, status, valor_centavos, clientes(nome, telefone, opt_in_whatsapp), servicos(nome), profissionais(nome)",
    )
    .eq("id", agendamentoId)
    .maybeSingle();
  if (!ag) return { enviado: false, motivo: "Agendamento não encontrado." };

  const status = String(ag.status);
  if (tipo === "retorno") {
    if (status !== "finalizado") return { enviado: false, motivo: "Atendimento não finalizado." };
  } else if (tipo === "cancelamento") {
    if (!["cancelado", "estornado"].includes(status)) {
      return { enviado: false, motivo: "Agendamento não está cancelado." };
    }
  } else if (["cancelado", "falta", "nao_compareceu", "estornado"].includes(status)) {
    return { enviado: false, motivo: "Agendamento não está ativo." };
  }

  const cliente = (ag as any).clientes as {
    nome: string;
    telefone: string | null;
    opt_in_whatsapp: boolean | null;
  } | null;
  const telefone = digitos(String(cliente?.telefone ?? ""));
  if (telefone.length < 10) return { enviado: false, motivo: "Cliente sem WhatsApp válido." };
  // Retorno é lembrete de relacionamento: só com consentimento e respeitando o SAIR.
  if (tipo === "retorno" && cliente?.opt_in_whatsapp !== true) {
    return { enviado: false, motivo: "Cliente sem consentimento para lembretes." };
  }

  if (tipo === "lembrete_24h" || tipo === "lembrete_2h") {
    const bloqueio = await preferenciaBloqueia(ag.cliente_id, tipo, await fusoDoTenant(ag.tenant_id));
    if (bloqueio) return { enviado: false, motivo: bloqueio };
  }

  const config = await configuracaoDoTenant(ag.tenant_id);
  const padrao =
    tipo === "confirmacao_agendamento"
      ? config.confirmacaoAutomatica
      : tipo === "lembrete_24h" || tipo === "lembrete_2h"
        ? config.lembretes
        : true;
  if (!(await automacaoAtiva(ag.tenant_id, tipo, padrao))) {
    return { enviado: false, motivo: "Automação desligada para esta barbearia." };
  }

  // Idempotência: o índice único (agendamento_id, tipo) impede duplicar.
  const { data: existente } = await db
    .from("envios_de_whatsapp")
    .select("id, status, tentativas")
    .eq("agendamento_id", agendamentoId)
    .eq("tipo", tipo)
    .maybeSingle();
  if (existente && (existente.status === "enviado" || existente.status === "enviando")) {
    return { enviado: false, motivo: "Mensagem já processada." };
  }
  if (existente && existente.tentativas >= MAX_TENTATIVAS) {
    return { enviado: false, motivo: "Limite de tentativas atingido." };
  }

  let registroId = existente?.id ?? null;
  if (!registroId) {
    const { data: criado, error } = await db
      .from("envios_de_whatsapp")
      .insert({
        tenant_id: ag.tenant_id,
        agendamento_id: ag.id,
        cliente_id: ag.cliente_id,
        telefone,
        tipo,
        status: "enviando",
        tentativas: 1,
      })
      .select("id")
      .single();
    // Conflito = outra execução simultânea já assumiu este envio.
    if (error) return { enviado: false, motivo: "Mensagem já processada." };
    registroId = criado.id;
  } else {
    // Reserva atômica da nova tentativa: só uma execução consegue trocar o
    // status de volta para "enviando"; a outra desiste sem enviar.
    const { data: reservado } = await db
      .from("envios_de_whatsapp")
      .update({ status: "enviando", tentativas: (existente?.tentativas ?? 0) + 1, erro: null })
      .eq("id", registroId)
      .eq("status", existente!.status)
      .eq("tentativas", existente!.tentativas)
      .select("id");
    if (!reservado || reservado.length === 0) return { enviado: false, motivo: "Mensagem já processada." };
  }

  const marcarErro = async (motivo: string) => {
    await db
      .from("envios_de_whatsapp")
      .update({ status: "erro", erro: motivo.slice(0, 500) })
      .eq("id", registroId!);
    return { enviado: false, motivo };
  };

  // A conexão é SEMPRE a da barbearia dona do agendamento.
  const { data: conexao } = await db
    .from("conexoes_whatsapp")
    .select("id, sessao_id, status")
    .eq("tenant_id", ag.tenant_id)
    .maybeSingle();
  if (!conexao || conexao.status !== "conectado") {
    return marcarErro("WhatsApp da barbearia não está conectado.");
  }

  const { data: tenant } = await db
    .from("tenants")
    .select("nome, endereco, slug, fuso, segmento")
    .eq("id", ag.tenant_id)
    .maybeSingle();

  let textoRetorno: string | null = null;
  if (tipo === "retorno" && tenant?.segmento && tenant.segmento !== "barbearia") {
    const { textoDaSituacao, preencher } = await import("./conversa-padrao");
    const base = textoDaSituacao("retorno", { textos: config.textosConversa, desligadas: config.situacoesDesligadas }, segmentoValido(tenant.segmento));
    const dias = Math.max(1, Math.round((Date.now() - new Date(ag.inicio).getTime()) / 86_400_000));
    textoRetorno = base
      ? preencher(base, {
          nome: primeiroNome(cliente?.nome ?? "cliente"),
          dias,
          ultimo_servico: ((ag as any).servicos?.nome as string | undefined) ?? null,
          profissional: ((ag as any).profissionais?.nome as string | undefined) ?? "a equipe",
          barbearia: tenant.nome,
        })
      : null;
  }

  const texto = montarMensagem(tipo, {
    cliente: cliente?.nome ?? "cliente",
    barbearia: tenant?.nome ?? "Barbearia",
    servico: ((ag as any).servicos?.nome as string | undefined) ?? null,
    profissional: ((ag as any).profissionais?.nome as string | undefined) ?? null,
    inicio: ag.inicio,
    valorCentavos: ag.valor_centavos ?? 0,
    endereco: tenant?.endereco ?? null,
    fuso: await fusoDoTenant(ag.tenant_id),
    segmento: tenant?.segmento ?? null,
    textoRetorno,
    linkAgendamento: tenant?.slug ? `https://cortai.dev/agendar/${tenant.slug}` : null,
    linkPagamento:
      tipo === "confirmacao_agendamento" && config.pagamentoAntecipado && config.linkPagamento?.startsWith("http")
        ? config.linkPagamento
        : null,
  });

  // Modelos da Meta são cobrados: só com o interruptor da barbearia ligado (padrão desligado).
  const modelosPagos = await modelosPagosLigados(ag.tenant_id);
  const nomeModelo = modelosPagos ? modeloDoTipo(tipo) : null;
  const opcoes = OPCOES_DO_LEMBRETE[tipo];
  const fusoModelo = await fusoDoTenant(ag.tenant_id);
  const modelo =
    nomeModelo && opcoes
      ? {
          nome: nomeModelo,
          idioma: "pt_BR",
          parametros:
            tipo === "retorno"
              ? [primeiroNome(cliente?.nome ?? "cliente"), tenant?.nome ?? "Barbearia"]
              : [
                  primeiroNome(cliente?.nome ?? "cliente"),
                  tenant?.nome ?? "Barbearia",
                  dataBr(ag.inicio, fusoModelo),
                  horaBr(ag.inicio, fusoModelo),
                ],
          // O ID da notificação vai no payload do botão: a resposta nunca é adivinhada.
          botoes: opcoes.map((o) => `${o.acao}:${registroId}`),
        }
      : null;

  const conversa = await conversaDoTelefone({
    tenantId: ag.tenant_id,
    conexaoId: conexao.id,
    telefone,
    nomeContato: cliente?.nome ?? null,
  });

  let externoId: string | null = null;
  try {
    const r = await enviarPelaBarbearia({
      tenantId: ag.tenant_id,
      conversaId: conversa.id,
      conexaoId: conexao.id,
      sessaoId: conexao.sessao_id,
      telefone,
      texto,
      porIa: false,
      modelo,
      iniciadaPelaBarbearia: true,
    });
    externoId = r.externoId;
  } catch (e) {
    return marcarErro(e instanceof Error ? e.message : "Falha ao enviar pelo WhatsApp.");
  }

  // Notificação que espera resposta: guarda ações e prazo, e a conversa passa
  // a interpretar a resposta por esse estado até o prazo vencer.
  const aguarda = Boolean(opcoes?.length);
  const validoAte = aguarda
    ? tipo === "retorno"
      ? new Date(Date.now() + 7 * 24 * 3600_000).toISOString()
      : new Date(new Date(ag.inicio).getTime() + 15 * 60_000).toISOString()
    : null;
  await db
    .from("envios_de_whatsapp")
    .update({
      status: "enviado",
      conteudo: texto,
      erro: null,
      enviado_em: new Date().toISOString(),
      canal: "whatsapp",
      aguarda_resposta: aguarda,
      acoes: (opcoes ?? []).map((o) => o.acao),
      valido_ate: validoAte,
      mensagem_externa_id: externoId,
    } as never)
    .eq("id", registroId);

  if (aguarda) {
    const ctx = ((conversa as { contexto?: unknown }).contexto ?? {}) as Record<string, unknown>;
    await db
      .from("conversas_whatsapp")
      .update({
        contexto: {
          ...ctx,
          estado: "AGUARDANDO_RESPOSTA_LEMBRETE",
          notificacao: { id: registroId, agendamentoId: ag.id, acoes: (opcoes ?? []).map((o) => o.acao), validoAte },
        } as never,
      })
      .eq("id", conversa.id);
  }

  return { enviado: true };
}

/**
 * Varredura das automações por tempo (lembretes) e retentativas controladas.
 * Consulta só as janelas necessárias — nunca a agenda inteira.
 */
export async function processarAutomacoesDeWhatsapp(agora = new Date()) {
  const db = await admin();
  const resumo = { lembrete24h: 0, lembrete2h: 0, retorno: 0, retentativas: 0 };

  /**
   * Só os agendamentos elegíveis da janela, já sem os que têm envio deste tipo
   * (evita reprocessar e chamadas desnecessárias a cada execução do job).
   */
  const janela = async (tipo: TipoDeNotificacao, horas: number, minutos: number) => {
    const de = new Date(agora.getTime() + horas * 3600_000 - minutos * 60_000);
    const ate = new Date(agora.getTime() + horas * 3600_000 + minutos * 60_000);
    const { data } = await db
      .from("agendamentos")
      .select("id")
      .gte("inicio", de.toISOString())
      .lte("inicio", ate.toISOString())
      .in("status", ["novo", "agendado", "aguardando_pagamento", "aguardando_confirmacao", "pago", "fiado"])
      .limit(500);
    const ids = (data ?? []).map((a) => a.id);
    if (ids.length === 0) return [];
    const { data: jaEnviados } = await db
      .from("envios_de_whatsapp")
      .select("agendamento_id")
      .eq("tipo", tipo)
      .in("agendamento_id", ids);
    const feitos = new Set((jaEnviados ?? []).map((e) => e.agendamento_id));
    return ids.filter((id) => !feitos.has(id));
  };

  for (const id of await janela("lembrete_24h", 24, 30)) {
    const r = await notificarAgendamento(id, "lembrete_24h");
    if (r.enviado) resumo.lembrete24h += 1;
  }
  // "Você é o próximo": 2h ± 5 min (varredura a cada 15 min, dedupe pelo índice único).
  for (const id of await janela("lembrete_2h", 2, 8)) {
    const r = await notificarAgendamento(id, "lembrete_2h");
    if (r.enviado) resumo.lembrete2h += 1;
  }

  const { candidatosAoRetorno } = await import("./lembretes.server");
  for (const id of await candidatosAoRetorno(agora)) {
    const r = await notificarAgendamento(id, "retorno");
    if (r.enviado) resumo.retorno += 1;
  }

  // Retry controlado: só falhas recentes e abaixo do limite de tentativas.
  const desde = new Date(agora.getTime() - 6 * 3600_000).toISOString();
  const { data: falhas } = await db
    .from("envios_de_whatsapp")
    .select("agendamento_id, tipo, tentativas")
    .eq("status", "erro")
    .gte("criado_em", desde)
    .lt("tentativas", MAX_TENTATIVAS)
    .not("agendamento_id", "is", null)
    .limit(100);
  for (const f of falhas ?? []) {
    const r = await notificarAgendamento(f.agendamento_id as string, f.tipo as TipoDeNotificacao);
    if (r.enviado) resumo.retentativas += 1;
  }

  return resumo;
}
