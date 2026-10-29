/**
 * Catálogo único de eventos da Flow IA (regras puras, sem banco).
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
      gestor: ["in_app", "push", "whatsapp"],
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
      gestor: ["in_app", "push", "whatsapp"],
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
      gestor: ["in_app", "push", "whatsapp"],
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
    destinos: {
      profissional: ["in_app", "push", "whatsapp"],
      gestor: ["in_app", "push", "whatsapp"],
    },
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
  vaga_aberta: {
    titulo: "Vaga aberta",
    prioridade: "importante",
    destinos: { cliente: ["whatsapp"] },
  },
  mudanca_operacional: {
    titulo: "Mudança no horário",
    prioridade: "importante",
    destinos: { cliente: ["whatsapp"] },
  },
  pagamento_conferido: {
    titulo: "Pagamento conferido",
    prioridade: "normal",
    destinos: { cliente: ["whatsapp"] },
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
  whatsapp_conexao: {
    titulo: "WhatsApp desconectado",
    prioridade: "importante",
    destinos: { gestor: ["in_app", "push"] },
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
  versao?: string | null | undefined;
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
    if (ctx.planoComWhatsapp === false)
      return { canal, enviar: false, motivo: "plano_sem_whatsapp" };
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

/** Evento do catálogo correspondente a cada tipo de push existente. */
export const EVENTO_DO_PUSH: Record<TipoDePush, Evento> = {
  agendamento_novo: "agendamento_criado",
  agendamento_remarcado: "agendamento_remarcado",
  agendamento_cancelado: "agendamento_cancelado",
  cliente_chegou: "cliente_chegou",
};

/** Profissional vê a própria agenda; os demais papéis de equipe veem o negócio. */
export function destinatarioDoPapel(papel: string): Destinatario {
  return papel === "barbeiro" || papel === "profissional" ? "profissional" : "gestor";
}

export type PessoaDaEquipe = {
  userId: string;
  papel: string;
  preferencias?: Contexto["preferencias"];
  temPush: boolean;
  temWhatsapp: boolean;
};

/**
 * Decide, pessoa a pessoa, quem recebe push e quem recebe WhatsApp para um
 * evento. Cada pessoa aparece no máximo uma vez em cada canal.
 */
export function canaisDaEquipe(
  evento: Evento,
  pessoas: PessoaDaEquipe[],
  geral: { planoComWhatsapp: boolean },
) {
  const push = new Set<string>();
  const whatsapp = new Set<string>();
  const registro: Record<string, Record<string, { enviar: boolean; motivo: string }>> = {};
  for (const p of pessoas) {
    if (registro[p.userId]) continue;
    const decisao = decidirCanais(evento, destinatarioDoPapel(p.papel), {
      preferencias: p.preferencias ?? null,
      temPush: p.temPush,
      temWhatsapp: p.temWhatsapp,
      planoComWhatsapp: geral.planoComWhatsapp,
    });
    registro[p.userId] = {};
    for (const d of decisao) {
      if (d.canal === "in_app") continue;
      registro[p.userId]![d.canal] = { enviar: d.enviar, motivo: d.motivo };
      if (!d.enviar) continue;
      if (d.canal === "push") push.add(p.userId);
      if (d.canal === "whatsapp") whatsapp.add(p.userId);
    }
  }
  return { push: [...push], whatsapp: [...whatsapp], registro };
}

/** Evento do catálogo para cada aviso de WhatsApp ao cliente. */
export const EVENTO_DO_CLIENTE: Record<string, Evento> = {
  confirmacao_agendamento: "agendamento_criado",
  alteracao_agendamento: "agendamento_remarcado",
  remarcacao: "agendamento_remarcado",
  cancelamento: "agendamento_cancelado",
  cancelamento_agendamento: "agendamento_cancelado",
  lembrete_24h: "lembrete",
  lembrete_2h: "lembrete",
  aviso_proximo: "lembrete",
  mudanca_operacional: "mudanca_operacional",
  vaga_lista_espera: "vaga_aberta",
  pagamento_confirmado: "pagamento_conferido",
  pos_atendimento: "relacionamento",
  convite_avaliacao: "relacionamento",
  recuperacao_experiencia: "relacionamento",
  retorno: "relacionamento",
};

/** Intervalo mínimo entre dois avisos de equipe pelo WhatsApp para a mesma pessoa. */
export const COOLDOWN_WHATSAPP_MIN = 15;

/**
 * Trava por pessoa e canal: devolve a chave que reserva a janela de cooldown
 * (gravada uma vez só no banco) ou `null` quando o aviso passa sem trava —
 * avisos críticos e o canal de push (que já substitui pela `tag`).
 */
export function chaveDeBloqueio(input: {
  canal: Exclude<Canal, "in_app">;
  evento: Evento;
  userId: string;
  agora?: Date;
}): string | null {
  if (input.canal !== "whatsapp") return null;
  if (EVENTOS[input.evento].prioridade === "critica") return null;
  const janela = Math.floor(
    (input.agora ?? new Date()).getTime() / (COOLDOWN_WHATSAPP_MIN * 60_000),
  );
  return `bloq:wa:${input.userId}:${janela}`;
}
