import type { Conferencia } from "@/lib/brain/conferencia";
import type { OpcaoDeEscolha } from "@/lib/brain/escolha-de-cliente";
/**
 * Contrato do assistente da Flow IA — seguro para o navegador (só tipos e rótulos).
 *
 * A resposta do modelo é sempre estruturada: texto para a pessoa ler, intenção,
 * ação sugerida com parâmetros e se precisa de confirmação antes de gravar.
 */

export type IntencaoDaIA =
  "conversa" | "cadastrar_servicos" | "definir_horarios" | "navegar" | "consultar" | "ajuda";

export type ServicoSugerido = {
  nome: string;
  categoria: string;
  duracaoMin: number;
  precoCentavos: number;
  /** Prazo sugerido para o cliente voltar (dias); ausente = prazo geral. */
  retornoDias?: number;
};

export type HorarioSugerido = {
  /** 0 = domingo … 6 = sábado */
  diaSemana: number;
  fechado: boolean;
  abre: string;
  fecha: string;
  /** Intervalo opcional (ex.: almoço), em HH:MM. */
  intervaloInicio?: string | null;
  intervaloFim?: string | null;
};

export type RespostaDoAssistente = {
  resposta: string;
  intencao: IntencaoDaIA;
  precisaConfirmar: boolean;
  perguntaDeConfirmacao: string | null;
  /** Rota interna sugerida, ex.: "/barbeiro/servicos". */
  destino: string | null;
  rotuloDoDestino: string | null;
  servicos: ServicoSugerido[] | null;
  horarios: HorarioSugerido[] | null;
  /** false quando a IA não está disponível neste ambiente. */
  disponivel: boolean;
  /** Opções para escolher na tela (ex.: dois clientes com o mesmo nome). */
  opcoes?: OpcaoDeEscolha[] | null;
  /** Escrita preparada que espera o toque em "Confirmar" (o texto é o resumo conferido). */
  aguardandoConfirmacao?: { resumo: string } | null;
  /** Verificações do pedido (o que foi conferido) e o veredito, para a pessoa ver. */
  conferencia?: Conferencia | null;
};

export const DIAS_DA_SEMANA = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
] as const;

export const DIAS_CURTOS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;

/** Padrão sugerido na configuração inicial: Seg–Sáb, 09:00 às 19:00. */
export function horariosPadrao(): HorarioSugerido[] {
  return [0, 1, 2, 3, 4, 5, 6].map((diaSemana) => ({
    diaSemana,
    fechado: diaSemana === 0,
    abre: "09:00",
    fecha: "19:00",
  }));
}

export const SERVICOS_SUGERIDOS: ServicoSugerido[] = [
  { nome: "Corte", categoria: "Cabelo", duracaoMin: 30, precoCentavos: 3500 },
  { nome: "Barba", categoria: "Barba", duracaoMin: 30, precoCentavos: 2500 },
  { nome: "Corte + Barba", categoria: "Combo", duracaoMin: 45, precoCentavos: 5000 },
  { nome: "Sobrancelha", categoria: "Acabamento", duracaoMin: 15, precoCentavos: 1500 },
  { nome: "Pigmentação", categoria: "Química", duracaoMin: 30, precoCentavos: 3000 },
];

/** Mensagem honesta quando não há credencial de IA no ambiente. */
export function respostaIndisponivel(texto?: string): RespostaDoAssistente {
  return {
    resposta:
      texto ??
      "A Flow IA ainda não está ligada neste ambiente. Enquanto isso, posso te levar direto para a tela certa: serviços, horários ou fila.",
    intencao: "ajuda",
    precisaConfirmar: false,
    perguntaDeConfirmacao: null,
    destino: null,
    rotuloDoDestino: null,
    servicos: null,
    horarios: null,
    disponivel: false,
  };
}

/** Rotas que a IA pode sugerir — nada fora desta lista chega à tela. */
export const DESTINOS_PERMITIDOS: Record<string, string> = {
  "/barbeiro": "Abrir o início",
  "/barbeiro/agenda": "Abrir a agenda",
  "/barbeiro/fila": "Abrir a fila",
  "/barbeiro/clientes": "Abrir clientes",
  "/barbeiro/servicos": "Ir para serviços",
  "/barbeiro/horarios": "Abrir horários",
  "/barbeiro/caixa": "Abrir o caixa",
  "/barbeiro/financeiro": "Abrir o financeiro",
  "/barbeiro/fidelidade": "Abrir o Voltaí",
  "/barbeiro/marca": "Abrir a marca",
  "/barbeiro/equipe": "Abrir a equipe",
  "/barbeiro/configurar": "Abrir a configuração inicial",
  "/barbeiro/mais": "Abrir o menu",
};
