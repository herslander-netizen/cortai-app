/**
 * Finalidade das conexões de WhatsApp de um negócio (regra pura e testável).
 *
 * Cada negócio pode ter até duas conexões próprias:
 *  - "atendimento": o CortAI — Assistente Virtual conversa com o cliente;
 *  - "notificacoes": avisos transacionais (confirmação, lembretes, vaga…).
 *
 * Regra crítica: com DUAS conexões próprias, nunca há troca silenciosa entre
 * elas. Se a conexão da finalidade estiver ausente/desconectada, o envio falha
 * e é registrado. Com UMA só conexão própria (legado), ela atende os dois papéis.
 */

export const TIPOS_DE_CONEXAO = ["atendimento", "notificacoes"] as const;
export type TipoDeConexao = (typeof TIPOS_DE_CONEXAO)[number];

export const ROTULO_DO_TIPO: Record<TipoDeConexao, string> = {
  atendimento: "WhatsApp de Atendimento",
  notificacoes: "WhatsApp de Notificações",
};

export function tipoValido(v: unknown): TipoDeConexao {
  return v === "notificacoes" ? "notificacoes" : "atendimento";
}

export type ConexaoPropria = {
  id: string;
  sessao_id: string;
  status: string | null;
  tipo: string | null;
  compartilhada?: boolean | null;
  provedor?: string | null;
};

export type EscolhaDeConexao<T extends ConexaoPropria> =
  /** Usa esta conexão própria. */
  | { tipo: "propria"; conexao: T; legado: boolean }
  /** Duas conexões próprias e a da finalidade não está disponível: falha, sem troca. */
  | { tipo: "falha"; motivo: string }
  /** Nenhuma conexão própria utilizável: segue a reserva (número oficial). */
  | { tipo: "reserva"; motivo: string; propriaExistente: boolean };

export function escolherConexaoPorFinalidade<T extends ConexaoPropria>(
  linhasDoTenant: T[],
  finalidade: TipoDeConexao,
): EscolhaDeConexao<T> {
  const proprias = linhasDoTenant.filter((l) => l.compartilhada !== true);
  if (proprias.length >= 2) {
    const daFinalidade = proprias.find((l) => tipoValido(l.tipo) === finalidade);
    if (!daFinalidade) return { tipo: "falha", motivo: `sem_conexao_${finalidade}` };
    if (daFinalidade.status !== "conectado")
      return { tipo: "falha", motivo: `${finalidade}_${daFinalidade.status ?? "desconhecido"}` };
    return { tipo: "propria", conexao: daFinalidade, legado: false };
  }
  if (proprias.length === 1) {
    const unica = proprias[0] as T;
    if (unica.status === "conectado") {
      return { tipo: "propria", conexao: unica, legado: tipoValido(unica.tipo) !== finalidade };
    }
    return { tipo: "reserva", motivo: `propria_${unica.status}`, propriaExistente: true };
  }
  return { tipo: "reserva", motivo: "sem_propria", propriaExistente: linhasDoTenant.length > 0 };
}

/** Mensagem registrada quando a conexão da finalidade não está disponível. */
export function mensagemDeFalhaDaFinalidade(finalidade: TipoDeConexao): string {
  return `${ROTULO_DO_TIPO[finalidade]} indisponível. Reconecte em CortAI — Assistente Virtual.`;
}
