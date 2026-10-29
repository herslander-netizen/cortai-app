import { NOVIDADES } from "./novidades";
import { urlPublica } from "@/lib/origem-publica";
/**
 * Controle de versão do aplicativo.
 *
 * A versão instalada é gravada no pacote enviado ao navegador. O arquivo
 * público `/versao.json` diz qual é a versão publicada e qual é a mínima
 * aceita. Enquanto a mínima for igual à atual, ninguém é bloqueado — só o
 * administrador decide tornar uma atualização obrigatória, subindo a mínima.
 */

/** Versão embutida nesta build. Fonte única de verdade. */
export const VERSAO_INSTALADA = "3.6.0";

/** Alias público da versão do aplicativo. */
export const APP_VERSION = VERSAO_INSTALADA;

/** Nome curto exibido na interface. */
export const VERSAO_EXIBICAO = `Flow · v${APP_VERSION}`;

/** Para onde mandamos quem precisa atualizar. */
export const URL_DE_ATUALIZACAO = urlPublica("");

export type InfoDeVersao = { atual: string; minima: string; url: string };

export type TipoDeVersao = "major" | "minor" | "patch";

export type ItemDoChangelog = {
  versao: string;
  data: string;
  tipo: TipoDeVersao;
  titulo: string;
  descricao: string;
  funcionalidades: string[];
  visual: string[];
  tecnico: string[];
  correcoes: string[];
};

/** Histórico oficial de versões do Flow (do mais novo para o mais antigo). */
export const CHANGELOG: ItemDoChangelog[] = [
  {
    versao: "3.0.0",
    data: "2026-10-03",
    tipo: "major",
    titulo: "Flow 3.0",
    descricao: "Agenda nova, visual mais leve e um Flow para todo negócio de beleza.",
    funcionalidades: [...NOVIDADES],
    visual: ["Novo fundo neutro no modo claro e escuro."],
    tecnico: ["Novidades centralizadas em src/lib/novidades.ts."],
    correcoes: [],
  },
  {
    versao: "2.0.0",
    data: "2026-09-23",
    tipo: "major",
    titulo: "Flow 2.0",
    descricao:
      "Novo conceito, nova identidade e nova página inicial: o lugar onde sua barbearia acontece.",
    funcionalidades: [
      "Nova página inicial editorial com os quatro pilares: operar, aparecer, fazer voltar e crescer.",
      "Apresentação da identidade própria de cada barbearia e da experiência do cliente.",
      "Sistema oficial de versão, changelog e tela Sobre o Flow.",
      "Novidades da versão apresentadas uma única vez ao entrar.",
    ],
    visual: [
      "Nova identidade visual.",
      "Novo sistema de cores: ink, paper, stone, gold, sage e clay.",
      "Tipografia Manrope e cantos mais suaves (12 a 18px).",
      "Fotografia editorial de barbearia no lugar de imagens genéricas.",
    ],
    tecnico: [
      "Versão centralizada em src/lib/versao.ts e publicada em /versao.json.",
      "Nenhuma migração de banco, RPC ou regra de permissão alterada.",
    ],
    correcoes: ["Versão exibida no app estava presa em 1.0.0 mesmo após novas entregas."],
  },
  {
    versao: "1.7.0",
    data: "2026-09-23",
    tipo: "minor",
    titulo: "Movimento, resposta ao toque e avisos",
    descricao: "Central de avisos, respostas imediatas ao toque e transições suaves.",
    funcionalidades: ["Central de avisos com sino, tempo real e preferências por tipo."],
    visual: ["Transições de página, listas em cascata e números animados."],
    tecnico: ["Tabelas novas de avisos e preferências, com isolamento por barbearia."],
    correcoes: [],
  },
  {
    versao: "1.6.0",
    data: "2026-09-23",
    tipo: "minor",
    titulo: "Painel de controle da operação",
    descricao: "O Início virou centro de controle: hoje, atenção, próximos movimentos e agenda.",
    funcionalidades: ["Leitura única agregada do dia com permissões verificadas no servidor."],
    visual: ["Blocos, métricas e estados de carregamento, vazio e erro."],
    tecnico: ["Motor determinístico de oportunidades, sem custo de IA."],
    correcoes: ["Agendamentos confirmados não apareciam na lista."],
  },
];

export const VERSAO_ATUAL_INFO = CHANGELOG[0]!;

function partes(versao: string): number[] {
  return versao
    .trim()
    .split(".")
    .map((p) => Number.parseInt(p, 10) || 0);
}

/** -1 se a < b, 0 se iguais, 1 se a > b. */
export function compararVersoes(a: string, b: string): number {
  const pa = partes(a);
  const pb = partes(b);
  const tamanho = Math.max(pa.length, pb.length);
  for (let i = 0; i < tamanho; i += 1) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}

/** Lê o arquivo público de versão. Devolve null quando não dá para saber. */
export async function buscarVersaoPublicada(): Promise<InfoDeVersao | null> {
  try {
    const resposta = await fetch(`/versao.json?t=${Date.now()}`, { cache: "no-store" });
    if (!resposta.ok) return null;
    const bruto = (await resposta.json()) as Partial<InfoDeVersao>;
    if (typeof bruto.atual !== "string" || typeof bruto.minima !== "string") return null;
    return {
      atual: bruto.atual,
      minima: bruto.minima,
      url: typeof bruto.url === "string" && bruto.url ? bruto.url : URL_DE_ATUALIZACAO,
    };
  } catch {
    return null;
  }
}

export type SituacaoDaVersao = "em_dia" | "recomendada" | "obrigatoria";

export function situacaoDaVersao(
  info: InfoDeVersao,
  instalada = VERSAO_INSTALADA,
): SituacaoDaVersao {
  if (compararVersoes(instalada, info.minima) < 0) return "obrigatoria";
  if (compararVersoes(instalada, info.atual) < 0) return "recomendada";
  return "em_dia";
}
