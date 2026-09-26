/**
 * Camada única de conversa com o serviço de WhatsApp (gateway).
 *
 * O Cortaí é um site: ele não mantém a sessão do WhatsApp aberta. Quem mantém
 * é um serviço separado (por padrão a Evolution API), configurado por
 * variáveis de ambiente. Enquanto elas não existirem, TODO método recusa a
 * chamada com `GatewayNaoConfiguradoError` — nunca existe QR falso nem conexão
 * simulada.
 *
 * Provedores:
 * - "evolution" (padrão): Evolution API v2, conexão por QR Code.
 * - "generico": serviço próprio com o contrato /sessions usado antes.
 *
 * Variáveis aceitas (as legadas continuam valendo):
 *   EVOLUTION_API_URL        | WHATSAPP_GATEWAY_URL
 *   EVOLUTION_API_KEY        | WHATSAPP_GATEWAY_API_KEY
 *   EVOLUTION_WEBHOOK_SECRET | WHATSAPP_WEBHOOK_SECRET
 *   WHATSAPP_GATEWAY_PROVIDER (evolution | generico)
 *
 * As credenciais são lidas dentro dos métodos e nunca saem do servidor.
 */
import { GatewayNaoConfiguradoError, type StatusDaConexao } from "./contrato";

type Provedor = "evolution" | "generico" | "meta";
type Config = { baseUrl: string; apiKey: string; provedor: Provedor };

const URL_GATEWAY_META = "https://connector-gateway.lovable.dev/whatsapp";

function lerConfig(): Config | null {
  const baseUrl = process.env["EVOLUTION_API_URL"] ?? process.env["WHATSAPP_GATEWAY_URL"];
  const apiKey = process.env["EVOLUTION_API_KEY"] ?? process.env["WHATSAPP_GATEWAY_API_KEY"];
  if (baseUrl && apiKey) {
    const bruto = (process.env["WHATSAPP_GATEWAY_PROVIDER"] ?? "evolution").toLowerCase();
    return {
      baseUrl: baseUrl.replace(/\/+$/, ""),
      apiKey,
      provedor: bruto === "generico" ? "generico" : "evolution",
    };
  }
  // WhatsApp Business oficial (Meta), conectado em Connectors → WhatsApp.
  // Não existe QR Code: a conexão é da conta, verificada em /phone_number.
  const chaveMeta = process.env["WHATSAPP_API_KEY"];
  if (chaveMeta && process.env["LOVABLE_API_KEY"]) {
    return { baseUrl: URL_GATEWAY_META, apiKey: chaveMeta, provedor: "meta" };
  }
  return null;
}

export function gatewayConfigurado(): boolean {
  return lerConfig() !== null;
}

export function provedorDoGateway(): string {
  return lerConfig()?.provedor ?? "evolution";
}

/** Nomes das variáveis que faltam, para avisar com honestidade na tela. */
export function credenciaisFaltantes(): string[] {
  const faltam: string[] = [];
  if (!(process.env["EVOLUTION_API_URL"] ?? process.env["WHATSAPP_GATEWAY_URL"])) {
    faltam.push("EVOLUTION_API_URL");
  }
  if (!(process.env["EVOLUTION_API_KEY"] ?? process.env["WHATSAPP_GATEWAY_API_KEY"])) {
    faltam.push("EVOLUTION_API_KEY");
  }
  // Com a conta oficial da Meta vinculada, nenhuma dessas é necessária.
  if (process.env["WHATSAPP_API_KEY"] && process.env["LOVABLE_API_KEY"]) return [];
  if (!segredoDoWebhookDeWhatsapp()) faltam.push("EVOLUTION_WEBHOOK_SECRET");
  return faltam;
}

/** Segredo com que o gateway assina/identifica os avisos mandados ao Cortaí. */
export function segredoDoWebhookDeWhatsapp(): string | null {
  return process.env["EVOLUTION_WEBHOOK_SECRET"] ?? process.env["WHATSAPP_WEBHOOK_SECRET"] ?? null;
}

async function chamar<T>(
  caminho: string,
  metodo: "GET" | "POST" | "DELETE" | "PUT",
  corpo?: unknown,
): Promise<T> {
  const config = lerConfig();
  if (!config) throw new GatewayNaoConfiguradoError();
  const cabecalhos: Record<string, string> = { "content-type": "application/json" };
  if (config.provedor === "evolution") cabecalhos["apikey"] = config.apiKey;
  else if (config.provedor === "meta") {
    cabecalhos["authorization"] = `Bearer ${process.env["LOVABLE_API_KEY"]}`;
    cabecalhos["x-connection-api-key"] = config.apiKey;
  } else cabecalhos["authorization"] = `Bearer ${config.apiKey}`;

  const resposta = await fetch(`${config.baseUrl}${caminho}`, {
    method: metodo,
    headers: cabecalhos,
    ...(corpo === undefined ? {} : { body: JSON.stringify(corpo) }),
  });
  if (!resposta.ok) {
    const detalhe = await resposta.text().catch(() => "");
    throw new Error(
      `O serviço de WhatsApp respondeu ${resposta.status}${detalhe ? `: ${detalhe.slice(0, 200)}` : ""}`,
    );
  }
  const texto = await resposta.text();
  return (texto ? JSON.parse(texto) : {}) as T;
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
  if (["qr", "qr_ready", "qrcode", "qr_pronto", "scan_qr"].includes(valor)) return "qr_pronto";
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

/* ---------------------------------------------------------------- Evolution */

/** O QR da Evolution chega em base64 (data URL) e vale poucos minutos. */
const MINUTOS_DO_QR = 2;

function qrDaEvolution(bruto: Record<string, unknown>): { qrCode: string | null; expiraEm: string | null } {
  const cru = bruto["qrcode"] ?? bruto["qrCode"] ?? bruto;
  const objeto = (typeof cru === "object" && cru !== null ? cru : {}) as Record<string, unknown>;
  const base64 = (objeto["base64"] as string) ?? (bruto["base64"] as string) ?? null;
  const codigo = (objeto["code"] as string) ?? (bruto["code"] as string) ?? null;
  const qr = base64 ?? codigo;
  if (!qr) return { qrCode: null, expiraEm: null };
  return { qrCode: qr, expiraEm: new Date(Date.now() + MINUTOS_DO_QR * 60_000).toISOString() };
}

function numeroDoDono(bruto: Record<string, unknown>): string | null {
  const dono = (bruto["owner"] as string) ?? (bruto["ownerJid"] as string) ?? null;
  if (!dono) return null;
  return dono.split("@")[0] ?? null;
}

const evolution = {
  async criarSessao(sessaoId: string, webhookUrl: string): Promise<EstadoDaSessao> {
    const segredo = segredoDoWebhookDeWhatsapp();
    try {
      const criado = await chamar<Record<string, unknown>>("/instance/create", "POST", {
        instanceName: sessaoId,
        qrcode: true,
        integration: "WHATSAPP-BAILEYS",
        webhook: {
          url: webhookUrl,
          byEvents: false,
          base64: true,
          headers: segredo ? { "x-webhook-secret": segredo } : undefined,
          events: ["QRCODE_UPDATED", "CONNECTION_UPDATE", "MESSAGES_UPSERT"],
        },
      });
      const { qrCode, expiraEm } = qrDaEvolution(criado);
      const instancia = (criado["instance"] as Record<string, unknown>) ?? {};
      return {
        status: qrCode ? "qr_pronto" : normalizarStatus(instancia["status"] ?? "pending"),
        qrCode,
        qrExpiraEm: expiraEm,
        numero: numeroDoDono(instancia),
        nomeExibicao: (instancia["profileName"] as string) ?? null,
        erro: null,
      };
    } catch (erro) {
      if (erro instanceof GatewayNaoConfiguradoError) throw erro;
      // A instância já existe: seguimos direto para a conexão.
      return evolution.obterQrCode(sessaoId);
    }
  },

  async obterQrCode(sessaoId: string): Promise<EstadoDaSessao> {
    const r = await chamar<Record<string, unknown>>(
      `/instance/connect/${encodeURIComponent(sessaoId)}`,
      "GET",
    );
    const { qrCode, expiraEm } = qrDaEvolution(r);
    if (!qrCode) return evolution.consultarStatus(sessaoId);
    return { status: "qr_pronto", qrCode, qrExpiraEm: expiraEm, numero: null, nomeExibicao: null, erro: null };
  },

  async consultarStatus(sessaoId: string): Promise<EstadoDaSessao> {
    const r = await chamar<Record<string, unknown>>(
      `/instance/connectionState/${encodeURIComponent(sessaoId)}`,
      "GET",
    );
    const instancia = (r["instance"] as Record<string, unknown>) ?? r;
    return {
      status: normalizarStatus(instancia["state"] ?? instancia["status"]),
      qrCode: null,
      qrExpiraEm: null,
      numero: numeroDoDono(instancia),
      nomeExibicao: (instancia["profileName"] as string) ?? null,
      erro: null,
    };
  },

  async enviarMensagem(sessaoId: string, telefone: string, texto: string) {
    const r = await chamar<Record<string, unknown>>(
      `/message/sendText/${encodeURIComponent(sessaoId)}`,
      "POST",
      { number: telefone.replace(/\D/g, ""), text: texto },
    );
    const chave = (r["key"] as Record<string, unknown>) ?? {};
    return { id: (chave["id"] as string) ?? (r["id"] as string) ?? null };
  },

  async reiniciarSessao(sessaoId: string): Promise<EstadoDaSessao> {
    await chamar(`/instance/restart/${encodeURIComponent(sessaoId)}`, "POST", {}).catch(() => undefined);
    return evolution.obterQrCode(sessaoId);
  },

  async desconectar(sessaoId: string): Promise<void> {
    await chamar(`/instance/logout/${encodeURIComponent(sessaoId)}`, "DELETE");
  },
};

/* ---------------------------------------------------------------- Genérico */

const generico = {
  async criarSessao(sessaoId: string, webhookUrl: string): Promise<EstadoDaSessao> {
    return normalizarEstado(
      await chamar<Record<string, unknown>>("/sessions", "POST", {
        session_id: sessaoId,
        webhook_url: webhookUrl,
      }),
    );
  },
  async obterQrCode(sessaoId: string): Promise<EstadoDaSessao> {
    return normalizarEstado(
      await chamar<Record<string, unknown>>(`/sessions/${encodeURIComponent(sessaoId)}/qr`, "GET"),
    );
  },
  async consultarStatus(sessaoId: string): Promise<EstadoDaSessao> {
    return normalizarEstado(
      await chamar<Record<string, unknown>>(`/sessions/${encodeURIComponent(sessaoId)}`, "GET"),
    );
  },
  async enviarMensagem(sessaoId: string, telefone: string, texto: string) {
    const r = await chamar<Record<string, unknown>>(
      `/sessions/${encodeURIComponent(sessaoId)}/messages`,
      "POST",
      { to: telefone, type: "text", text: texto },
    );
    return { id: (r["message_id"] as string) ?? (r["id"] as string) ?? null };
  },
  async reiniciarSessao(sessaoId: string): Promise<EstadoDaSessao> {
    return normalizarEstado(
      await chamar<Record<string, unknown>>(`/sessions/${encodeURIComponent(sessaoId)}/restart`, "POST", {}),
    );
  },
  async desconectar(sessaoId: string): Promise<void> {
    await chamar(`/sessions/${encodeURIComponent(sessaoId)}/disconnect`, "POST", {});
  },
};

/* -------------------------------------------------------------------- Meta */

/**
 * WhatsApp Business oficial (Meta), via conexão do workspace. A sessão é da
 * conta: não há QR para escanear nem logout pelo app. O estado consultado em
 * /phone_number é real — se a chamada falha, a tela mostra o erro.
 */
const meta = {
  async consultarStatus(): Promise<EstadoDaSessao> {
    try {
      const r = await chamar<Record<string, unknown>>(
        "/phone_number?fields=display_phone_number,quality_rating",
        "GET",
      );
      return {
        status: "conectado",
        qrCode: null,
        qrExpiraEm: null,
        numero: (r["display_phone_number"] as string) ?? null,
        nomeExibicao: null,
        erro: null,
      };
    } catch (erro) {
      return {
        status: "erro",
        qrCode: null,
        qrExpiraEm: null,
        numero: null,
        nomeExibicao: null,
        erro: erro instanceof Error ? erro.message : "Falha ao consultar o número.",
      };
    }
  },
  criarSessao(): Promise<EstadoDaSessao> {
    return meta.consultarStatus();
  },
  obterQrCode(): Promise<EstadoDaSessao> {
    return meta.consultarStatus();
  },
  async enviarMensagem(_sessaoId: string, telefone: string, texto: string) {
    const r = await chamar<Record<string, unknown>>("/messages", "POST", {
      messaging_product: "whatsapp",
      to: telefone.replace(/\D/g, ""),
      type: "text",
      text: { body: texto },
    });
    const lista = (r["messages"] as Record<string, unknown>[]) ?? [];
    return { id: (lista[0]?.["id"] as string) ?? null };
  },
  /** Modelo aprovado com botões de resposta rápida (payload fixo por botão). */
  async enviarTemplate(telefone: string, t: ModeloComBotoes) {
    const r = await chamar<Record<string, unknown>>("/messages", "POST", {
      messaging_product: "whatsapp",
      to: telefone.replace(/\D/g, ""),
      type: "template",
      template: {
        name: t.nome,
        language: { code: t.idioma },
        components: [
          { type: "body", parameters: t.parametros.map((text) => ({ type: "text", text })) },
          ...t.botoes.map((payload, index) => ({
            type: "button",
            sub_type: "quick_reply",
            index: String(index),
            parameters: [{ type: "payload", payload }],
          })),
        ],
      },
    });
    const lista = (r["messages"] as Record<string, unknown>[]) ?? [];
    return { id: (lista[0]?.["id"] as string) ?? null };
  },
  reiniciarSessao(): Promise<EstadoDaSessao> {
    return meta.consultarStatus();
  },
  async desconectar(): Promise<void> {
    // O desvínculo da conta oficial é feito em Connectors → WhatsApp, não pelo app.
  },
};

function provedor() {
  const config = lerConfig();
  if (!config) throw new GatewayNaoConfiguradoError();
  if (config.provedor === "meta") return meta;
  return config.provedor === "generico" ? generico : evolution;
}

export type ModeloComBotoes = { nome: string; idioma: string; parametros: string[]; botoes: string[] };

/** Interface única do provedor. Trocar de serviço é reimplementar isto. */
export const gatewayDeWhatsapp = {
  criarSessao: (sessaoId: string, webhookUrl: string) => provedor().criarSessao(sessaoId, webhookUrl),
  obterQrCode: (sessaoId: string) => provedor().obterQrCode(sessaoId),
  consultarStatus: (sessaoId: string) => provedor().consultarStatus(sessaoId),
  enviarMensagem: (sessaoId: string, telefone: string, texto: string) =>
    provedor().enviarMensagem(sessaoId, telefone, texto),
  /** Só a API oficial garante botões; nos demais provedores devolve null. */
  enviarTemplate: (telefone: string, t: ModeloComBotoes) =>
    lerConfig()?.provedor === "meta" ? meta.enviarTemplate(telefone, t) : Promise.resolve(null),
  /**
   * O que o canal atual suporta. Oficial: botões via template e janela de 24h
   * para mensagens iniciadas pela barbearia. Demais: opções numeradas, sem janela.
   */
  capacidades: () => {
    const oficial = lerConfig()?.provedor === "meta";
    return { botoes: oficial, exigeTemplateForaDaJanela: oficial };
  },
  reiniciarSessao: (sessaoId: string) => provedor().reiniciarSessao(sessaoId),
  desconectar: (sessaoId: string) => provedor().desconectar(sessaoId),
};
