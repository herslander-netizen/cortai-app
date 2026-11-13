/**
 * Origem apresentada na Central. Nunca deduzir autoria por conteúdo da mensagem.
 *
 * Antes do deploy do PR #72, o Flow registrava TODO envio não-IA com
 * gerada_por_humano=true, inclusive as respostas determinísticas do Flow Bot.
 * A correção (Actions #43384731949) foi publicada na prévia em 13/11/2026,
 * 07:20:35 UTC. Registros históricos sem autor confiável são INDETERMINADOS.
 *
 * Essa classificação não altera o banco e não atribui retroativamente uma
 * resposta à equipe sem evidência. fromMe posterior ao deploy é marcado
 * gerada_por_humano=true pelo webhook após checagem do eco do próprio Flow.
 */
export const DEPLOY_CORRECAO_AUTORIA_WHATSAPP = "2026-11-13T07:20:35.000Z";

export type OrigemDaMensagem =
  | "cliente"
  | "equipe"
  | "flow_ia"
  | "automacao"
  | "nao_confirmada";

export function origemDaMensagem(input: {
  direcao: string | null;
  gerada_por_ia: boolean | null;
  gerada_por_humano: boolean | null;
  autor_user_id?: string | null;
  criado_em: string | null;
}): OrigemDaMensagem {
  if (input.direcao !== "saida") return "cliente";
  if (input.gerada_por_ia === true) return "flow_ia";
  // Envio manual pelo painel tem um autor autenticado explícito.
  if (input.autor_user_id && input.gerada_por_humano === true) return "equipe";
  if (input.gerada_por_humano !== true) return "automacao";

  const criado = input.criado_em ? Date.parse(input.criado_em) : NaN;
  const correcao = Date.parse(DEPLOY_CORRECAO_AUTORIA_WHATSAPP);
  if (!Number.isFinite(criado) || criado < correcao) return "nao_confirmada";
  return "equipe";
}
