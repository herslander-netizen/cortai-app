/**
 * Catálogo único de eventos do CortAI (regras puras, sem banco).
 *
 * Um evento descreve O QUE aconteceu; o catálogo diz para QUEM vai, com que
 * PRIORIDADE e por quais CANAIS ele pode sair. O canal nunca define o evento.
 */
import type { TipoDePush } from "@/lib/push/regras";

export type Destinatario = "cliente" | "profissional" | "gestor";
export type Prioridade = "critica" | "importante" | "normal" | "relacionamento";
export type Canal = "in_app" | "push" | "whatsapp";

export type DefinicaoDeEvento = {
  titulo: string;
  prioridade: Prioridade;
  /** Canais possíveis por destinatário (ausente = não recebe). */
  destinos: Partial<Record<Destinatario, Canal[]>>;
  /** Tipo de push equivalente (para reaproveitar regras e textos existentes). */
  push?: TipoDePush;
  /** Tipo de aviso do WhatsApp do cliente equivalente. */
  whatsappCliente?: string;
};

export const EVENTOS = {
  agendamento_criado: {
    titulo: "Novo agendamento",
    prioridade: "importante",
    destinos: {
      cliente: ["whatsapp"],
      profissional: ["in_app", "push", "whatsapp"],
      gestor: ["in_app"],
    },
    push: "agendamento_novo",
    whatsappCliente: "confirmacao_agendamento",
  },
  agendamento_remarcado: {
    titulo: "Horário remarcado",
    prioridade: "importante",
    destinos: {
      cliente: ["whatsapp"],
      profissional: ["in_app", "push", "whatsapp"],
      gestor: ["in_app"],
    },
    push: "agendamento_remarcado",
    whatsappCliente: "alteracao_agendamento",
  },
  agendamento_cancelado: {
    titulo: "Horário cancelado",
    prioridade: "importante",
    destinos: {
      cliente: ["whatsapp"],
      profissional: ["in_app", "push", "whatsapp"],
      gestor: ["in_app"],
    },
    push: "agendamento_cancelado",
    whatsappCliente: "cancelamento_agendamento",
  },
  agendamento_confirmado: {
    titulo: "Horário confirmado pelo cliente",
    prioridade: "normal",
    destinos: { profissional: ["in_app"], gestor: ["in_app"] },
  },
  cliente_chegou: {
    titulo: "Cliente chegou",
    prioridade: "critica",
    destinos: { profissional: ["in_app", "push", "whatsapp"], gestor: ["in_app"] },
    push: "cliente_chegou",
  },
  atraso_avisado: {
    titulo: "Atraso avisado ao cliente",
    prioridade: "critica",
    destinos: { cliente: ["whatsapp"], profissional: ["in_app"] },
  },
  pix_informado: {
    titulo: "Cliente informou o Pix",
    prioridade: "importante",
    destinos: { gestor: ["in_app", "push"] },
  },
  falha_de_entrega: {
    titulo: "Aviso não entregue",
    prioridade: "importante",
    destinos: { gestor: ["in_app"] },
  },
  lembrete: {
    titulo: "Lembrete do horário",
    prioridade: "normal",
    destinos: { cliente: ["whatsapp"] },
  },
  relacionamento: {
    titulo: "Pós-atendimento",
    prioridade: "relacionamento",
    destinos: { cliente: ["whatsapp"] },
  },
} as const satisfies Record<string, DefinicaoDeEvento>;

export type Evento = keyof typeof EVENTOS;

export function eventoValido(v: unknown): v is Evento {
  return typeof v === "string" && v in EVENTOS;
}

/** Chave de dedupe: o mesmo evento na mesma versão do agendamento sai uma vez. */
export function chaveDeDedupe(input: {
  evento: Evento;
  destinatario: Destinatario;
  alvo: string;
  referencia: string;
  versao?: string | null;
}) {
  return [input.evento, input.destinatario, input.alvo, input.referencia, input.versao ?? "1"].join(
    ":",
  );
}

export type Contexto = {
  /** Preferências da pessoa para o evento (ausente = padrão ligado, WhatsApp desligado). */
  preferencias?: { no_app?: boolean; no_push?: boolean; no_whatsapp?: boolean } | null;
  temPush?: boolean;
  /** Telefone verificado (equipe) ou válido e com WhatsApp (cliente). */
  temWhatsapp?: boolean;
  planoComWhatsapp?: boolean;
  /** Cliente: consentimento para relacionamento. */
  consentimento?: boolean;
  emSilencio?: boolean;
};

export type DecisaoDeCanal = { canal: Canal; enviar: boolean; motivo: string };

/**
 * Decide canais para UM destinatário. Não envia nada: o resultado é gravado na
 * linha da notificação e cada entregador existente obedece a ele.
 */
export function decidirCanais(
  evento: Evento,
  destinatario: Destinatario,
  ctx: Contexto,
): DecisaoDeCanal[] {
  const def: DefinicaoDeEvento = EVENTOS[evento];
  const canais = def.destinos[destinatario] ?? [];
  const p = ctx.preferencias ?? {};
  const urgente = def.prioridade === "critica" || def.prioridade === "importante";
  return canais.map((canal): DecisaoDeCanal => {
    if (canal === "in_app") {
      // Sininho é a fonte da verdade: equipe sempre registra.
      return { canal, enviar: true, motivo: "sininho" };
    }
    if (canal === "push") {
      if (p.no_push === false) return { canal, enviar: false, motivo: "push_desligado" };
      if (!ctx.temPush) return { canal, enviar: false, motivo: "sem_inscricao" };
      return { canal, enviar: true, motivo: "ok" };
    }
    // WhatsApp
    if (ctx.planoComWhatsapp === false) return { canal, enviar: false, motivo: "plano_sem_whatsapp" };
    if (!ctx.temWhatsapp) return { canal, enviar: false, motivo: "sem_whatsapp" };
    if (destinatario !== "cliente" && p.no_whatsapp !== true)
      return { canal, enviar: false, motivo: "whatsapp_nao_ligado" };
    if (def.prioridade === "relacionamento" && !ctx.consentimento)
      return { canal, enviar: false, motivo: "sem_consentimento" };
    if (ctx.emSilencio && !urgente) return { canal, enviar: false, motivo: "silencio" };
    // Janela de 24h / modelo aprovado é decidida depois por `decidirFormato`.
    return { canal, enviar: true, motivo: "ok" };
  });
}
