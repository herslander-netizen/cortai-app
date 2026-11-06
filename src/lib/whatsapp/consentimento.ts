import { normalizarTelefone } from "@/lib/telefone";

/**
 * Finalidades de mensagens proativas enviadas pelo negócio ao cliente.
 * Responder a uma mensagem recebida não usa este catálogo: a conversa iniciada
 * pelo cliente é um contexto separado e continua sujeita à janela do provedor.
 */
export const FINALIDADES_WHATSAPP = [
  "avisos_agendamento",
  "lista_espera",
  "relacionamento",
  "marketing",
] as const;

export type FinalidadeWhatsapp = (typeof FINALIDADES_WHATSAPP)[number];
export type AcaoConsentimentoWhatsapp =
  | "concedido"
  | "revogado"
  | "reconsentimento_solicitado";

export const FINALIDADES_DE_SERVICO: readonly FinalidadeWhatsapp[] = [
  "avisos_agendamento",
  "lista_espera",
  "relacionamento",
];

export type EventoConsentimentoWhatsapp = {
  acao: AcaoConsentimentoWhatsapp;
  finalidade: FinalidadeWhatsapp;
};

export type DecisaoConsentimentoWhatsapp =
  | { pode: true }
  | { pode: false; motivo: string };

/** Normaliza o telefone para E.164. O banco guarda o sinal + e não pontuação. */
export function telefoneEmE164(telefone: string | null | undefined): string | null {
  const digitos = normalizarTelefone(telefone);
  if (!/^[1-9]\\d{7,14}$/.test(digitos)) return null;
  return `+${digitos}`;
}

/**
 * Decide somente a permissão de consentimento. Telefone, conexão, janela,
 * plano, preferências e limites de ritmo permanecem sob as regras existentes.
 */
export function decidirConsentimentoWhatsapp(input: {
  suprimido: boolean;
  ultimaAcao: AcaoConsentimentoWhatsapp | null;
}): DecisaoConsentimentoWhatsapp {
  if (input.suprimido) {
    return { pode: false, motivo: "Este telefone pediu para interromper as mensagens automáticas." };
  }
  if (input.ultimaAcao !== "concedido") {
    return { pode: false, motivo: "Não existe consentimento válido para esta finalidade." };
  }
  return { pode: true };
}

/** Mapeia o tipo já existente de notificação para uma finalidade de consentimento. */
export function finalidadeDaNotificacao(tipo: string): FinalidadeWhatsapp {
  if (tipo === "vaga_lista_espera") return "lista_espera";
  if (
    tipo === "retorno" ||
    tipo === "pos_atendimento" ||
    tipo === "convite_avaliacao" ||
    tipo === "recuperacao_experiencia" ||
    tipo === "fallback_informativo_whatsapp"
  ) {
    return "relacionamento";
  }
  return "avisos_agendamento";
}

export function ehFinalidadeWhatsapp(valor: string): valor is FinalidadeWhatsapp {
  return (FINALIDADES_WHATSAPP as readonly string[]).includes(valor);
}
