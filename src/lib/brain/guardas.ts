/**
 * Guardas puras do cérebro CortAI (sem rede, testáveis).
 */
import { normalizarTexto } from "@/lib/conversa/entender";

const PEDIDOS_NOCIVOS = [
  /ignor\w* (as |todas as |suas )?(instruc|regras)/,
  /(mostr|revel|repet|imprim)\w* (o |seu |suas )?(prompt|instruc|regras internas)/,
  /\bsystem prompt\b|\bprompt (do sistema|interno)\b/,
  /\b(api key|chave (da api|secreta)|token de acesso|senha do banco|service role)\b/,
  /\b(drop table|delete from|select \* from|truncate|insert into)\b/,
  /\b(outr[oa]s? (negocio|empresa|barbearia|salao)s?|todos os clientes de)\b/,
  /\bmodo (desenvolvedor|dev|jailbreak)\b|\bjailbreak\b|\bdan mode\b/,
];

export const RESPOSTA_RECUSA =
  "Não consigo ajudar com isso. Posso te ajudar com serviços, horários e agendamentos deste negócio.";

/** Pedido que tenta extrair instruções, segredos ou dados de outros negócios. */
export function pedidoNocivo(texto: string): boolean {
  const t = normalizarTexto(texto);
  return PEDIDOS_NOCIVOS.some((r) => r.test(t));
}

/** Confirmação inequívoca para executar a ação pendente. */
export function confirmacaoInequivoca(texto: string): boolean {
  const t = normalizarTexto(texto);
  return /^(sim|s|ss|isso|isso mesmo|pode|pode sim|pode ser|confirmo|confirmar|confirma|confirmado|ok|okay|beleza|blz|fechado|fechou|certo|bora|perfeito|pode marcar|pode cancelar|pode remarcar)( por favor| pfv| obrigad[oa])?$/.test(
    t,
  );
}

export function recusaInequivoca(texto: string): boolean {
  const t = normalizarTexto(texto);
  return /^(nao|n|nao quero|agora nao|cancela isso|deixa|esquece|desisto)$/.test(t);
}

/** Uma ação pendente vale por 15 minutos. */
export function pendenteValida(criadaEm: string | undefined, agora = Date.now()): boolean {
  if (!criadaEm) return false;
  const t = Date.parse(criadaEm);
  return Number.isFinite(t) && agora - t <= 15 * 60_000;
}

/** Mensagem que é só um número: nunca confirma nem recusa ação da IA. */
export function ehNumeroSolto(texto: string): boolean {
  return /^\s*\d{1,2}[.)!]?\s*$/.test(texto);
}

export const TEXTO_PEDIR_SIM_OU_NAO =
  "Para eu continuar, responda SIM para confirmar ou NÃO para desistir.";

const AFIRMA_CONCLUSAO = [
  /\bobrigad[oa] por (confirmar|remarcar|cancelar)/,
  /\b(confirmei|agendei|marquei|cancelei|remarquei|reagendei|registrei)\b/,
  /\b(presenca|horario|agendamento|atendimento|reserva|vaga)\b[^.!?\n]{0,30}\b(foi|ficou|esta|está)\s+(confirmad|agendad|marcad|cancelad|remarcad|reagendad)/,
  /\b(confirmad|agendad|marcad|cancelad|remarcad|reagendad)[oa]s? com sucesso\b/,
  /^(pronto|feito|perfeito|certo|tudo certo)\b[^\n]{0,40}\b(confirmad|agendad|marcad|cancelad|remarcad|reagendad)/,
  /\b(ja|já) (esta|está|foi|ficou) (confirmad|agendad|marcad|cancelad|remarcad)/,
];

/** O texto afirma que uma ação de agenda foi concluída? */
export function afirmaConclusao(texto: string): boolean {
  const t = normalizarTexto(texto);
  return AFIRMA_CONCLUSAO.some((r) => r.test(t));
}

export const TEXTO_SEM_ACAO_CONCLUIDA =
  "Ainda não registrei nenhuma alteração no seu horário. Me diga o que você quer fazer que eu verifico.";

/**
 * Barreira de saída: a IA nunca é a autoridade sobre uma ação concluída.
 * Se o texto dela afirma conclusão, ele é trocado por um texto fixo honesto.
 */
export function barrarAfirmacaoSemAcao(texto: string, resumoPendente: string | null): string {
  if (!afirmaConclusao(texto)) return texto;
  return resumoPendente ? `${resumoPendente} Posso confirmar?` : TEXTO_SEM_ACAO_CONCLUIDA;
}

/** Textos fixos do resultado real de uma ação confirmada. */
export function textoDoResultado(
  resultado: { sucesso: true; resumo: string } | { sucesso: false; resumo: string; motivo: string },
): string {
  if (resultado.sucesso) return `Pronto ✅ Concluído: ${resultado.resumo}`;
  return `Não consegui concluir: ${resultado.resumo} Motivo: ${resultado.motivo} Nada foi alterado. Quer tentar de outro jeito?`;
}

export const TEXTO_RECUSA_DA_PENDENTE = "Tudo bem, não alterei nada. Como prefere seguir?";
