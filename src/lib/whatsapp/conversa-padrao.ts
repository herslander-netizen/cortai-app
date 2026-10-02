// Conversa Padrão de Excelência (docs/conversa-padrao.md).
// Textos padrão por situação; cada barbearia pode sobrescrever (config_atendimento_ia.textos_conversa)
// e desligar situações (config_atendimento_ia.situacoes_desligadas). Dados sempre por variável.
import { segmentoValido, type Segmento } from "@/lib/segmentos";

export const SITUACOES = {
  saudacao_nova: "Oi! Você está falando com {{barbearia}}. Como posso ajudar?",
  saudacao_conhecido:
    "Oi, {{nome}}! Tudo certo? Quer agendar o de sempre ({{ultimo_servico}} com {{ultimo_profissional}}) ou prefere outra coisa?",
  sem_dado: "Vou confirmar com a equipe e já te retorno.",
  agenda_cheia: "Esse dia está cheio. Posso ver outro dia pra você?",
  resumo_confirmacao:
    "Fechado: {{servico}} com {{profissional}}, {{dia_semana}} {{data}} às {{horario}}, {{valor}}. Confirma?",
  reclamacao: "Poxa, sinto muito por isso. Vou chamar alguém da equipe pra falar com você agora.",
  elogio: "Valeu demais, {{nome}}! Vou passar pra equipe.",
  humano: "Certo, vou chamar alguém da equipe. Já te respondem por aqui.",
  nao_entendeu:
    "Não entendi bem. Escolha uma opção:\n1. Agendar\n2. Ver meu horário\n3. Serviços e preços\n4. Falar com a equipe",
  parar: "Pronto, você não vai mais receber avisos. Se mudar de ideia, é só mandar VOLTAR.",
  fora_do_escopo: "Por aqui eu cuido de horários e informações da {{barbearia}}. Quer agendar?",
  dados_de_terceiros: "Por segurança, só passo informações do próprio número.",
  pagamento: "Aceitamos {{formas_pagamento}}. Pix: {{pix}}",
  localizacao: "Estamos em {{endereco}}.",
} as const;

export const NOTIFICACOES = {
  confirmacao:
    "✅ Horário confirmado! {{servico}} com {{profissional}}, {{dia_semana}} {{data}} às {{horario}}. Para remarcar ou cancelar, é só responder aqui.",
  lembrete_24h:
    "Oi, {{nome}}! Amanhã às {{horario}} você tem {{servico}} com {{profissional}}. Confirma?",
  horario_proximo: "Seu horário é às {{horario}}. Te esperamos! 📍 {{endereco}}",
  cancelamento:
    "Seu horário de {{dia_semana}} às {{horario}} foi cancelado. Quando quiser remarcar, é só chamar.",
  cancelado_pela_barbearia:
    "Precisamos cancelar seu horário de {{dia_semana}} às {{horario}} por um imprevisto. Desculpa! Quer que eu veja outro horário?",
  remarcacao: "🔄 Seu horário mudou para {{dia_semana}} {{data}} às {{horario}}.",
  vaga_lista_espera:
    "Abriu um horário {{dia_semana}} às {{horario}} com {{profissional}}. Quer pegar?",
  pos_atendimento: "Valeu pela visita, {{nome}}! 👊 Curtiu o resultado?",
  falta: "Sentimos sua falta hoje, {{nome}}. Quer remarcar?",
  retorno:
    "E aí, {{nome}}! Já faz {{dias}} dias do último corte. Quer que eu veja um horário com {{profissional}}?",
  valor_a_pagar:
    "Oi, {{nome}}! Passando pra lembrar que ficou {{valor}} a pagar. Quer que eu mande a chave Pix?",
  aniversario: "Feliz aniversário, {{nome}}! 🎉 {{beneficio}}",
} as const;

export type ChaveDeTexto = keyof typeof SITUACOES | keyof typeof NOTIFICACOES;

export const CONFIG_PADRAO = {
  tom: "descontraido",
  horariosPorVez: 3,
  toleranciaMin: 10,
  antecedenciaMin: 30,
  lembreteHoras: 24,
  horarioProximo: false,
  posAtendimentoHoras: 2,
  mensagemFalta: true,
  retornoDias: 30,
  valorAPagarDias: 7,
  aniversario: false,
} as const;

// Situações que dependem de recurso do plano.
export const RECURSO_DA_SITUACAO: Partial<Record<ChaveDeTexto, string>> = {
  aniversario: "fidelidade",
};

export type PersonalizacaoConversa = {
  textos?: Record<string, string> | null;
  desligadas?: string[] | null;
};

const PADRAO_BELEZA: Partial<Record<ChaveDeTexto, string>> = {
  pos_atendimento: "Foi um prazer te atender, {{nome}}! Gostou do resultado? ✨",
  elogio: "Que bom saber, {{nome}}! Vou passar pra equipe.",
  retorno:
    "Oi, {{nome}}! Já faz {{dias}} dias do seu último atendimento ({{ultimo_servico}}). Quer que eu veja um horário com {{profissional}}?",
};

/** Texto da situação: personalizado > padrão. null se a barbearia desligou. */
export function textoDaSituacao(
  chave: ChaveDeTexto,
  p?: PersonalizacaoConversa,
  segmento: Segmento = "barbearia",
): string | null {
  if (p?.desligadas?.includes(chave)) return null;
  const custom = p?.textos?.[chave]?.trim();
  if (custom) return custom;
  const porSegmento = segmentoValido(segmento) === "barbearia" ? null : PADRAO_BELEZA[chave];
  return (
    porSegmento ??
    (SITUACOES as Record<string, string>)[chave] ??
    (NOTIFICACOES as Record<string, string>)[chave] ??
    null
  );
}

/** Troca {{variavel}}. Variável sem dado vira null (nunca inventar). */
export function preencher(
  texto: string,
  vars: Record<string, string | number | null | undefined>,
): string | null {
  let faltou = false;
  const out = texto.replace(/\{\{(\w+)\}\}/g, (_, k: string) => {
    const v =
      vars[k] ??
      (k === "negocio" ? vars["barbearia"] : k === "barbearia" ? vars["negocio"] : undefined);
    if (v === null || v === undefined || v === "") {
      faltou = true;
      return "";
    }
    return String(v);
  });
  return faltou ? null : out;
}

/** Máximo de 1 emoji por mensagem (princípio 8). */
export function limitarEmojis(texto: string): string {
  let visto = false;
  return texto
    .replace(/\p{Extended_Pictographic}\uFE0F?/gu, (e) => {
      if (visto) return "";
      visto = true;
      return e;
    })
    .replace(/ {2,}/g, " ")
    .trim();
}

/** Resposta final: texto da situação preenchido; sem dado → "Vou confirmar com a equipe". */
export function responder(
  chave: ChaveDeTexto,
  vars: Record<string, string | number | null | undefined>,
  p?: PersonalizacaoConversa,
  segmento: Segmento = "barbearia",
): { texto: string; precisaHumano: boolean } | null {
  const base = textoDaSituacao(chave, p, segmento);
  if (base === null) return null;
  const pronto = preencher(base, vars);
  if (pronto === null) return { texto: SITUACOES.sem_dado, precisaHumano: true };
  return { texto: limitarEmojis(pronto), precisaHumano: false };
}
