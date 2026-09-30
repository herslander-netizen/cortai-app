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
    etiqueta: "PARA BARBEARIAS, SALÕES E PROFISSIONAIS",
    titulo: "Mais organização para o seu negócio.\nMais tempo para atender bem.",
    texto:
      "Agenda, clientes, caixa e uma Secretária que ajuda a cuidar dos seus agendamentos. Tudo em um só lugar.",
    cta: "Começar agora",
  },
  agenda: {
    etiqueta: "O DIA COMEÇA AQUI",
    titulo: "Tudo começa pela agenda.",
    texto: "O Cortaí reúne o que acontece antes, durante e depois de cada atendimento.",
  },
  foco: {
    etiqueta: "MODO FOCO",
    titulo: "O que importa agora, sem tirar o foco do atendimento.",
    texto: "Veja quem está na cadeira, o próximo cliente e a ação que precisa acontecer.",
  },
  clientes: {
    etiqueta: "CLIENTES",
    titulo: "Cada atendimento constrói um relacionamento.",
    texto: "Histórico, preferências e frequência ficam organizados para o próximo encontro.",
  },
  secretaria: {
    etiqueta: "SECRETÁRIA CORTAÍ",
    titulo: "Enquanto você atende, sua Secretária cuida dos agendamentos.",
    texto:
      "Uma experiência clara para o cliente escolher atendimento, profissional, dia e horário.",
  },
  recursos: {
    etiqueta: "RECURSOS",
    titulo: "Tudo o que você precisa para cuidar do seu negócio.",
    texto: "",
  },
  caixa: {
    etiqueta: "COMANDA E CAIXA",
    titulo: "Do atendimento ao pagamento, sem perder o contexto.",
    texto: "",
  },
  segmentos: {
    etiqueta: "FEITO PARA BELEZA",
    titulo: "O mesmo Cortaí, adaptado ao seu tipo de negócio.",
    texto:
      "Escolha um segmento para ver os exemplos da página com a linguagem mais próxima da sua rotina.",
  },
  planos: {
    etiqueta: "PLANOS",
    titulo: "Escolha como começar.",
    texto: "Planos mensais por profissional. Secretária e WhatsApp entram a partir do Conecta.",
  },
  duvidas: { etiqueta: "DÚVIDAS", titulo: "Antes de começar.", texto: "" },
  perguntas: [
    {
      pergunta: "O Cortaí funciona no celular?",
      resposta:
        "Sim. A experiência é pensada para acompanhar a rotina do negócio no celular e também funciona no computador.",
    },
    {
      pergunta: "Meus clientes podem agendar sozinhos?",
      resposta: "Sim, a partir do plano Conecta, usando a página e a Secretária Cortaí.",
    },
    {
      pergunta: "O WhatsApp está em todos os planos?",
      resposta:
        "Não. WhatsApp, Secretária e confirmações automáticas estão disponíveis no Conecta e no Equipe.",
    },
    {
      pergunta: "Serve apenas para barbearias?",
      resposta:
        "Não. O Cortaí atende barbearias, salões, nail designers, estética e outros profissionais de Beleza.",
    },
  ],
  final: {
    etiqueta: "",
    titulo: "Seu negócio pode ser mais simples.",
    texto: "Organize a rotina e tenha mais tempo para atender bem.",
  },
};

export const SEO_APRESENTACAO_PADRAO = {
  titulo: "Cortaí — Mais organização para o seu negócio",
  descricao:
    "Agenda, clientes, caixa e Secretária em um só lugar para organizar negócios e profissionais de Beleza.",
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
