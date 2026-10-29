/**
 * Avisos da Flow IA ao cliente pelo WhatsApp — entrega determinística.
 *
 * Evento do Flow → regra → texto/modelo aprovado → envio pela conexão oficial
 * (`conexoes_whatsapp`, `conversas_whatsapp`, `mensagens_whatsapp`). O aviso pode
 * abrir ou continuar uma conversa: respostas livres seguem para o cérebro Flow IA
 * em `fluxo.server.ts`; botões são tratados no servidor.
 *
 * Garantias:
 * - nunca bloqueia o agendamento: qualquer falha vira registro em
 *   `envios_de_whatsapp` com status `erro`;
 * - idempotência por (agendamento_id, tipo), garantida por índice único;
 * - isolamento por negócio: a conexão usada é sempre a do tenant do
 *   agendamento, nunca outra.
 */
import { linhasNumeradas } from "./opcoes-numeradas";
import { fusoDoTenant } from "@/lib/fuso.server";
import { segmentoParaApresentacao } from "@/lib/segmentos";

import { conversaDoTelefone, configuracaoDoTenant, enviarPelaBarbearia } from "./fluxo.server";
import { urlPublica } from "@/lib/origem-publica";

export type TipoDeNotificacao =
  | "confirmacao_agendamento"
  | "alteracao_agendamento"
  | "lembrete_24h"
  | "lembrete_2h"
  | "aviso_proximo"
  | "mudanca_operacional"
  | "vaga_lista_espera"
  | "pagamento_confirmado"
  | "cancelamento"
  | "cancelamento_agendamento"
  | "remarcacao"
  | "pos_atendimento"
  | "convite_avaliacao"
  | "recuperacao_experiencia"
  | "fallback_informativo_whatsapp"
  | "retorno";

/** Automação (liga/desliga por barbearia) correspondente a cada tipo. */
const AUTOMACAO_DO_TIPO = {
  confirmacao_agendamento: "confirmacao_agendamento",
  alteracao_agendamento: "alteracao_agendamento",
  lembrete_24h: "lembrete_24h",
  lembrete_2h: "lembrete_2h",
  aviso_proximo: "lembrete_2h",
  mudanca_operacional: "mudanca_operacional",
  vaga_lista_espera: "vaga_lista_espera",
  pagamento_confirmado: "pagamento_confirmado",
  cancelamento: "cancelamento_agendamento",
  cancelamento_agendamento: "cancelamento_agendamento",
  remarcacao: "alteracao_agendamento",
  pos_atendimento: "pos_atendimento",
  convite_avaliacao: "convite_avaliacao",
  recuperacao_experiencia: "recuperacao_experiencia",
  fallback_informativo_whatsapp: "confirmacao_agendamento",
  retorno: "retorno",
} as const;

export const TIPOS_ESSENCIAIS = new Set<TipoDeNotificacao>([
  "confirmacao_agendamento",
  "alteracao_agendamento",
  "remarcacao",
  "cancelamento",
  "cancelamento_agendamento",
  "mudanca_operacional",
  "vaga_lista_espera",
  "pagamento_confirmado",
]);

export const TIPOS_DE_RELACIONAMENTO = new Set<TipoDeNotificacao>([
  "lembrete_24h",
  "lembrete_2h",
  "aviso_proximo",
  "pos_atendimento",
  "convite_avaliacao",
  "recuperacao_experiencia",
  "retorno",
]);

/**
 * Ações de cada aviso: botão interativo (até 3, dentro da janela), opção
 * numerada (provedor sem botões) e resposta por texto. Fora da janela, os
 * botões vêm do modelo aprovado no catálogo.
 */
export const OPCOES_DO_LEMBRETE: Partial<
  Record<TipoDeNotificacao, { rotulo: string; acao: string }[]>
> = {
  confirmacao_agendamento: [
    { rotulo: "Remarcar", acao: "CORTAI_REMARCAR" },
    { rotulo: "Cancelar", acao: "CORTAI_CANCELAR" },
  ],
  alteracao_agendamento: [
    { rotulo: "Confirmar", acao: "CORTAI_CONFIRMAR" },
    { rotulo: "Remarcar", acao: "CORTAI_REMARCAR" },
  ],
  remarcacao: [
    { rotulo: "Confirmar", acao: "CORTAI_CONFIRMAR" },
    { rotulo: "Remarcar", acao: "CORTAI_REMARCAR" },
  ],
  cancelamento: [{ rotulo: "Remarcar", acao: "CORTAI_REMARCAR" }],
  cancelamento_agendamento: [{ rotulo: "Ver horários", acao: "CORTAI_AGENDAR" }],
  lembrete_24h: [
    { rotulo: "Confirmar", acao: "CORTAI_CONFIRMAR" },
    { rotulo: "Remarcar", acao: "CORTAI_REMARCAR" },
    { rotulo: "Cancelar", acao: "CORTAI_CANCELAR" },
  ],
  // Interativo aceita 3: no dia, "Cheguei" vale mais que "Remarcar" (o modelo leva os 4).
  lembrete_2h: [
    { rotulo: "Confirmar", acao: "CORTAI_CONFIRMAR" },
    { rotulo: "Cheguei", acao: "CORTAI_CHEGUEI" },
    { rotulo: "Cancelar", acao: "CORTAI_CANCELAR" },
  ],
  aviso_proximo: [
    { rotulo: "Remarcar", acao: "CORTAI_REMARCAR" },
    { rotulo: "Cancelar", acao: "CORTAI_CANCELAR" },
  ],
  vaga_lista_espera: [
    { rotulo: "Aproveitar vaga", acao: "CORTAI_AGENDAR" },
    { rotulo: "Abrir Flow", acao: "CORTAI_ABRIR" },
  ],
  retorno: [
    { rotulo: "Agendar", acao: "CORTAI_AGENDAR" },
    { rotulo: "Agora não", acao: "CORTAI_AGORA_NAO" },
  ],
};

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
  /** Nome do negócio; campo legado preservado para compatibilidade. */
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
  linkAvaliacao?: string | null;
  /** Créditos pré-pagos restantes após a reserva; omitido quando não há carteira. */
  creditosDisponiveis?: number | null;
};

/**
 * Templates centralizados. Linha sem dado real simplesmente não aparece:
 * nunca "undefined", "null" ou "[object Object]".
 */
export function montarMensagem(
  tipo: TipoDeNotificacao,
  d: DadosDaMensagem,
  /** Opções numeradas só para provedor sem botões. */
  numerar = true,
): string {
  const nome = primeiroNome(d.cliente);
  const linha = (texto: string | null | undefined, prefixo: string) =>
    texto && String(texto).trim() ? `${prefixo}${String(texto).trim()}` : null;

  const creditos = (d.creditosDisponiveis ?? 0) > 0 ? `Créditos de atendimento disponíveis: ${d.creditosDisponiveis}` : null;
  const blocos: (string | null)[] = [];
  const barbearia = d.segmento === "barbearia";
  const em = barbearia ? `na ${d.barbearia}` : `em ${d.barbearia}`;

  if (tipo === "confirmacao_agendamento") {
    blocos.push(
      `Olá, ${nome}!`,
      `Seu horário ${em} está confirmado.`,
      "",
      linha(d.servico, "Serviço: "),
      linha(d.profissional, "Profissional: "),
      `Data: ${dataBr(d.inicio, d.fuso)}`,
      `Horário: ${horaBr(d.inicio, d.fuso)}`,
      d.valorCentavos > 0 ? `Valor: ${reais(d.valorCentavos)}` : null,
      linha(d.endereco, "📍 "),
      creditos,
    );
    if (d.linkPagamento) blocos.push("", "💳 Pagar agora", d.linkPagamento);
    blocos.push("", "Até lá!");
  } else if (tipo === "lembrete_24h") {
    blocos.push(
      `Olá, ${nome}!`,
      `Passando para lembrar do seu horário ${em}.`,
      "",
      linha(d.servico, "Serviço: "),
      linha(d.profissional, "Profissional: "),
      `${dataBr(d.inicio, d.fuso)} às ${horaBr(d.inicio, d.fuso)}.`,
      "",
      "Você pode confirmar, remarcar ou cancelar.",
      creditos,
    );
  } else if (tipo === "lembrete_2h" || tipo === "aviso_proximo") {
    blocos.push(
      `${nome}, seu horário ${em} está chegando.`,
      "",
      linha(d.servico, "Serviço: "),
      linha(d.profissional, "Profissional: "),
      `Hoje às ${horaBr(d.inicio, d.fuso)}.`,
      linha(d.endereco, "📍 "),
      creditos,
    );
  } else if (tipo === "alteracao_agendamento" || tipo === "remarcacao") {
    blocos.push(
      `Olá, ${nome}. Seu horário foi alterado.`,
      "",
      linha(d.servico, "Serviço: "),
      linha(d.profissional, "Profissional: "),
      `Data: ${dataBr(d.inicio, d.fuso)}`,
      `Horário: ${horaBr(d.inicio, d.fuso)}`,
      "",
      "Confira os dados atualizados no Flow.",
    );
  } else if (tipo === "mudanca_operacional") {
    blocos.push(
      `Olá, ${nome}. Houve uma mudança importante no seu horário ${em}.`,
      `${dataBr(d.inicio, d.fuso)} às ${horaBr(d.inicio, d.fuso)}.`,
      linha(d.linkAgendamento, "Confira no Flow: "),
    );
  } else if (tipo === "vaga_lista_espera") {
    blocos.push(
      `Boa notícia, ${nome}. Abriu uma vaga ${em}.`,
      `${dataBr(d.inicio, d.fuso)} às ${horaBr(d.inicio, d.fuso)}.`,
      linha(d.linkAgendamento, "Aproveite pelo Flow: "),
    );
  } else if (tipo === "pagamento_confirmado") {
    blocos.push(
      `Olá, ${nome}. Seu pagamento foi confirmado.`,
      linha(d.servico, "Serviço: "),
      d.valorCentavos > 0 ? `Valor: ${reais(d.valorCentavos)}` : null,
      `${dataBr(d.inicio, d.fuso)} às ${horaBr(d.inicio, d.fuso)}.`,
    );
  } else if (tipo === "pos_atendimento") {
    blocos.push(
      `Obrigado por escolher ${d.barbearia}, ${nome}.`,
      "Esperamos que tenha gostado da experiência.",
    );
  } else if (tipo === "convite_avaliacao") {
    blocos.push(
      `Olá, ${nome}. Como foi sua experiência?`,
      d.linkAvaliacao ? `Avalie com segurança pelo Flow: ${d.linkAvaliacao}` : null,
    );
  } else if (tipo === "recuperacao_experiencia") {
    blocos.push(
      `Obrigado por nos contar, ${nome}.`,
      "Seu feedback foi registrado e será considerado pela equipe.",
    );
  } else if (tipo === "fallback_informativo_whatsapp") {
    blocos.push(
      "Olá! Aqui é o Flow. Pode me contar o que precisa — agendar, remarcar, cancelar ou tirar dúvidas — por aqui mesmo.",
      linha(d.linkAgendamento, "Se preferir, use o link: "),
    );
  } else if (tipo === "retorno" && d.textoRetorno) {
    blocos.push(d.textoRetorno);
  } else if (tipo === "retorno") {
    blocos.push(
      `Olá, ${nome}!`,
      `Já está chegando a hora do seu próximo ${barbearia ? "corte" : "atendimento"} ${em}.`,
      "",
      "Quer que eu veja um horário para você?",
    );
  } else if (tipo === "cancelamento" || tipo === "cancelamento_agendamento") {
    blocos.push(
      `Olá, ${nome}.`,
      `Seu agendamento ${em} foi cancelado.`,
      "",
      `📅 ${dataBr(d.inicio, d.fuso)}`,
      `⏰ ${horaBr(d.inicio, d.fuso)}`,
      linha(d.servico, "Serviço: "),
    );
    if (d.linkAgendamento) {
      blocos.push(
        "",
        "Quer marcar outro horário? É só responder aqui.",
        `Ou pelo link: ${d.linkAgendamento}`,
      );
    }
  }

  const opcoes = OPCOES_DO_LEMBRETE[tipo];
  if (opcoes && numerar) {
    blocos.push("", "Responda com o número:", ...linhasNumeradas(opcoes));
    if (tipo === "retorno")
      blocos.push("", "Para não receber mais esses lembretes, responda SAIR.");
  }

  return blocos
    .filter((l) => l !== null && l !== undefined)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

type Resultado = { enviado: boolean; motivo?: string };

/** Liga/desliga por negócio, reaproveitando `automacoes_de_ia`. */
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
async function preferenciaBloqueia(
  clienteId: string | null,
  tipo: TipoDeNotificacao,
  fuso: string,
) {
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
  p: {
    whatsapp_ativo: boolean;
    frequencia: string;
    silencio_inicio: string | null;
    silencio_fim: string | null;
  },
  tipo: string,
  agora: Date,
  fuso: string,
): string | null {
  if (TIPOS_ESSENCIAIS.has(tipo as TipoDeNotificacao)) return null;
  if (!p.whatsapp_ativo) return "Cliente desligou avisos de relacionamento por WhatsApp.";
  if (p.frequencia === "minima" && tipo === "lembrete_24h")
    return "Cliente prefere só o aviso mais próximo.";
  if (p.silencio_inicio && p.silencio_fim) {
    const hm = new Intl.DateTimeFormat("en-GB", {
      timeZone: fuso,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(agora);
    const ini = p.silencio_inicio.slice(0, 5);
    const fim = p.silencio_fim.slice(0, 5);
    const dentro = ini <= fim ? hm >= ini && hm < fim : hm >= ini || hm < fim;
    if (dentro) return "Horário de silêncio do cliente.";
  }
  return null;
}

/** Primeira hora fora do silêncio, preservando o fuso do negócio. */
export function primeiraJanelaAposSilencio(
  agora: Date,
  fuso: string,
  inicio: string | null,
  fim: string | null,
): Date | null {
  if (!inicio || !fim) return null;
  const partes = new Intl.DateTimeFormat("en-GB", {
    timeZone: fuso,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(agora);
  const hora = Number(partes.find((p) => p.type === "hour")?.value ?? 0);
  const minuto = Number(partes.find((p) => p.type === "minute")?.value ?? 0);
  const atual = hora * 60 + minuto;
  const [hi = 0, mi = 0] = inicio.slice(0, 5).split(":").map(Number);
  const [hf = 0, mf = 0] = fim.slice(0, 5).split(":").map(Number);
  const comeco = hi * 60 + mi;
  const final = hf * 60 + mf;
  const dentro =
    comeco <= final ? atual >= comeco && atual < final : atual >= comeco || atual < final;
  if (!dentro) return null;
  let minutos = final - atual;
  if (minutos <= 0) minutos += 24 * 60;
  return new Date(agora.getTime() + minutos * 60_000);
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
    const { data: ag } = await db
      .from("agendamentos")
      .select("tenant_id")
      .eq("id", agendamentoId)
      .maybeSingle();
    if (ag?.tenant_id) {
      const { data: liberado, error } = await db.rpc("recurso_do_tenant_ativo", {
        _tenant_id: ag.tenant_id,
        _chave: "cortai_whatsapp",
      });
      if (!error && liberado === false)
        return { enviado: false, motivo: "plano_sem_whatsapp" } as Resultado;
      // Teste grátis: cota mensal de envios automáticos; o app nunca é bloqueado.
      const { reservarEnvioAutomatico } = await import("@/lib/teste-gratis.server");
      if (!(await reservarEnvioAutomatico(ag.tenant_id)))
        return { enviado: false, motivo: "limite_do_teste" } as Resultado;
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
      "id, tenant_id, cliente_id, inicio, status, valor_centavos, clientes(nome, telefone, opt_in_whatsapp, sem_whatsapp_em, marketing_suprimido_em), servicos(nome), profissionais(nome)",
    )
    .eq("id", agendamentoId)
    .maybeSingle();
  if (!ag) return { enviado: false, motivo: "Agendamento não encontrado." };

  const status = String(ag.status);
  if (tipo === "retorno" || tipo === "pos_atendimento" || tipo === "convite_avaliacao") {
    if (status !== "finalizado") return { enviado: false, motivo: "Atendimento não finalizado." };
  } else if (tipo === "cancelamento") {
    if (!["cancelado", "estornado"].includes(status)) {
      return { enviado: false, motivo: "Agendamento não está cancelado." };
    }
  } else if (["cancelado", "nao_compareceu", "estornado"].includes(status)) {
    return { enviado: false, motivo: "Agendamento não está ativo." };
  }

  const relacoes = ag as unknown as {
    clientes: {
      nome: string;
      telefone: string | null;
      opt_in_whatsapp: boolean | null;
      sem_whatsapp_em: string | null;
      marketing_suprimido_em: string | null;
    } | null;
    servicos: { nome?: string } | null;
    profissionais: { nome?: string } | null;
  };
  const cliente = relacoes.clientes;
  const telefone = digitos(String(cliente?.telefone ?? ""));
  if (telefone.length < 10) return { enviado: false, motivo: "Cliente sem WhatsApp válido." };
  // A Meta já disse que este número não recebe WhatsApp: não repete.
  if (cliente?.sem_whatsapp_em)
    return { enviado: false, motivo: "Telefone do cliente sem WhatsApp." };
  if (tipo === "retorno" && cliente?.marketing_suprimido_em) {
    return {
      enviado: false,
      motivo: "Cliente pediu para não receber mensagens de relacionamento.",
    };
  }
  if (tipo === "lembrete_24h" || tipo === "lembrete_2h") {
    const { lembretePerdeuOMomento } = await import("./erros-meta");
    if (lembretePerdeuOMomento(ag.inicio, tipo === "lembrete_24h" ? 24 : 2)) {
      return { enviado: false, motivo: "Lembrete perdeu o momento." };
    }
  }
  // Retorno é lembrete de relacionamento: só com consentimento e respeitando o SAIR.
  if (
    ["retorno", "pos_atendimento", "convite_avaliacao"].includes(tipo) &&
    cliente?.opt_in_whatsapp !== true
  ) {
    return { enviado: false, motivo: "Cliente sem consentimento para lembretes." };
  }
  // Porteiro único: telefone confirmado, SAIR/número errado e número recusado.
  const { decisaoDeEnvio } = await import("./porteiro.server");
  const porteiro = await decisaoDeEnvio(ag.cliente_id);
  if (!porteiro.pode) return { enviado: false, motivo: porteiro.motivo };
  // Teto por hora do número do negócio para os lotes que podem esperar (24h e retorno).
  // Sem registro de envio: a próxima varredura tenta de novo, dentro da janela.
  if (tipo === "lembrete_24h" || tipo === "retorno") {
    const { TETO_POR_HORA } = await import("./ritmo");
    const { count } = await db
      .from("envios_de_whatsapp")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", ag.tenant_id)
      .gte("criado_em", new Date(Date.now() - 3600_000).toISOString());
    if ((count ?? 0) >= TETO_POR_HORA)
      return { enviado: false, motivo: "Ritmo: teto de envios por hora deste número." };
  }

  if (["lembrete_24h", "lembrete_2h", "pos_atendimento", "convite_avaliacao"].includes(tipo)) {
    const bloqueio = await preferenciaBloqueia(
      ag.cliente_id,
      tipo,
      await fusoDoTenant(ag.tenant_id),
    );
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
    return { enviado: false, motivo: "Automação desligada para este negócio." };
  }

  // Regra única de avisos: registra o evento do cliente e obedece à decisão do canal.
  const { EVENTO_DO_CLIENTE } = await import("@/lib/avisos/catalogo");
  const eventoDoCliente = EVENTO_DO_CLIENTE[tipo];
  if (eventoDoCliente) {
    const { emitirAviso } = await import("@/lib/avisos/emitir.server");
    const versao = `${tipo}:${ag.inicio}`;
    const emitido = await emitirAviso({
      tenantId: ag.tenant_id,
      evento: eventoDoCliente,
      agendamentoId: ag.id,
      corpo: null,
      link: null,
      versao,
      alvos: [
        {
          destinatario: "cliente",
          clienteId: ag.cliente_id,
          contexto: {
            // Plano, telefone, preferência e silêncio já conferidos acima.
            temWhatsapp: true,
            planoComWhatsapp: true,
            consentimento: cliente?.opt_in_whatsapp === true,
          },
        },
      ],
    });
    const wa = emitido.decisoes[0]?.find((d) => d.canal === "whatsapp");
    if (wa && !wa.enviar) return { enviado: false, motivo: `Regra de avisos: ${wa.motivo}.` };
    // Mudança no horário torna obsoletos os avisos anteriores do cliente.
    if (
      eventoDoCliente === "agendamento_remarcado" ||
      eventoDoCliente === "agendamento_cancelado"
    ) {
      await db
        .from("notificacoes")
        .update({ obsoleta_em: new Date().toISOString() })
        .eq("agendamento_id", ag.id)
        .eq("destinatario_tipo", "cliente")
        .is("obsoleta_em", null)
        .not("chave_dedupe", "like", `%:${versao}`)
        .then(undefined, () => undefined);
    }
  }

  // Idempotência: o índice único (agendamento_id, tipo, versao) impede duplicar. A trava é por
  // cliente: se o atendimento passou para outro cliente ("Trocar Cliente"), o envio já feito ao
  // anterior não impede o do novo, que ganha a própria versão.
  const { data: envios } = await db
    .from("envios_de_whatsapp")
    .select("id, status, tentativas, proxima_tentativa_em, cliente_id")
    .eq("agendamento_id", agendamentoId)
    .eq("tipo", tipo);
  const doMesmoCliente = (envios ?? []).filter(
    (e) => !e.cliente_id || e.cliente_id === ag.cliente_id,
  );
  const existente = doMesmoCliente[0] ?? null;
  const versaoDoEnvio =
    doMesmoCliente.length < (envios ?? []).length ? `cliente:${ag.cliente_id}` : null;
  // Só "erro" (temporário) e "pendente" podem tentar de novo.
  if (existente && existente.status !== "erro" && existente.status !== "pendente") {
    return { enviado: false, motivo: "Mensagem já processada." };
  }
  if (
    existente &&
    (existente as { proxima_tentativa_em?: string | null }).proxima_tentativa_em &&
    new Date((existente as { proxima_tentativa_em: string }).proxima_tentativa_em).getTime() >
      Date.now()
  ) {
    return { enviado: false, motivo: "Aguardando o momento da nova tentativa." };
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
        ...(versaoDoEnvio ? { versao: versaoDoEnvio } : {}),
        status: "enviando",
        tentativas: 1,
      })
      .select("id")
      .single();
    // Conflito = outra execução simultânea já assumiu este envio.
    if (error) return { enviado: false, motivo: "Mensagem já processada." };
    registroId = criado.id;
  } else {
    if (!existente) return { enviado: false, motivo: "Mensagem já processada." };
    // Reserva atômica da nova tentativa: só uma execução consegue trocar o
    // status de volta para "enviando"; a outra desiste sem enviar.
    const { data: reservado } = await db
      .from("envios_de_whatsapp")
      .update({ status: "enviando", tentativas: (existente?.tentativas ?? 0) + 1, erro: null })
      .eq("id", registroId)
      .eq("status", existente.status)
      .eq("tentativas", existente.tentativas)
      .select("id");
    if (!reservado || reservado.length === 0)
      return { enviado: false, motivo: "Mensagem já processada." };
  }

  /** Erro sem envio à Meta (regra interna): não repete. */
  const marcarErro = async (motivo: string) => {
    if (!registroId) return { enviado: false, motivo };
    await db
      .from("envios_de_whatsapp")
      .update({ status: "falhou", erro: motivo.slice(0, 500), falhou_em: new Date().toISOString() })
      .eq("id", registroId);
    return { enviado: false, motivo };
  };
  /** Erro do envio: aplica o mapa de erros da Meta (repetir, suprimir, avisar). */
  const marcarFalhaDoEnvio = async (motivo: string, conteudo: string) => {
    if (!registroId) return { enviado: false, motivo };
    await db.from("envios_de_whatsapp").update({ conteudo }).eq("id", registroId);
    const { lerErroMeta } = await import("./erros-meta");
    const { aplicarFalhaDeEnvio } = await import("./falhas-envio.server");
    const lido = lerErroMeta(motivo);
    // A regra local da janela de 24h equivale ao 131047 da Meta.
    const codigo = /janela de 24h/i.test(motivo) ? 131047 : lido.codigo;
    const httpStatus = lido.httpStatus;
    await aplicarFalhaDeEnvio({ envioId: registroId, codigo, httpStatus, motivo });
    return { enviado: false, motivo };
  };

  // Remetente: conexão própria do negócio ou, na falta, o número oficial do Flow.
  const { conexaoDeEnvio, SEM_WHATSAPP_DISPONIVEL } = await import("./conexao-envio.server");
  const conexao = await conexaoDeEnvio(ag.tenant_id, "notificacoes");

  const { data: tenant } = await db
    .from("tenants")
    .select("nome, endereco, slug, fuso, segmento")
    .eq("id", ag.tenant_id)
    .maybeSingle();

  let textoRetorno: string | null = null;
  if (tipo === "retorno" && tenant && segmentoParaApresentacao(tenant.segmento) !== "barbearia") {
    const { textoDaSituacao, preencher } = await import("./conversa-padrao");
    const base = textoDaSituacao(
      "retorno",
      { textos: config.textosConversa, desligadas: config.situacoesDesligadas },
      segmentoParaApresentacao(tenant.segmento),
    );
    const dias = Math.max(1, Math.round((Date.now() - new Date(ag.inicio).getTime()) / 86_400_000));
    textoRetorno = base
      ? preencher(base, {
          nome: primeiroNome(cliente?.nome ?? "cliente"),
          dias,
          ultimo_servico: relacoes.servicos?.nome ?? null,
          profissional: relacoes.profissionais?.nome ?? "a equipe",
          barbearia: tenant.nome,
        })
      : null;
  }

  let linkAvaliacao: string | null = null;
  if (tipo === "convite_avaliacao") {
    const { criarConviteDeAvaliacao } = await import("@/lib/avaliacoes-publicas.functions");
    const token = await criarConviteDeAvaliacao(ag.id);
    if (!token) return marcarErro("Convite de avaliação já criado ou atendimento não elegível.");
    linkAvaliacao = urlPublica(`/avaliar/${token}`);
  }

  const { gatewayDoProvedor } = await import("./gateway.server");
  const oficial = gatewayDoProvedor(conexao?.provedor ?? null).capacidades().botoes;
  const fusoModelo = await fusoDoTenant(ag.tenant_id);
  let creditosDisponiveis: number | null = null;
  if (
    ag.cliente_id &&
    ["confirmacao_agendamento", "lembrete_24h", "lembrete_2h"].includes(tipo)
  ) {
    const { data: carteira } = await db
      .from("carteiras")
      .select("saldo_creditos")
      .eq("tenant_id", ag.tenant_id)
      .eq("cliente_id", ag.cliente_id)
      .maybeSingle();
    creditosDisponiveis = carteira?.saldo_creditos ?? null;
  }
  const texto = montarMensagem(
    tipo,
    {
      cliente: cliente?.nome ?? "cliente",
      barbearia: tenant?.nome ?? "Negócio",
      servico: relacoes.servicos?.nome ?? null,
      profissional: relacoes.profissionais?.nome ?? null,
      inicio: ag.inicio,
      valorCentavos: ag.valor_centavos ?? 0,
      endereco: tenant?.endereco ?? null,
      fuso: fusoModelo,
      segmento: tenant?.segmento ?? null,
      textoRetorno,
      linkAvaliacao,
      creditosDisponiveis,
      linkAgendamento: tenant?.slug ? urlPublica(`/agendar/${tenant.slug}`) : null,
      linkPagamento:
        tipo === "confirmacao_agendamento" &&
        config.pagamentoAntecipado &&
        config.linkPagamento?.startsWith("http")
          ? config.linkPagamento
          : null,
    },
    // Opções numeradas só quando o provedor não tem botões.
    !oficial,
  );

  // Utilidade sai sempre pelo modelo aprovado do catálogo; marketing só com o interruptor do negócio.
  const { TIPOS_DE_MARKETING, parametrosNaOrdem, payloadDoBotao, botoesInterativos } =
    await import("./modelos");
  const opcoes = OPCOES_DO_LEMBRETE[tipo];
  const marketingLiberado =
    !TIPOS_DE_MARKETING.has(tipo) || (await modelosPagosLigados(ag.tenant_id));
  const { modeloAprovadoDoTipo } = await import("./modelos.server");
  const doCatalogo = oficial && marketingLiberado ? await modeloAprovadoDoTipo(tipo) : null;
  let modelo: import("./gateway.server").ModeloComBotoes | null = null;
  if (doCatalogo && registroId) {
    try {
      modelo = {
        nome: doCatalogo.nome,
        idioma: doCatalogo.idioma,
        parametros: parametrosNaOrdem(doCatalogo.variaveis, {
          cliente: primeiroNome(cliente?.nome ?? "cliente"),
          negocio: tenant?.nome ?? null,
          data: dataBr(ag.inicio, fusoModelo),
          hora: horaBr(ag.inicio, fusoModelo),
          servico: relacoes.servicos?.nome ?? null,
          profissional: relacoes.profissionais?.nome ?? null,
          valor: ag.valor_centavos ? reais(ag.valor_centavos) : null,
        }),
        // O ID do envio vai no payload de cada botão: a resposta nunca é adivinhada.
        botoes: doCatalogo.botoes.map((b) => payloadDoBotao(b.acao, registroId!)),
      };
    } catch {
      modelo = null; // dado obrigatório ausente: sem modelo → sem_modelo
    }
  }
  const interativo =
    oficial && opcoes?.length && registroId
      ? botoesInterativos(
          opcoes.map((o) => ({ texto: o.rotulo, acao: o.acao })),
          registroId,
        )
      : null;
  const acoesDoEnvio = [
    ...new Set([
      ...(opcoes ?? []).map((o) => o.acao),
      ...(doCatalogo?.botoes ?? []).map((b) => b.acao),
    ]),
  ];

  if (!conexao) return marcarFalhaDoEnvio(SEM_WHATSAPP_DISPONIVEL, texto);

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
      interativo,
      iniciadaPelaBarbearia: true,
    });
    externoId = r.externoId;
  } catch (e) {
    return marcarFalhaDoEnvio(
      e instanceof Error ? e.message : "Falha ao enviar pelo WhatsApp.",
      texto,
    );
  }

  // Notificação que espera resposta: guarda ações e prazo, e a conversa passa
  // a interpretar a resposta por esse estado até o prazo vencer.
  const aguarda = acoesDoEnvio.length > 0;
  const { validadeDosBotoes } = await import("./modelos");
  const validoAte = aguarda ? validadeDosBotoes(tipo, ag.inicio) : null;
  await db
    .from("envios_de_whatsapp")
    .update({
      status: "enviado",
      conteudo: texto,
      erro: null,
      enviado_em: new Date().toISOString(),
      canal: "whatsapp",
      aguarda_resposta: aguarda,
      acoes: acoesDoEnvio,
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
          notificacao: {
            id: registroId,
            agendamentoId: ag.id,
            acoes: acoesDoEnvio,
            validoAte,
          },
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
  const resumo = {
    lembrete24h: 0,
    lembrete2h: 0,
    retorno: 0,
    retentativas: 0,
    listaDeEspera: 0,
    presosRecuperados: 0,
  };
  // Primeiro: envios parados em "enviando" (nunca reenviados).
  resumo.presosRecuperados = await recuperarEnviosPresos(agora).catch((e) => {
    console.error(
      "[whatsapp] recuperação de envios presos falhou:",
      e instanceof Error ? e.message : e,
    );
    return 0;
  });
  try {
    const { processarListaDeEspera } = await import("./fila-ofertas.server");
    resumo.listaDeEspera = (await processarListaDeEspera(agora)).ofertas;
  } catch {
    /* a lista de espera nunca bloqueia lembretes */
  }

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
      // Só o estado oficial "agendado" recebe lembrete (os demais nomes eram legados).
      .eq("status", "agendado")
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

  // Ritmo (`ritmo.ts`): pausa curta e variável entre envios, nada de rajada pelo mesmo
  // número. O lembrete de 2h vem primeiro e não tem teto (a janela dele é curta); o de 24h
  // e o retorno respeitam o teto da rodada e o que sobrar sai na próxima varredura.
  const { PAUSA_ENTRE_ENVIOS, TETO_DA_RODADA, pausaVariavel } = await import("./ritmo");
  let enviadosNaRodada = 0;
  const depoisDoEnvio = async (r: Resultado) => {
    if (!r.enviado) return;
    enviadosNaRodada += 1;
    await new Promise((ok) => setTimeout(ok, pausaVariavel(PAUSA_ENTRE_ENVIOS)));
  };

  // "Você é o próximo": 2h ± 5 min (varredura a cada 15 min, dedupe pelo índice único).
  for (const id of await janela("lembrete_2h", 2, 8)) {
    const r = await notificarAgendamento(id, "lembrete_2h");
    if (r.enviado) resumo.lembrete2h += 1;
    await depoisDoEnvio(r);
  }
  for (const id of await janela("lembrete_24h", 24, 30)) {
    if (enviadosNaRodada >= TETO_DA_RODADA) break;
    const r = await notificarAgendamento(id, "lembrete_24h");
    if (r.enviado) resumo.lembrete24h += 1;
    await depoisDoEnvio(r);
  }

  const { candidatosAoRetorno } = await import("./lembretes.server");
  for (const id of await candidatosAoRetorno(agora)) {
    if (enviadosNaRodada >= TETO_DA_RODADA) break;
    const r = await notificarAgendamento(id, "retorno");
    if (r.enviado) resumo.retorno += 1;
    await depoisDoEnvio(r);
  }

  // Retry controlado: só falhas recentes e abaixo do limite de tentativas.
  // 30h: cobre a espera de 24h do limite de marketing (131049).
  const desde = new Date(agora.getTime() - 30 * 3600_000).toISOString();
  const { data: falhas } = await db
    .from("envios_de_whatsapp")
    .select("agendamento_id, tipo, tentativas")
    .eq("status", "erro")
    .or(`proxima_tentativa_em.is.null,proxima_tentativa_em.lte.${agora.toISOString()}`)
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

/**
 * Envios parados em "enviando": com id externo viram "enviado"; sem ele, há mais
 * de 5 min, viram "erro" (envio interrompido) sem reenvio e o dono é avisado.
 * A troca só vale se o status ainda for "enviando" (sem corrida com o envio real).
 */
export async function recuperarEnviosPresos(agora = new Date()): Promise<number> {
  const db = await admin();
  const { decidirEnvioPreso, MOTIVO_INTERROMPIDO } = await import("./envios-presos");
  const { data } = await db
    .from("envios_de_whatsapp")
    .select("id, status, atualizado_em, criado_em, mensagem_externa_id")
    .eq("status", "enviando")
    .limit(100);
  let tratados = 0;
  for (const envio of data ?? []) {
    const decisao = decidirEnvioPreso(envio, agora.getTime());
    if (decisao === "aguardar") continue;
    const agoraIso = agora.toISOString();
    const mudanca =
      decisao === "enviado"
        ? { status: "enviado", enviado_em: agoraIso, erro: null }
        : {
            status: "erro",
            erro: MOTIVO_INTERROMPIDO,
            falhou_em: agoraIso,
            proxima_tentativa_em: null,
            // Limite atingido: a retentativa automática nunca pega este envio.
            tentativas: MAX_TENTATIVAS,
          };
    const { data: alterado } = await db
      .from("envios_de_whatsapp")
      .update(mudanca as never)
      .eq("id", envio.id)
      .eq("status", "enviando")
      .select("id, tenant_id, cliente_id, telefone, tipo, conteudo")
      .maybeSingle();
    if (!alterado) continue;
    tratados += 1;
    console.warn(`[whatsapp] envio preso ${envio.id} -> ${decisao}`);
    if (decisao === "interrompido") {
      const { avisarNegocioDaFalha } = await import("./falhas-envio.server");
      await avisarNegocioDaFalha(alterado as never).catch(() => undefined);
    }
  }
  return tratados;
}
