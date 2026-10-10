/**
 * Central de automação do WhatsApp: estados INDEPENDENTES, derivados só de fatos confirmados
 * pelo backend (sem rede, sem banco). Nada aqui presume sucesso: o que não foi confirmado
 * recentemente aparece como "verificando" ou "desconhecido".
 *
 * - WhatsApp: o canal está conectado?
 * - Automação: o dono ligou o atendimento por IA? (intenção persistida: `responder_whatsapp`)
 * - IA: o processamento inteligente está habilitado e com as dependências disponíveis?
 * - Avisos: a configuração específica de avisos (`notificacoes_whatsapp_ativas`) permite o envio?
 * - Evolution: o serviço e a instância têm disponibilidade confirmada?
 * - Monitoramento: a varredura recorrente confirmou o estado há pouco?
 */
import type { EventoDoServico } from "./incidente-evolution";

/** A varredura roda a cada 15 min; passado isto sem confirmação, o estado deixa de ser "confirmado". */
export const VALIDADE_DA_CONFIRMACAO_MS = 40 * 60_000;
/** Instabilidade antiga demais (sem nova falha) deixa de contar. */
export const VALIDADE_DA_INSTABILIDADE_MS = 45 * 60_000;

export type EstadoDoWhatsapp =
  "conectado" | "desconectado" | "aguardando_leitura" | "verificando" | "desconhecido";
export type EstadoDaIa = "ativa" | "pausada" | "indisponivel" | "verificando";
export type EstadoDoEvolution = "online" | "offline" | "instavel" | "desconhecido";
export type EstadoDoMonitoramento = "ativo" | "indisponivel" | "nao_confirmado";

export type EntradaDaCentral = {
  conexao: {
    status: string;
    numero: string | null;
    verificadoEm: string | null;
    vistoEm: string | null;
    conectadoEm: string | null;
  } | null;
  /** Intenção persistida do dono (responder_whatsapp). */
  automacaoLigada: boolean;
  iaPausadaEm: string | null;
  iaPausaMotivo: string | null;
  /** Chave da IA configurada no servidor. */
  iaNoServidor: boolean;
  /** Plano do negócio libera o WhatsApp automático. */
  planoLibera: boolean;
  avisosAtivos: boolean;
  /** Variáveis do serviço Evolution configuradas no servidor. */
  servicoConfigurado: boolean;
  ultimoEventoDoServico: EventoDoServico | null;
  ultimoEventoDoServicoEm: string | null;
  agora: Date;
};

export type TomDoCartao = "ok" | "alerta" | "erro" | "neutro";

export type CentralDeAutomacao = {
  whatsapp: EstadoDoWhatsapp;
  automacaoLigada: boolean;
  ia: EstadoDaIa;
  iaMotivo: "desligada_pelo_dono" | "pausada" | "sem_servico" | "plano" | null;
  avisos: "ativados" | "desativados";
  evolution: EstadoDoEvolution;
  monitoramento: EstadoDoMonitoramento;
  numero: string | null;
  ultimaVerificacaoEm: string | null;
  principal: {
    titulo: string;
    mensagem: string;
    tom: TomDoCartao;
    acao: "conectar" | "verificar" | "nenhuma";
  };
};

function idadeMs(iso: string | null, agora: Date) {
  if (!iso) return Infinity;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? agora.getTime() - t : Infinity;
}

export function derivarCentral(e: EntradaDaCentral): CentralDeAutomacao {
  const { conexao, agora } = e;
  const ultimaConfirmacao = conexao
    ? ([conexao.verificadoEm, conexao.vistoEm, conexao.conectadoEm]
        .filter((v): v is string => !!v)
        .sort()
        .pop() ?? null)
    : null;
  const confirmadoHaPouco = idadeMs(ultimaConfirmacao, agora) <= VALIDADE_DA_CONFIRMACAO_MS;

  // Serviço Evolution: a última ocorrência registrada manda; sem ocorrência, só "online" com confirmação recente.
  let evolution: EstadoDoEvolution = "desconhecido";
  if (e.servicoConfigurado) {
    if (e.ultimoEventoDoServico === "evolution_indisponivel") evolution = "offline";
    else if (
      e.ultimoEventoDoServico === "evolution_instavel" &&
      idadeMs(e.ultimoEventoDoServicoEm, agora) <= VALIDADE_DA_INSTABILIDADE_MS
    )
      evolution = "instavel";
    else if (conexao && confirmadoHaPouco) evolution = "online";
  }

  // Canal.
  let whatsapp: EstadoDoWhatsapp = "desconhecido";
  if (!conexao || conexao.status === "desconectado" || conexao.status === "erro")
    whatsapp = "desconectado";
  else if (conexao.status === "qr_pronto") whatsapp = "aguardando_leitura";
  else if (conexao.status === "conectando" || conexao.status === "pendente")
    whatsapp = "verificando";
  else if (conexao.status === "conectado")
    whatsapp = confirmadoHaPouco ? "conectado" : "desconhecido";

  // IA: habilitada e com dependências. Não depende do canal estar de pé.
  let ia: EstadoDaIa = "ativa";
  let iaMotivo: CentralDeAutomacao["iaMotivo"] = null;
  if (!e.automacaoLigada) {
    ia = "pausada";
    iaMotivo = "desligada_pelo_dono";
  } else if (e.iaPausadaEm) {
    ia = "pausada";
    iaMotivo = "pausada";
  } else if (!e.planoLibera) {
    ia = "indisponivel";
    iaMotivo = "plano";
  } else if (!e.iaNoServidor) {
    ia = "indisponivel";
    iaMotivo = "sem_servico";
  }

  const monitoramento: EstadoDoMonitoramento = !e.servicoConfigurado
    ? "indisponivel"
    : conexao && confirmadoHaPouco
      ? "ativo"
      : "nao_confirmado";

  const base = {
    whatsapp,
    automacaoLigada: e.automacaoLigada,
    ia,
    iaMotivo,
    avisos: e.avisosAtivos ? ("ativados" as const) : ("desativados" as const),
    evolution,
    monitoramento,
    numero: conexao?.numero ?? null,
    ultimaVerificacaoEm: ultimaConfirmacao,
  };

  // Cartão principal: reflete só o que foi confirmado.
  if (!e.automacaoLigada)
    return {
      ...base,
      principal: {
        titulo: "Automação desligada",
        mensagem:
          "A IA não responde aos clientes pelo WhatsApp. A conexão, os avisos e a agenda continuam como estão.",
        tom: "neutro",
        acao: whatsapp === "conectado" ? "nenhuma" : "conectar",
      },
    };
  if (whatsapp === "desconectado")
    return {
      ...base,
      principal: {
        titulo: "WhatsApp desconectado",
        mensagem:
          "A automação está ligada, mas não há WhatsApp conectado. O atendimento pelo WhatsApp está interrompido.",
        tom: "erro",
        acao: "conectar",
      },
    };
  if (whatsapp === "aguardando_leitura")
    return {
      ...base,
      principal: {
        titulo: "Aguardando a leitura do QR Code",
        mensagem: "Conclua a conexão no celular para a automação começar a atender.",
        tom: "alerta",
        acao: "conectar",
      },
    };
  if (evolution === "offline" || evolution === "instavel")
    return {
      ...base,
      principal: {
        titulo: "Automação temporariamente indisponível",
        mensagem:
          evolution === "offline"
            ? "O serviço do WhatsApp não está respondendo. A automação continua ligada, mas o atendimento pode estar interrompido. A agenda segue funcionando."
            : "O serviço do WhatsApp está instável. Estamos acompanhando; o atendimento pode demorar.",
        tom: "erro",
        acao: "verificar",
      },
    };
  if (ia === "indisponivel")
    return {
      ...base,
      principal: {
        titulo: "IA indisponível",
        mensagem:
          iaMotivo === "plano"
            ? "O plano atual não inclui o atendimento automático pelo WhatsApp."
            : "A IA está fora do ar no momento. O WhatsApp segue conectado.",
        tom: "alerta",
        acao: "verificar",
      },
    };
  if (ia === "pausada")
    return {
      ...base,
      principal: {
        titulo: "IA pausada",
        mensagem: e.iaPausaMotivo
          ? `A IA está pausada: ${e.iaPausaMotivo}`
          : "A IA está pausada. O WhatsApp segue conectado.",
        tom: "alerta",
        acao: "verificar",
      },
    };
  if (whatsapp === "conectado")
    return {
      ...base,
      principal: {
        titulo: "Automação ativada",
        mensagem: "WhatsApp conectado. A IA está habilitada para atender seus clientes.",
        tom: "ok",
        acao: "verificar",
      },
    };
  return {
    ...base,
    principal: {
      titulo: "Verificando a conexão",
      mensagem: "Ainda não confirmamos o estado do WhatsApp. Toque em verificar para atualizar.",
      tom: "neutro",
      acao: "verificar",
    },
  };
}
