/**
 * Conexão de WhatsApp de um negócio (regra pura e testável).
 *
 * Modelo definitivo: cada negócio tem UMA conexão principal (o número da
 * empresa). Ela atende clientes, envia avisos aos clientes e avisos à equipe.
 * A Central de Notificações é só um interruptor/regras sobre essa conexão.
 *
 * Linhas antigas com `tipo='notificacoes'` (segundo número) e a linha da
 * plataforma (`escopo='central'`) são legado: ficam no banco, nunca enviam.
 */

export const TIPOS_DE_CONEXAO = ["atendimento", "notificacoes"] as const;
export type TipoDeConexao = (typeof TIPOS_DE_CONEXAO)[number];

export const ROTULO_DO_TIPO: Record<TipoDeConexao, string> = {
  atendimento: "WhatsApp",
  notificacoes: "WhatsApp (avisos)",
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
  /** Usa a conexão principal do negócio. */
  | { tipo: "propria"; conexao: T; legado: boolean }
  /** Mantido por compatibilidade de tipos; a regra atual não gera falha aqui. */
  | { tipo: "falha"; motivo: string }
  /** Sem conexão principal conectada: segue a reserva (número oficial compartilhado). */
  | { tipo: "reserva"; motivo: string; propriaExistente: boolean };

/** Conexão Central da plataforma: nunca conta como conexão de um negócio. */
export function ehConexaoCentral(l: {
  escopo?: string | null;
  tenant_id?: string | null;
}): boolean {
  return l.escopo === "central" || ("tenant_id" in l && l.tenant_id === null);
}

/** Linha antiga de "segundo número de notificações": não é mais usada. */
export function ehConexaoLegadaDeNotificacoes(l: { tipo?: string | null }): boolean {
  return l.tipo === "notificacoes";
}

/** A conexão principal do negócio (própria, não central, não legado). */
export function conexaoPrincipal<T extends ConexaoPropria>(linhasDoTenant: T[]): T | null {
  return (
    linhasDoTenant.find(
      (l) =>
        l.compartilhada !== true &&
        !ehConexaoCentral(l as never) &&
        !ehConexaoLegadaDeNotificacoes(l),
    ) ?? null
  );
}

/**
 * Remetente do negócio para qualquer finalidade: a conexão principal
 * conectada; senão, reserva. A finalidade não troca de número.
 */
export function escolherConexaoPorFinalidade<T extends ConexaoPropria>(
  linhasDoTenant: T[],
  _finalidade: TipoDeConexao,
): EscolhaDeConexao<T> {
  const principal = conexaoPrincipal(linhasDoTenant);
  if (principal) {
    if (principal.status === "conectado")
      return { tipo: "propria", conexao: principal, legado: false };
    return { tipo: "reserva", motivo: `propria_${principal.status}`, propriaExistente: true };
  }
  return { tipo: "reserva", motivo: "sem_propria", propriaExistente: linhasDoTenant.length > 0 };
}

export function mensagemDeFalhaDaFinalidade(_finalidade: TipoDeConexao): string {
  return "WhatsApp indisponível. Reconecte em Painel → WhatsApp.";
}

export type DecisaoDeNotificacao =
  | { tipo: "desativado" }
  /** Segue pela conexão principal do negócio (mesma regra do atendimento). */
  | { tipo: "principal" };

/** Interruptor da Central de Notificações do negócio. */
export function escolherConexaoDeNotificacao(input: { ativas: boolean }): DecisaoDeNotificacao {
  return input.ativas ? { tipo: "principal" } : { tipo: "desativado" };
}
