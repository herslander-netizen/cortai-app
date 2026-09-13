/**
 * Contrato da camada de atendimento inteligente (ALVO IA).
 *
 * O Cortaí NÃO conhece o provedor: fala sempre com esta interface. Trocar a
 * ALVO IA por outro provedor no futuro é implementar `ProvedorDeIA` de novo,
 * sem tocar em nenhum módulo de negócio.
 *
 * Este arquivo é seguro para o navegador: só tipos e rótulos, nunca segredos.
 */

/** Valor simples serializável — nada de objetos exóticos atravessando a fronteira. */
export type ValorSimples = string | number | boolean | null;
export type DadosDeEvento = Record<string, ValorSimples | ValorSimples[] | Record<string, ValorSimples>>;

export const PROVEDOR_PADRAO = "alvo_ia" as const;
export type ProvedorDeIAId = typeof PROVEDOR_PADRAO;

export const STATUS_DA_INTEGRACAO = {
  desconectado: "Não conectado",
  pendente: "Aguardando conexão",
  conectado: "Conectado",
  erro: "Com erro",
  suspenso: "Suspenso",
} as const;

export type StatusDaIntegracao = keyof typeof STATUS_DA_INTEGRACAO;

/** Persona pública do agente — o que o cliente final enxerga. Sem dado sensível. */
export type PersonaDoAgente = {
  /** Tom de voz curto, ex.: "direto e simpático". */
  tom?: string;
  /** Saudação usada na primeira mensagem. */
  saudacao?: string;
  /** Observações que a barbearia quer que o atendente respeite. */
  instrucoes?: string;
};

export type IntegracaoDeIA = {
  tenantId: string;
  provedor: ProvedorDeIAId;
  status: StatusDaIntegracao;
  /** Identificador da conta da barbearia dentro da ALVO IA. */
  externalTenantId: string | null;
  /** Identificador do agente dentro da ALVO IA. */
  externalAgentId: string | null;
  /** Nome público escolhido pela barbearia (Beto, Zeca, Ana…). */
  agentName: string | null;
  agentPersona: PersonaDoAgente;
  conectadoEm: string | null;
  ultimaSincronizacaoEm: string | null;
  ultimoErro: string | null;
  /** Diagnóstico não sensível. */
  metadata: Record<string, ValorSimples>;
};

/* ------------------------------- Eventos --------------------------------- */

export const TIPOS_DE_EVENTO = [
  "appointment_created",
  "appointment_updated",
  "appointment_cancelled",
  "customer_created",
  "customer_updated",
  "customer_opt_in_whatsapp_changed",
  "service_updated",
  "professional_updated",
  "business_profile_updated",
] as const;

export type TipoDeEventoDeIA = (typeof TIPOS_DE_EVENTO)[number];

export type EventoDeNegocio = {
  tenantId: string;
  tipo: TipoDeEventoDeIA;
  /** Chave estável do evento: garante que nunca sai duplicado. */
  chaveIdempotencia: string;
  ocorridoEm: string;
  /** Só dados necessários ao atendimento; nada além do preciso (LGPD). */
  payload: DadosDeEvento;
};

export type EventoRecebido = {
  /** Id do evento no provedor — usado para descartar reentregas. */
  eventoExternoId: string;
  tipo: string;
  externalTenantId: string;
  payload: DadosDeEvento;
};

/* ------------------------------- Adaptador -------------------------------- */

export type ResumoDaBarbearia = {
  nome: string;
  slug: string;
  telefone: string | null;
  endereco: string | null;
  servicos: { id: string; nome: string; duracaoMin: number; precoCentavos: number }[];
  profissionais: { id: string; nome: string }[];
};

export type RespostaDeVinculo = {
  externalTenantId: string;
  status: StatusDaIntegracao;
};

export type RespostaDeAgente = {
  externalAgentId: string;
  agentName: string;
};

/**
 * Interface única entre o Cortaí e qualquer plataforma de IA.
 * Implementações vivem em arquivos `.server.ts` e nunca no navegador.
 */
export interface ProvedorDeIA {
  readonly id: ProvedorDeIAId;
  /** Diz se há endpoint/credencial configurados neste ambiente. */
  estaConfigurado(): boolean;
  /** Cria/vincula a conta da barbearia no provedor. */
  registrarTenant(input: { tenantId: string; nome: string }): Promise<RespostaDeVinculo>;
  /** Envia os dados básicos da barbearia (serviços, profissionais, horários). */
  sincronizarBarbearia(input: { externalTenantId: string; resumo: ResumoDaBarbearia }): Promise<void>;
  /** Cria ou atualiza o agente (nome público + persona). */
  salvarAgente(input: {
    externalTenantId: string;
    externalAgentId: string | null;
    agentName: string;
    persona: PersonaDoAgente;
  }): Promise<RespostaDeAgente>;
  /** Consulta o estado da conexão no provedor. */
  consultarStatus(input: { externalTenantId: string }): Promise<{ status: StatusDaIntegracao; detalhe?: string }>;
  /** Entrega um evento de negócio ao provedor. */
  enviarEvento(evento: EventoDeNegocio & { externalTenantId: string }): Promise<void>;
  /** Normaliza um evento recebido do provedor para o formato interno. */
  normalizarEventoRecebido(corpo: unknown): EventoRecebido;
}

/** Erro usado enquanto a ALVO IA ainda não existe/não está configurada. */
export class IntegracaoNaoConfiguradaError extends Error {
  constructor(provedor: string = PROVEDOR_PADRAO) {
    super(
      `A integração ${provedor === PROVEDOR_PADRAO ? "ALVO IA" : provedor} ainda não está disponível neste ambiente.`,
    );
    this.name = "IntegracaoNaoConfiguradaError";
  }
}

export function ehIntegracaoNaoConfigurada(erro: unknown): boolean {
  return erro instanceof Error && erro.name === "IntegracaoNaoConfiguradaError";
}
