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
  return /^(sim|s|ss|isso|isso mesmo|pode|pode sim|pode ser|confirmo|confirmar|confirma|confirmado|ok|okay|beleza|blz|fechado|fechou|certo|bora|perfeito|pode marcar|pode cancelar|pode remarcar|1)( por favor| pfv| obrigad[oa])?$/.test(
    t,
  );
}

export function recusaInequivoca(texto: string): boolean {
  const t = normalizarTexto(texto);
  return /^(nao|n|nao quero|agora nao|cancela isso|deixa|esquece|desisto|2)$/.test(t);
}

/** Uma ação pendente vale por 15 minutos. */
export function pendenteValida(criadaEm: string | undefined, agora = Date.now()): boolean {
  if (!criadaEm) return false;
  const t = Date.parse(criadaEm);
  return Number.isFinite(t) && agora - t <= 15 * 60_000;
}
