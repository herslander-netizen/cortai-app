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

import { conversaDoTelefone, configuracaoDoTenant, enviarPelaBarbearia } from "./fluxo.server";

export type TipoDeNotificacao =
  | "confirmacao_agendamento"
  | "lembrete_24h"
  | "lembrete_2h"
  | "cancelamento"
  | "remarcacao";

/** Automação (liga/desliga por barbearia) correspondente a cada tipo. */
const AUTOMACAO_DO_TIPO = {
  confirmacao_agendamento: "confirmacao_agendamento",
  lembrete_24h: "lembrete_24h",
  lembrete_2h: "lembrete_2h",
  cancelamento: "cancelamento",
  remarcacao: "remarcacao",
} as const;

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

/**
 * Único ponto de envio transacional. Nunca lança: o agendamento já existe e
 * não pode ser afetado por uma falha de WhatsApp.
 */
export async function notificarAgendamento(
  agendamentoId: string,
  tipo: TipoDeNotificacao,
): Promise<Resultado> {
  try {
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
      "id, tenant_id, cliente_id, inicio, status, valor_centavos, clientes(nome, telefone), servicos(nome), profissionais(nome)",
    )
    .eq("id", agendamentoId)
    .maybeSingle();
  if (!ag) return { enviado: false, motivo: "Agendamento não encontrado." };

  const status = String(ag.status);
  if (tipo === "cancelamento") {
    if (!["cancelado", "estornado"].includes(status)) {
      return { enviado: false, motivo: "Agendamento não está cancelado." };
    }
  } else if (["cancelado", "falta", "nao_compareceu", "estornado"].includes(status)) {
    return { enviado: false, motivo: "Agendamento não está ativo." };
  }

  const cliente = (ag as any).clientes as { nome: string; telefone: string | null } | null;
  const telefone = digitos(String(cliente?.telefone ?? ""));
  if (telefone.length < 10) return { enviado: false, motivo: "Cliente sem WhatsApp válido." };

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
    await db
      .from("envios_de_whatsapp")
      .update({ status: "enviando", tentativas: (existente?.tentativas ?? 0) + 1, erro: null })
      .eq("id", registroId);
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
    .select("nome, endereco, slug, fuso")
    .eq("id", ag.tenant_id)
    .maybeSingle();

  const texto = montarMensagem(tipo, {
    cliente: cliente?.nome ?? "cliente",
    barbearia: tenant?.nome ?? "Barbearia",
    servico: ((ag as any).servicos?.nome as string | undefined) ?? null,
    profissional: ((ag as any).profissionais?.nome as string | undefined) ?? null,
    inicio: ag.inicio,
    valorCentavos: ag.valor_centavos ?? 0,
    endereco: tenant?.endereco ?? null,
    fuso: await fusoDoTenant(ag.tenant_id),
    linkAgendamento: tenant?.slug ? `https://cortai.dev/agendar/${tenant.slug}` : null,
    linkPagamento:
      tipo === "confirmacao_agendamento" && config.pagamentoAntecipado && config.linkPagamento?.startsWith("http")
        ? config.linkPagamento
        : null,
  });

  const conversa = await conversaDoTelefone({
    tenantId: ag.tenant_id,
    conexaoId: conexao.id,
    telefone,
    nomeContato: cliente?.nome ?? null,
  });

  try {
    await enviarPelaBarbearia({
      tenantId: ag.tenant_id,
      conversaId: conversa.id,
      conexaoId: conexao.id,
      sessaoId: conexao.sessao_id,
      telefone,
      texto,
      porIa: false,
    });
  } catch (e) {
    return marcarErro(e instanceof Error ? e.message : "Falha ao enviar pelo WhatsApp.");
  }

  await db
    .from("envios_de_whatsapp")
    .update({ status: "enviado", conteudo: texto, erro: null, enviado_em: new Date().toISOString() })
    .eq("id", registroId);

  return { enviado: true };
}

/**
 * Varredura das automações por tempo (lembretes) e retentativas controladas.
 * Consulta só as janelas necessárias — nunca a agenda inteira.
 */
export async function processarAutomacoesDeWhatsapp(agora = new Date()) {
  const db = await admin();
  const resumo = { lembrete24h: 0, lembrete2h: 0, retentativas: 0 };

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
  for (const id of await janela("lembrete_2h", 2, 15)) {
    const r = await notificarAgendamento(id, "lembrete_2h");
    if (r.enviado) resumo.lembrete2h += 1;
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
