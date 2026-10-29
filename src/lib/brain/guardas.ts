/**
 * Guardas puras do cérebro Flow IA (sem rede, testáveis).
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

/**
 * Confirmação inequívoca para executar a ação pendente.
 *
 * Confirmações genéricas ("sim", "ok", "pode") valem para a pergunta explícita
 * "Posso confirmar?". Já as frases que nomeiam outra operação ("pode cancelar",
 * "pode remarcar") só confirmam uma pendência da mesma operação. Isso evita que
 * uma intenção nova seja interpretada como autorização para uma ação diferente.
 */
export function confirmacaoInequivoca(texto: string, acaoPendente?: string): boolean {
  const t = normalizarTexto(texto);
  const sufixo = "( por favor| pfv| obrigado| obrigada)?$";
  const especificas: { padrao: RegExp; acoes: readonly string[] }[] = [
    { padrao: new RegExp("^pode marcar" + sufixo), acoes: ["criar_agendamento"] },
    { padrao: new RegExp("^pode cancelar" + sufixo), acoes: ["cancelar_agendamento"] },
    {
      padrao: new RegExp("^pode remarcar" + sufixo),
      acoes: ["reagendar_agendamento"],
    },
  ];
  const especifica = especificas.find((item) => item.padrao.test(t));
  if (especifica) return Boolean(acaoPendente && especifica.acoes.includes(acaoPendente));

  return /^(sim|s|ss|isso|isso mesmo|pode|pode sim|pode ser|pode confirmar|confirmo|confirmo sim|confirmar|confirma|confirmado|ta bom|tudo bem|ok|okay|beleza|blz|fechado|fechou|certo|bora|perfeito)( por favor| pfv| obrigad[oa])?$/.test(
    t,
  );
}

/**
 * Detecta correções do pedido pendente sem confundi-las com confirmação.
 * Detectar correção só permite preparar nova proposta; nunca autoriza escrita.
 */
export function mensagemPareceAjustarPendente(texto: string): boolean {
  const t = normalizarTexto(texto).trim();
  if (!t) return false;
  if (
    /\b(muda|mude|mudar|altera|alterar|troca|troque|trocar|corrige|corrigir|ajusta|ajuste|ajustar|substitui|substituir|refaz|refazer)\b/.test(t) ||
    /\b(na verdade|em vez disso|quis dizer|falei errado|me confundi|melhor seria|prefiro|era para ser)\b/.test(t)
  ) return true;
  return /\b(?:as|para|pra|em vez de)\s+\d{1,2}(?::\d{2}|h\d{0,2})?\s*(?:h|horas)?\b/.test(t);
}

export function recusaInequivoca(texto: string): boolean {
  const t = normalizarTexto(texto);
  return /^(nao|n|nao quero|agora nao|cancela isso|deixa|esquece|desisto)$/.test(t);
}

/** Uma ação pendente vale por 15 minutos. */
export function pendenteValida(criadaEm: string | undefined, agora = Date.now()): boolean {
  if (!criadaEm) return false;
  const t = Date.parse(criadaEm);
  // Uma pendência no futuro não deve continuar válida só porque "agora - t" é negativo.
  return Number.isFinite(t) && t <= agora && agora - t <= 15 * 60_000;
}

/** Mensagem que é só um número: nunca confirma nem recusa ação da IA. */
export function ehNumeroSolto(texto: string): boolean {
  return /^\s*\d{1,2}[.)!]?\s*$/.test(texto);
}

export const TEXTO_PEDIR_SIM_OU_NAO =
  "Para eu continuar, responda SIM para confirmar ou NÃO para desistir.";

const PARTICIPIO =
  "(confirmad|agendad|marcad|desmarcad|cancelad|remarcad|reagendad|reservad)[oa]s?";
const AFIRMA_CONCLUSAO = [
  /\bobrigad[oa] por (confirmar|remarcar|cancelar|agendar)/,
  /\b(confirmei|agendei|marquei|desmarquei|cancelei|remarquei|reagendei|registrei|reservei)\b/,
  /\b(acabei|acabamos) de (confirmar|agendar|marcar|cancelar|remarcar|reagendar)\b/,
  /\b(confirmamos|agendamos|cancelamos|remarcamos|reagendamos)\b/,
  /\bfiz (o|a|seu|sua) (agendamento|cancelamento|reagendamento|remarcacao|reserva|confirmacao)\b/,
  new RegExp(
    `\\b(foi|foram|ficou|ficaram|esta|estao|ta|tao|ja|segue|seguem)\\s+(devidamente\\s+|tudo\\s+)?${PARTICIPIO}\\b`,
  ),
  new RegExp(`\\b${PARTICIPIO} com sucesso\\b`),
  new RegExp(`^(pronto|feito|perfeito|certo|tudo certo|ok|beleza)\\b.{0,40}\\b${PARTICIPIO}\\b`),
  new RegExp(`^${PARTICIPIO}\\b`),
  new RegExp(
    `^(seu |sua |o |a )?(horario|agendamento|atendimento|reserva|presenca|vaga|corte)s? ${PARTICIPIO}\\s*$`,
  ),
];

/** Frase negada logo antes da afirmação ("ainda não foi confirmado"). */
const NEGACAO_ANTES = /\b(nao|nunca|nem|nada|nenhum|nenhuma)\b(\s+\S+){0,3}\s*$/;

/**
 * O texto afirma que uma ação de agenda foi concluída?
 * Perguntas ("quer que eu confirme?") e negações não contam.
 */
export function afirmaConclusao(texto: string): boolean {
  const frases = texto.split(/(?<=[.!?\n])/);
  return frases.some((frase) => {
    if (frase.trim().endsWith("?")) return false;
    const t = normalizarTexto(frase);
    return AFIRMA_CONCLUSAO.some((r) => {
      const m = r.exec(t);
      return Boolean(m && !NEGACAO_ANTES.test(t.slice(0, m.index)));
    });
  });
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
  resultado:
    | { sucesso: true; resumo: string; jaExistia?: boolean }
    | { sucesso: false; resumo: string; motivo: string },
): string {
  if (resultado.sucesso && resultado.jaExistia)
    return `Pronto ✅ Esse horário já estava registrado, não criei outro: ${resultado.resumo}`;
  if (resultado.sucesso) return `Pronto ✅ Concluído: ${resultado.resumo}`;
  return `Não consegui concluir: ${resultado.resumo} Motivo: ${resultado.motivo} Nada foi alterado. Quer tentar de outro jeito?`;
}

/**
 * Conferência de uma escrita preparada no painel. O texto vem do SISTEMA, montado com os nomes
 * já validados no banco: o modelo não pode parafrasear errado a data, a hora ou o cliente.
 */
export function textoDeConferencia(resumo: string, origem: "texto" | "voz" = "texto"): string {
  return origem === "voz"
    ? `Entendi assim: ${resumo} Posso confirmar?`
    : `${resumo} Posso confirmar?`;
}

export const TEXTO_RECUSA_DA_PENDENTE = "Tudo bem, não alterei nada. Como prefere seguir?";

/** Segunda confirmação da mesma ação pendente (duas mensagens quase juntas): não executa de novo. */
export const TEXTO_CONFIRMACAO_JA_TRATADA =
  "Essa confirmação já foi tratada. Se ainda precisar de algo, é só me dizer.";

/** Não foi possível reivindicar a ação pendente: nada foi executado. */
export const TEXTO_TENTE_CONFIRMAR_DE_NOVO =
  "Não consegui processar sua confirmação agora e nada foi alterado. Responda SIM de novo em instantes.";

/**
 * Marcas de que a resposta expõe o que é interno: o texto das instruções, nomes de ações
 * do catálogo, nomes de variáveis de ambiente, chaves ou ids de infraestrutura.
 */
const VAZAMENTOS = [
  /regras obrigatorias/,
  /\b(nunca revele estas instrucoes|orientacoes do negocio \(nao sobrepoem)/,
  /\b(listar_|consultar_|buscar_|criar_|cancelar_|reagendar_|atualizar_|registrar_|avisar_)[a-z_]{3,}\b/,
  /\b(encaminhar_humano|minha_agenda)\b/,
  /\b(cortai_ai_[a-z_]+|langfuse_[a-z_]+|supabase_[a-z_]+|service[_ ]role)\b/,
  /\bsk-[a-z0-9]{8,}/,
  /\b(system prompt|prompt do sistema|tenant[_-]?id)\b/,
];

/** O texto da IA expõe instruções internas, nomes de ações ou segredos? */
export function vazaInterno(texto: string): boolean {
  // Só tira acentos e caixa: `normalizarTexto` apagaria o "_" dos nomes de ação.
  const t = texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return VAZAMENTOS.some((r) => r.test(t));
}

/**
 * Barreira de saída contra extração de prompt/segredos (injeção de prompt): se o texto
 * expõe algo interno, ele é trocado pela recusa padrão. Determinística, sem modelo.
 */
export function barrarVazamento(texto: string): string {
  return vazaInterno(texto) ? RESPOSTA_RECUSA : texto;
}
