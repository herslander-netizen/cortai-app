import { z } from "zod";

/**
 * Conteúdo editável da Home pública oficial (/apresentacao).
 * O admin grava este objeto dentro da configuração da Home pública; se nada
 * estiver publicado, vale o padrão abaixo (o texto aprovado).
 */

const bloco = z.object({
  etiqueta: z.string().trim().max(80).default(""),
  titulo: z.string().trim().min(1).max(160),
  texto: z.string().trim().max(400).default(""),
});

const pergunta = z.object({
  pergunta: z.string().trim().min(1).max(160),
  resposta: z.string().trim().min(1).max(500),
});

export const esquemaApresentacao = z.object({
  hero: z.object({
    etiqueta: z.string().trim().max(80),
    titulo: z.string().trim().min(1).max(200),
    texto: z.string().trim().max(400),
    cta: z.string().trim().min(1).max(40),
  }),
  agenda: bloco,
  foco: bloco,
  clientes: bloco,
  secretaria: bloco,
  recursos: bloco,
  caixa: bloco,
  segmentos: bloco,
  planos: bloco,
  duvidas: bloco,
  perguntas: z.array(pergunta).min(1).max(10),
  final: bloco,
});

export type ConteudoApresentacao = z.infer<typeof esquemaApresentacao>;
export type ChaveBloco = Exclude<keyof ConteudoApresentacao, "hero" | "perguntas">;

export const APRESENTACAO_PADRAO: ConteudoApresentacao = {
  hero: {
    etiqueta: "GRÁTIS ATÉ 50 AGENDAMENTOS POR MÊS",
    titulo: "Sua agenda cheia.\nSeu negócio crescendo.",
    texto: "Clientes marcam sozinhos e recebem lembrete no WhatsApp.",
    cta: "Começar grátis",
  },
  agenda: {
    etiqueta: "MENOS FALTAS",
    titulo: "O lembrete vai sozinho pelo WhatsApp.",
    texto:
      "Antes de cada horário o cliente recebe um aviso e confirma com um toque. Você não precisa mandar mensagem.",
  },
  foco: {
    etiqueta: "MODO FOCO",
    titulo: "O que importa agora, sem tirar o foco do atendimento.",
    texto: "Veja os atendimentos em andamento, o próximo horário e a ação que precisa acontecer.",
  },
  clientes: {
    etiqueta: "CLIENTES",
    titulo: "Cada atendimento constrói um relacionamento.",
    texto: "Histórico, preferências e frequência ficam organizados para o próximo encontro.",
  },
  secretaria: {
    etiqueta: "WHATSAPP CORTAÍ",
    titulo: "Enquanto você atende, seu WhatsApp cuida dos agendamentos.",
    texto:
      "Uma experiência clara para o cliente escolher atendimento, profissional, dia e horário.",
  },
  recursos: {
    etiqueta: "RECURSOS",
    titulo: "Tudo o que você precisa para cuidar do seu negócio.",
    texto:
      "O principal: lembrete automático por WhatsApp antes de cada horário, para o cliente não esquecer e a agenda não ficar vazia.",
  },
  caixa: {
    etiqueta: "COMANDA E CAIXA",
    titulo: "Do atendimento ao pagamento, sem perder o contexto.",
    texto: "",
  },
  segmentos: {
    etiqueta: "FEITO PARA NEGÓCIOS DE SERVIÇOS",
    titulo: "O mesmo Flow, adaptado ao seu tipo de negócio.",
    texto:
      "Escolha um segmento para ver os exemplos da página com a linguagem mais próxima da sua rotina.",
  },
  planos: {
    etiqueta: "PLANOS",
    titulo: "Comece grátis. Cresça quando precisar.",
    texto: "Pix, boleto ou cartão. Cancele quando quiser.",
  },
  duvidas: { etiqueta: "DÚVIDAS", titulo: "Antes de começar.", texto: "" },
  perguntas: [
    {
      pergunta: "O Flow funciona no celular?",
      resposta: "Sim, no celular e no computador.",
    },
    {
      pergunta: "O WhatsApp está em todos os planos?",
      resposta: "Sim, no Essencial grátis e no Studio.",
    },
    {
      pergunta: "Preciso de cartão?",
      resposta:
        "Não. O Essencial é grátis. No Studio você paga por Pix, boleto ou cartão e cancela quando quiser.",
    },
    {
      pergunta: "O que acontece se eu passar de 50 agendamentos?",
      resposta: "Nada é apagado. Para seguir recebendo no mês, assine o Studio.",
    },
    {
      pergunta: "Quais tipos de negócio podem usar o Flow?",
      resposta:
        "O Flow é uma plataforma de gestão e agendamento para negócios de serviços. Beleza, barbearia e outras áreas podem configurar seus próprios serviços, equipe e horários; a experiência acompanha o segmento escolhido, sem limitar a plataforma a uma única área.",
    },
  ],
  final: {
    etiqueta: "",
    titulo: "Seu negócio pode ser mais simples.",
    texto: "Grátis, sem cartão.",
  },
};

export const SEO_APRESENTACAO_PADRAO = {
  titulo: "Flow. Sua agenda cheia, seu negócio crescendo.",
  descricao:
    "Organize seus clientes, serviços e finanças em um só lugar. Automatize lembretes pelo WhatsApp e tenha mais tempo para cuidar do seu negócio.",
};

/** Campos ausentes ou inválidos caem no texto aprovado. */
export function normalizarApresentacao(bruto: unknown): ConteudoApresentacao {
  const r = esquemaApresentacao.safeParse(bruto);
  if (r.success) return r.data;
  if (!bruto || typeof bruto !== "object") return APRESENTACAO_PADRAO;
  const d = bruto as Record<string, unknown>;
  const saida: Record<string, unknown> = { ...APRESENTACAO_PADRAO };
  for (const chave of Object.keys(APRESENTACAO_PADRAO) as (keyof ConteudoApresentacao)[]) {
    const campo = esquemaApresentacao.shape[chave].safeParse(d[chave]);
    if (campo.success) saida[chave] = campo.data;
  }
  return saida as ConteudoApresentacao;
}
