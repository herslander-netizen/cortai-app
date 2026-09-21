/**
 * Contrato do atendimento do CortAI no WhatsApp.
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
  boas_vindas: "Mensagem de boas-vindas",
  fora_do_horario: "Aviso fora do horário",
  confirmacao_agendamento: "Confirmação de agendamento",
  lembrete_agendamento: "Lembrete de agendamento",
  cancelamento: "Aviso de cancelamento",
  remarcacao: "Aviso de remarcação",
  encaminhamento_humano: "Encaminhamento para atendente",
  cliente_de_retorno: "Cliente que voltou",
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
  /** Regras escritas pela barbearia, usadas nas respostas. */
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
  /** Link externo de pagamento informado pela barbearia. */
  linkPagamento: string;
};

export const DIAS_DA_SEMANA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"] as const;

export const CONFIGURACAO_PADRAO: ConfiguracaoDoAtendimento = {
  atendimentoAutomatico: true,
  saudacaoAtiva: true,
  mensagemBoasVindas: "",
  mensagemForaDoHorario: "",
  permiteConfirmar: true,
  permiteCancelar: true,
  permiteRemarcar: true,
  encaminhamentoHumano: true,
  lembretes: false,
  tom: "profissional",
  recuperacaoAtiva: false,
  recuperacaoDias: 30,
  responderWhatsapp: true,
  instrucoesExtras: "",
  horarioProprio: false,
  horarioDias: [1, 2, 3, 4, 5, 6],
  horarioInicio: "09:00",
  horarioFim: "19:00",
  confirmacaoAutomatica: true,
  pagamentoAntecipado: false,
  linkPagamento: "",
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
 * Intenções que o CortAI reconhece. A lista é aberta: acrescentar uma intenção
 * nova é só adicionar aqui — nada mais precisa ser reescrito.
 */
export const INTENCOES = {
  saudacao: "Saudação",
  informacoes: "Informações da barbearia",
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
