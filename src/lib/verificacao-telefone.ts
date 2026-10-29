/**
 * Confirmação do telefone no agendamento público — regras puras.
 *
 * Quem agenda com um WhatsApp que já tem ficha no negócio prova que o número é dele
 * mandando "CODIGO 123456" para o WhatsApp do negócio (o mesmo jeito que a equipe já
 * confirma o próprio número). A mensagem chegando daquele número é a prova; nada é
 * enviado pelo Flow, então não há modelo da Meta nem custo.
 */

/** Validade do código enviado. */
export const VALIDADE_DO_CODIGO_MS = 15 * 60_000;
/** Depois de confirmado, o telefone vale para agendar por este tempo. */
export const VALIDADE_DA_CONFIRMACAO_MS = 30 * 60_000;
export const MAX_TENTATIVAS_DO_CODIGO = 5;

/** "CODIGO 123456", "código: 123456" ou "cortai 123456" (o mesmo padrão da equipe). */
export const PADRAO_DO_CODIGO = /^\s*(?:c[oó]digo|cortai)\s*:?\s*(\d{6})\s*$/i;

export function textoDoCodigo(codigo: string): string {
  return `CODIGO ${codigo}`;
}

/** Link que abre o WhatsApp do negócio com o código já escrito. */
export function linkParaEnviarCodigo(numeroDoNegocio: string, codigo: string): string {
  const numero = numeroDoNegocio.replace(/\D/g, "");
  return `https://wa.me/${numero}?text=${encodeURIComponent(textoDoCodigo(codigo))}`;
}

export type LinhaDeVerificacao = {
  expira_em: string;
  tentativas: number;
  verificado_em: string | null;
};

/** Situação de um pedido de confirmação num instante. */
export function situacaoDaVerificacao(
  linha: LinhaDeVerificacao | null,
  agora = Date.now(),
): "confirmado" | "pendente" | "expirado" {
  if (!linha) return "expirado";
  if (linha.verificado_em)
    return agora - Date.parse(linha.verificado_em) < VALIDADE_DA_CONFIRMACAO_MS
      ? "confirmado"
      : "expirado";
  if (linha.tentativas >= MAX_TENTATIVAS_DO_CODIGO) return "expirado";
  return Date.parse(linha.expira_em) > agora ? "pendente" : "expirado";
}
