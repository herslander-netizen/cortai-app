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
};

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
