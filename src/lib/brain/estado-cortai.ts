/**
 * Estado da Flow IA de um negócio — regra pura, usada pelo cérebro, pelo painel e pelo ADM.
 *
 * - `desligada`: o ADM desligou a Flow IA do negócio (`config_atendimento_ia.cortai_ativa`).
 * - `pausada`: o gateway recusou por crédito (402/403) há menos de 6 h.
 * - `limite_diario` / `limite_pessoa`: a cota do canal acabou.
 * - `sem_configuracao`: o ambiente não tem a chave do gateway.
 * Desligar ou pausar a IA nunca desliga agenda, comandas nem avisos essenciais.
 */

export type EstadoDaCortai =
  "ativa" | "desligada" | "pausada" | "limite_diario" | "limite_pessoa" | "sem_configuracao";

/** Pausa por crédito: só uma nova tentativa a cada 6 h, até o dono reativar. */
export const PAUSA_MS = 6 * 60 * 60_000;

export type ConfigDaCortai = {
  cortai_ativa?: boolean | null;
  ia_pausada_em?: string | null;
} | null;

/** Bloqueio que vem só da configuração (sem contar uso). Sem linha salva, a Flow IA está ativa. */
export function bloqueioDaConfig(
  cfg: ConfigDaCortai,
  agora = Date.now(),
): "desligada" | "pausada" | null {
  if (cfg?.cortai_ativa === false) return "desligada";
  if (cfg?.ia_pausada_em && agora - Date.parse(cfg.ia_pausada_em) < PAUSA_MS) return "pausada";
  return null;
}

export const SELO_DA_CORTAI: Record<
  EstadoDaCortai,
  { rotulo: string; texto: string; tom: "ok" | "aviso" | "parada" }
> = {
  ativa: { rotulo: "Ativa", texto: "A Flow IA está respondendo normalmente.", tom: "ok" },
  desligada: {
    rotulo: "Desligada",
    texto:
      "A Flow IA está desligada para este negócio. Agenda, comandas e avisos continuam funcionando.",
    tom: "parada",
  },
  pausada: {
    rotulo: "Pausada",
    texto:
      "A Flow IA foi pausada porque os créditos de IA acabaram. Ela tenta de novo sozinha em algumas horas.",
    tom: "aviso",
  },
  limite_diario: {
    rotulo: "Limite do dia",
    texto: "O limite de uso de hoje foi atingido. A Flow IA volta a responder amanhã.",
    tom: "aviso",
  },
  limite_pessoa: {
    rotulo: "Limite por hora",
    texto: "Muitas perguntas em pouco tempo. Tente de novo daqui a pouco.",
    tom: "aviso",
  },
  sem_configuracao: {
    rotulo: "Indisponível",
    texto: "A Flow IA ainda não está ligada neste ambiente.",
    tom: "parada",
  },
};

/** Texto fixo que o cérebro devolve quando não pode responder. */
export function textoDoBloqueio(estado: Exclude<EstadoDaCortai, "ativa">): string {
  return SELO_DA_CORTAI[estado].texto;
}
