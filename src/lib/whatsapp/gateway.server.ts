/**
 * Camada única de conversa com o serviço de WhatsApp (gateway).
 *
 * O Cortaí é um site: ele não mantém a sessão do WhatsApp aberta. Quem mantém
 * é um serviço separado, publicado pela equipe, configurado por variáveis de
 * ambiente. Enquanto elas não existirem, TODO método recusa a chamada com
 * `GatewayNaoConfiguradoError` — nunca existe QR falso nem conexão simulada.
 *
 * As credenciais são lidas dentro dos métodos e nunca saem do servidor.
 */
import { GatewayNaoConfiguradoError, type StatusDaConexao } from "./contrato";

type Config = { baseUrl: string; apiKey: string; provedor: string };

function lerConfig(): Config | null {
  const baseUrl = process.env["WHATSAPP_GATEWAY_URL"];
  const apiKey = process.env["WHATSAPP_GATEWAY_API_KEY"];
  if (!baseUrl || !apiKey) return null;
  return {
    baseUrl: baseUrl.replace(/\/+$/, ""),
    apiKey,
    provedor: process.env["WHATSAPP_GATEWAY_PROVIDER"] ?? "gateway",
  };
}

export function gatewayConfigurado(): boolean {
  return lerConfig() !== null;
}

export function provedorDoGateway(): string {
  return lerConfig()?.provedor ?? "gateway";
}

/** Segredo com que o gateway assina os avisos que manda para o Cortaí. */
export function segredoDoWebhookDeWhatsapp(): string | null {
  return process.env["WHATSAPP_WEBHOOK_SECRET"] ?? null;
}

async function chamar<T>(caminho: string, metodo: "GET" | "POST", corpo?: unknown): Promise<T> {
  const config = lerConfig();
  if (!config) throw new GatewayNaoConfiguradoError();
  const resposta = await fetch(`${config.baseUrl}${caminho}`, {
    method: metodo,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.apiKey}`,
    },
    ...(corpo === undefined ? {} : { body: JSON.stringify(corpo) }),
  });
  if (!resposta.ok) {
    const detalhe = await resposta.text().catch(() => "");
    throw new Error(
      `O serviço de WhatsApp respondeu ${resposta.status}${detalhe ? `: ${detalhe.slice(0, 200)}` : ""}`,
    );
  }
  return (await resposta.json()) as T;
}

export type EstadoDaSessao = {
  status: StatusDaConexao;
  qrCode?: string | null;
  qrExpiraEm?: string | null;
  numero?: string | null;
  nomeExibicao?: string | null;
  erro?: string | null;
};

/** Traduz o status cru do gateway para o vocabulário do Cortaí. */
export function normalizarStatus(bruto: unknown): StatusDaConexao {
  const valor = String(bruto ?? "").toLowerCase();
  if (["connected", "conectado", "open", "ready"].includes(valor)) return "conectado";
  if (["connecting", "conectando", "syncing", "pairing"].includes(valor)) return "conectando";
  if (["qr", "qr_ready", "qr_pronto", "scan_qr"].includes(valor)) return "qr_pronto";
  if (["pending", "pendente", "starting"].includes(valor)) return "pendente";
  if (["error", "erro", "failed"].includes(valor)) return "erro";
  return "desconectado";
}

function normalizarEstado(bruto: Record<string, unknown>): EstadoDaSessao {
  return {
    status: normalizarStatus(bruto["status"]),
    qrCode: (bruto["qr_code"] as string) ?? (bruto["qrCode"] as string) ?? null,
    qrExpiraEm: (bruto["qr_expires_at"] as string) ?? (bruto["qrExpiresAt"] as string) ?? null,
    numero: (bruto["phone_number"] as string) ?? (bruto["phoneNumber"] as string) ?? null,
    nomeExibicao: (bruto["display_name"] as string) ?? (bruto["displayName"] as string) ?? null,
    erro: (bruto["error"] as string) ?? null,
  };
}

/** Interface única do provedor. Trocar de serviço é reimplementar isto. */
export const gatewayDeWhatsapp = {
  async criarSessao(sessaoId: string, webhookUrl: string): Promise<EstadoDaSessao> {
    const r = await chamar<Record<string, unknown>>("/sessions", "POST", {
      session_id: sessaoId,
      webhook_url: webhookUrl,
    });
    return normalizarEstado(r);
  },

  async obterQrCode(sessaoId: string): Promise<EstadoDaSessao> {
    const r = await chamar<Record<string, unknown>>(`/sessions/${encodeURIComponent(sessaoId)}/qr`, "GET");
    return normalizarEstado(r);
  },

  async consultarStatus(sessaoId: string): Promise<EstadoDaSessao> {
    const r = await chamar<Record<string, unknown>>(`/sessions/${encodeURIComponent(sessaoId)}`, "GET");
    return normalizarEstado(r);
  },

  async enviarMensagem(sessaoId: string, telefone: string, texto: string): Promise<{ id: string | null }> {
    const r = await chamar<Record<string, unknown>>(
      `/sessions/${encodeURIComponent(sessaoId)}/messages`,
      "POST",
      { to: telefone, type: "text", text: texto },
    );
    return { id: (r["message_id"] as string) ?? (r["id"] as string) ?? null };
  },

  async reiniciarSessao(sessaoId: string): Promise<EstadoDaSessao> {
    const r = await chamar<Record<string, unknown>>(
      `/sessions/${encodeURIComponent(sessaoId)}/restart`,
      "POST",
      {},
    );
    return normalizarEstado(r);
  },

  async desconectar(sessaoId: string): Promise<void> {
    await chamar(`/sessions/${encodeURIComponent(sessaoId)}/disconnect`, "POST", {});
  },
};
