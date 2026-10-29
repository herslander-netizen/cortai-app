import { termos as termosDoSegmento } from "@/lib/segmentos";
/**
 * Contrato da Flow IA — Assistente Virtual no WhatsApp.
 *
 * Este arquivo é seguro para o navegador: só tipos e rótulos, nunca segredos,
 * nunca chamadas ao gateway. Toda implementação vive em `*.server.ts`.
 */

export const STATUS_DA_CONEXAO = {
  desconectado: "Não conectado",
  pendente: "Preparando conexão",
  qr_pronto: "Escaneie o QR Code",
  conectando: "Conectando",
  conectado: "Conectado",
  erro: "Com erro",
} as const;

export type StatusDaConexao = keyof typeof STATUS_DA_CONEXAO;

export const TONS = {
  profissional: "Profissional",
  amigavel: "Amigável",
  direto: "Direto",
  premium: "Premium",
  objetivo: "Objetivo",
} as const;

export type TomDoAtendimento = keyof typeof TONS;

export const AUTOMACOES = {
  confirmacao_agendamento: "Confirmação de agendamento",
  lembrete_24h: "Lembrete 24 horas antes",
  lembrete_2h: "Lembrete 2 horas antes",
  alteracao_agendamento: "Alteração de agendamento",
  cancelamento_agendamento: "Cancelamento de agendamento",
  mudanca_operacional: "Mudança que afeta o horário",
  vaga_lista_espera: "Vaga da lista de espera",
  pagamento_confirmado: "Pagamento confirmado",
  pos_atendimento: "Pós-atendimento",
  convite_avaliacao: "Convite de avaliação",
  recuperacao_experiencia: "Recuperação da experiência",
  retorno: "Lembrete de retorno",
} as const;

export type ChaveDeAutomacao = keyof typeof AUTOMACOES;

export type ConexaoDeWhatsapp = {
  status: StatusDaConexao;
  numero: string | null;
  nomeExibicao: string | null;
  qrCode: string | null;
  qrExpiraEm: string | null;
  conectadoEm: string | null;
  ultimoErro: string | null;
};

export type ConversaDeWhatsapp = {
  id: string;
  telefone: string;
  nomeContato: string | null;
  clienteId: string | null;
  status: "ativa" | "humano" | "encerrada";
  iaAtiva: boolean;
  modoHumano: boolean;
  naoLidas: number;
  ultimaMensagemEm: string | null;
};

export type MensagemDeWhatsapp = {
  id: string;
  direcao: "entrada" | "saida";
  tipo: string;
  conteudo: string;
  geradaPorIa: boolean;
  geradaPorHumano: boolean;
  criadoEm: string;
  status: string;
};

export type ConfiguracaoDoAtendimento = {
  segmento: import("@/lib/segmentos").Segmento;
  atendimentoAutomatico: boolean;
  saudacaoAtiva: boolean;
  mensagemBoasVindas: string;
  mensagemForaDoHorario: string;
  permiteConfirmar: boolean;
  permiteCancelar: boolean;
  permiteRemarcar: boolean;
  encaminhamentoHumano: boolean;
  lembretes: boolean;
  tom: TomDoAtendimento;
  /** Preparação da recuperação de clientes: desligada por padrão. */
  recuperacaoAtiva: boolean;
  recuperacaoDias: number;
  /** A IA pode responder pelo WhatsApp quando a conexão estiver ativa. */
  responderWhatsapp: boolean;
  /** Regras escritas pelo negócio, usadas nas respostas. */
  instrucoesExtras: string;
  /** A IA atende só dentro de um horário próprio. */
  horarioProprio: boolean;
  /** Dias da semana (0 domingo … 6 sábado) em que a IA atende. */
  horarioDias: number[];
  horarioInicio: string;
  horarioFim: string;
  /** Confirmação automática do agendamento pelo WhatsApp (sem IA). */
  confirmacaoAutomatica: boolean;
  /** Mostrar link externo de pagamento antecipado na confirmação. */
  pagamentoAntecipado: boolean;
  /** Link externo de pagamento informado pelo negócio. */
  linkPagamento: string;
  /** Textos da Conversa Padrão sobrescritos pelo negócio (chave → texto). */
  textosConversa: Record<string, string>;
  /** Situações da Conversa Padrão desligadas pelo negócio. */
  situacoesDesligadas: string[];
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

/** Texto legado mantido apenas para ler configurações antigas; não é enviado no runtime. */
export const SAUDACAO_PADRAO = "";

/** Configurações antigas continuam legíveis sem reativar atendimento livre. */
export function saudacaoPadrao(segmento: string | null | undefined): string {
  void termosDoSegmento(segmento);
  return SAUDACAO_PADRAO;
}

export const CONFIGURACAO_PADRAO: ConfiguracaoDoAtendimento = {
  segmento: "outro",
  atendimentoAutomatico: false,
  saudacaoAtiva: false,
  mensagemBoasVindas: SAUDACAO_PADRAO,
  mensagemForaDoHorario: "",
  permiteConfirmar: false,
  permiteCancelar: false,
  permiteRemarcar: false,
  encaminhamentoHumano: false,
  lembretes: false,
  tom: "profissional",
  recuperacaoAtiva: false,
  recuperacaoDias: 30,
  responderWhatsapp: false,
  instrucoesExtras: "",
  horarioProprio: false,
  horarioDias: [1, 2, 3, 4, 5, 6],
  horarioInicio: "09:00",
  horarioFim: "19:00",
  confirmacaoAutomatica: true,
  pagamentoAntecipado: false,
  linkPagamento: "",
  textosConversa: {},
  situacoesDesligadas: [],
};

/** Erro usado quando não existe serviço de WhatsApp configurado no ambiente. */
export class GatewayNaoConfiguradoError extends Error {
  constructor() {
    super("O serviço de WhatsApp ainda não está configurado neste ambiente.");
    this.name = "GatewayNaoConfiguradoError";
  }
}

export function ehGatewayNaoConfigurado(erro: unknown): boolean {
  return erro instanceof Error && erro.name === "GatewayNaoConfiguradoError";
}

/**
 * Intenções que a Flow IA reconhece. A lista é aberta: acrescentar uma intenção
 * nova é só adicionar aqui — nada mais precisa ser reescrito.
 */
export const INTENCOES = {
  saudacao: "Saudação",
  informacoes: "Informações do negócio",
  servicos: "Serviços",
  precos: "Preços",
  profissionais: "Profissionais",
  horario_funcionamento: "Horário de funcionamento",
  localizacao: "Localização",
  disponibilidade: "Disponibilidade",
  agendamento: "Agendamento",
  confirmacao: "Confirmação",
  cancelamento: "Cancelamento",
  reagendamento: "Reagendamento",
  consulta_agendamento: "Consulta de agendamento",
  historico: "Histórico",
  atendimento_humano: "Atendimento humano",
  duvida_geral: "Dúvida geral",
  desconhecida: "Solicitação desconhecida",
} as const;

export type Intencao = keyof typeof INTENCOES;

/** Memória curta da conversa: o que já ficou decidido até agora. */
export type ContextoDaConversa = {
  intencao?: Intencao;
  resumo?: string;
  clienteId?: string | null;
  servicoId?: string | null;
  servicoNome?: string | null;
  profissionalId?: string | null;
  profissionalNome?: string | null;
  dia?: string | null;
  /** Opções oferecidas na última mensagem, na ordem em que foram apresentadas. */
  opcoes?: { rotulo: string; inicio: string; profissionalId: string; servicoId?: string | null }[];
  agendamentoId?: string | null;
  atualizadoEm?: string;
};

export type InformacaoDaBarbearia = {
  id: string;
  pergunta: string;
  resposta: string;
  ativo: boolean;
  ordem: number;
};
