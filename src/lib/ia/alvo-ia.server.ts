/**
 * Adaptador da ALVO IA.
 *
 * Nada aqui chama um endpoint inventado: enquanto as variáveis de ambiente
 * `ALVO_IA_BASE_URL` e `ALVO_IA_API_KEY` não existirem, todo método recusa a
 * chamada com `IntegracaoNaoConfiguradaError`. A chave nunca sai do servidor.
 */
import {
  IntegracaoNaoConfiguradaError,
  PROVEDOR_PADRAO,
  type EventoDeNegocio,
  type DadosDeEvento,
  type EventoRecebido,
  type PersonaDoAgente,
  type ProvedorDeIA,
  type RespostaDeAgente,
  type RespostaDeVinculo,
  type ResumoDaBarbearia,
  type StatusDaIntegracao,
} from "./contrato";

type Config = { baseUrl: string; apiKey: string };

/** Lida dentro dos métodos — variáveis de ambiente só existem em tempo de execução. */
function lerConfig(): Config | null {
  const baseUrl = process.env["ALVO_IA_BASE_URL"];
  const apiKey = process.env["ALVO_IA_API_KEY"];
  if (!baseUrl || !apiKey) return null;
  return { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey };
}

/** Segredo de assinatura dos eventos recebidos (webhook). */
export function segredoDeWebhook(): string | null {
  return process.env["ALVO_IA_WEBHOOK_SECRET"] ?? null;
}

async function chamar<T>(caminho: string, corpo: unknown): Promise<T> {
  const config = lerConfig();
  if (!config) throw new IntegracaoNaoConfiguradaError();
  const resposta = await fetch(`${config.baseUrl}${caminho}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(corpo),
  });
  if (!resposta.ok) {
    const detalhe = await resposta.text().catch(() => "");
    throw new Error(`ALVO IA respondeu ${resposta.status}${detalhe ? `: ${detalhe.slice(0, 200)}` : ""}`);
  }
  return (await resposta.json()) as T;
}

function texto(valor: unknown, campo: string): string {
  if (typeof valor !== "string" || valor.trim() === "") {
    throw new Error(`Evento inválido: campo "${campo}" ausente.`);
  }
  return valor;
}

class AlvoAIClient implements ProvedorDeIA {
  readonly id = PROVEDOR_PADRAO;

  estaConfigurado(): boolean {
    return lerConfig() !== null;
  }

  registrarTenant(input: { tenantId: string; nome: string }): Promise<RespostaDeVinculo> {
    return chamar<RespostaDeVinculo>("/v1/tenants", input);
  }

  async sincronizarBarbearia(input: { externalTenantId: string; resumo: ResumoDaBarbearia }): Promise<void> {
    await chamar<{ ok: boolean }>(`/v1/tenants/${input.externalTenantId}/sync`, input.resumo);
  }

  salvarAgente(input: {
    externalTenantId: string;
    externalAgentId: string | null;
    agentName: string;
    persona: PersonaDoAgente;
  }): Promise<RespostaDeAgente> {
    return chamar<RespostaDeAgente>(`/v1/tenants/${input.externalTenantId}/agents`, input);
  }

  consultarStatus(input: { externalTenantId: string }): Promise<{ status: StatusDaIntegracao; detalhe?: string }> {
    return chamar<{ status: StatusDaIntegracao; detalhe?: string }>(
      `/v1/tenants/${input.externalTenantId}/status`,
      {},
    );
  }

  async enviarEvento(evento: EventoDeNegocio & { externalTenantId: string }): Promise<void> {
    await chamar<{ ok: boolean }>(`/v1/tenants/${evento.externalTenantId}/events`, {
      type: evento.tipo,
      idempotency_key: evento.chaveIdempotencia,
      occurred_at: evento.ocorridoEm,
      payload: evento.payload,
    });
  }

  /** Converte o corpo cru do webhook no formato interno — sem confiar em nada. */
  normalizarEventoRecebido(corpo: unknown): EventoRecebido {
    if (typeof corpo !== "object" || corpo === null) throw new Error("Evento inválido: corpo vazio.");
    const bruto = corpo as Record<string, unknown>;
    const payload = bruto["payload"];
    return {
      eventoExternoId: texto(bruto["event_id"], "event_id"),
      tipo: texto(bruto["type"], "type"),
      externalTenantId: texto(bruto["tenant_id"], "tenant_id"),
      payload: typeof payload === "object" && payload !== null ? (payload as DadosDeEvento) : {},
    };
  }
}

let instancia: ProvedorDeIA | undefined;

/** Ponto único de acesso ao provedor de IA em todo o Cortaí. */
export function provedorDeIA(): ProvedorDeIA {
  if (!instancia) instancia = new AlvoAIClient();
  return instancia;
}
