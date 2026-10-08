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
    etiqueta: "45 DIAS GRÁTIS · SEM CARTÃO",
    titulo: "Menos faltas na agenda.\nMais tempo para atender bem.",
    texto:
      "Lembrete automático por WhatsApp para cada cliente, agenda, clientes e caixa em um só lugar. Teste 45 dias com tudo liberado.",
    cta: "Começar agora",
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
    texto: "Veja quem está na cadeira, o próximo cliente e a ação que precisa acontecer.",
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
    etiqueta: "FEITO PARA BELEZA",
    titulo: "O mesmo Cortaí, adaptado ao seu tipo de negócio.",
    texto:
      "Escolha um segmento para ver os exemplos da página com a linguagem mais próxima da sua rotina.",
  },
  planos: {
    etiqueta: "PLANOS",
    titulo: "45 dias grátis com tudo liberado. Sem cartão. Depois, escolha o plano.",
    texto: "Preço fixo por plano, sem cobrança por profissional. Pague por Pix, boleto ou cartão.",
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
      resposta: "Sim, a partir do plano Conecta, usando a página e o WhatsApp do Cortaí.",
    },
    {
      pergunta: "O WhatsApp está em todos os planos?",
      resposta:
        "Durante o teste, sim. Depois, WhatsApp e lembretes automáticos ficam no Conecta e no Studio.",
    },
    {
      pergunta: "Preciso de cartão?",
      resposta:
        "Não. O teste de 45 dias não pede cartão. Se decidir assinar, você paga por Pix, boleto ou cartão.",
    },
    {
      pergunta: "O que acontece quando o teste acaba?",
      resposta:
        "Se você não assinar, a conta vira o plano Essencial gratuito. Nada é bloqueado e nenhum dado é apagado.",
    },
    {
      pergunta: "Posso cancelar?",
      resposta: "Sim, a qualquer momento, sem multa.",
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
    texto: "45 dias grátis com tudo liberado. Sem cartão.",
  },
};

export const SEO_APRESENTACAO_PADRAO = {
  titulo: "Cortaí — 45 dias grátis, sem cartão",
  descricao:
    "Lembrete automático por WhatsApp que reduz faltas, agenda, clientes e caixa para negócios de Beleza. Preço fixo por plano.",
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
