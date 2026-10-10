/** Histórico de ocorrências do WhatsApp para o profissional: texto curto, sem detalhe técnico. */
export type OcorrenciaDaCentral = {
  id: string;
  quando: string;
  texto: string;
  resultado: "ok" | "alerta" | "erro";
};

type LinhaDeAuditoria = {
  id: string;
  acao: string;
  criado_em: string;
  detalhes?: Record<string, unknown> | null;
};

export const ACOES_DO_HISTORICO = [
  "whatsapp.conectado",
  "whatsapp.desconectado",
  "whatsapp.desconectado_pelo_painel",
  "whatsapp.evolution_indisponivel",
  "whatsapp.evolution_recuperado",
  "notificacoes_whatsapp.ativadas",
  "notificacoes_whatsapp.desativadas",
  "cortai.automacao_ativada",
  "cortai.automacao_desativada",
] as const;

/** Mapeia um evento de auditoria numa ocorrência legível; null = não aparece para o profissional. */
export function ocorrenciaDaAuditoria(l: LinhaDeAuditoria): OcorrenciaDaCentral | null {
  const base = { id: l.id, quando: l.criado_em };
  switch (l.acao) {
    case "whatsapp.conectado":
      return { ...base, texto: "WhatsApp conectado", resultado: "ok" };
    case "whatsapp.desconectado":
      return { ...base, texto: "WhatsApp desconectado", resultado: "erro" };
    case "whatsapp.desconectado_pelo_painel":
      return { ...base, texto: "WhatsApp desconectado por você", resultado: "alerta" };
    case "whatsapp.evolution_indisponivel":
      return { ...base, texto: "Serviço do WhatsApp indisponível", resultado: "erro" };
    case "whatsapp.evolution_recuperado":
      // Recuperação silenciosa (queda nunca confirmada) não vira ruído no histórico.
      return l.detalhes?.["silencioso"] === true
        ? null
        : { ...base, texto: "Conexão recuperada", resultado: "ok" };
    case "notificacoes_whatsapp.ativadas":
      return { ...base, texto: "Avisos pelo WhatsApp ativados", resultado: "ok" };
    case "notificacoes_whatsapp.desativadas":
      return { ...base, texto: "Avisos pelo WhatsApp desativados", resultado: "alerta" };
    case "cortai.automacao_ativada":
      return { ...base, texto: "IA ativada para atender pelo WhatsApp", resultado: "ok" };
    case "cortai.automacao_desativada":
      return { ...base, texto: "IA desligada para o WhatsApp", resultado: "alerta" };
    default:
      return null;
  }
}
