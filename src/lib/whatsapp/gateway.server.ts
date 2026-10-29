/**
 * Camada única de conversa com o serviço de WhatsApp (gateway).
 *
 * O Flow é um site: ele não mantém a sessão do WhatsApp aberta. Quem mantém
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

import { codigoDePareamento, MINUTOS_DO_CODIGO } from "@/lib/whatsapp/pareamento-telefone";

function configEvolution(): Config | null {
  const baseUrl = process.env["EVOLUTION_API_URL"] ?? process.env["WHATSAPP_GATEWAY_URL"];
  const apiKey = process.env["EVOLUTION_API_KEY"] ?? process.env["WHATSAPP_GATEWAY_API_KEY"];
  if (!baseUrl || !apiKey) return null;
  const bruto = (process.env["WHATSAPP_GATEWAY_PROVIDER"] ?? "evolution").toLowerCase();
  return {
    baseUrl: baseUrl.replace(/\/+$/, ""),
    apiKey,
    provedor: bruto === "generico" ? "generico" : "evolution",
  };
}

const VERSAO_GRAPH_PADRAO = "v21.0";

/**
 * WhatsApp Business oficial (Meta) direto na Cloud API, sem intermediário:
 * META_WHATSAPP_ACCESS_TOKEN (token permanente do usuário do sistema) e
 * META_WHATSAPP_PHONE_NUMBER_ID. A base aponta para o número, então os
 * caminhos são relativos a ele ("/messages", "?fields=...").
 */
function configMetaDireta(): Config | null {
  const token = process.env["META_WHATSAPP_ACCESS_TOKEN"]?.trim();
  const numeroId = process.env["META_WHATSAPP_PHONE_NUMBER_ID"]?.trim();
  if (!token || !numeroId) return null;
  const versao = process.env["META_GRAPH_VERSION"]?.trim() || VERSAO_GRAPH_PADRAO;
  return {
    baseUrl: `https://graph.facebook.com/${versao}/${encodeURIComponent(numeroId)}`,
    apiKey: token,
    provedor: "meta",
  };
}

// WhatsApp Business oficial: só pela Cloud API direta. Não existe QR Code: a conexão é da conta.
function configMeta(): Config | null {
  return configMetaDireta();
}

/** Com a conta oficial da Meta configurada. */
function metaConfigurada(): boolean {
  return configMeta() !== null;
}

/**
 * Configuração do provedor. Com `preferido` (o `provedor` gravado na conexão do
 * negócio), Evolution e Meta coexistem: cada conexão usa o próprio serviço.
 * Sem preferência conhecida ("gateway"/vazio), vale a regra global antiga.
 */
function lerConfig(preferido?: string | null): Config | null {
  const p = (preferido ?? "").toLowerCase();
  if (p === "meta") return configMeta();
  if (p === "evolution" || p === "generico") return configEvolution();
  return configEvolution() ?? configMeta();
}

export function gatewayConfigurado(preferido?: string | null): boolean {
  return lerConfig(preferido) !== null;
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
  if (metaConfigurada()) return [];
  if (!segredoDoWebhookDeWhatsapp()) faltam.push("EVOLUTION_WEBHOOK_SECRET");
  return faltam;
}

/** Segredo com que o gateway assina/identifica os avisos mandados ao Flow. */
export function segredoDoWebhookDeWhatsapp(): string | null {
  return process.env["EVOLUTION_WEBHOOK_SECRET"] ?? process.env["WHATSAPP_WEBHOOK_SECRET"] ?? null;
}

/** Tempo máximo de cada chamada ao serviço de WhatsApp. */
export const TEMPO_LIMITE_MS = 10_000;

export async function chamar<T>(
  config: Config | null,
  caminho: string,
  metodo: "GET" | "POST" | "DELETE" | "PUT",
  corpo?: unknown,
): Promise<T> {
  if (!config) throw new GatewayNaoConfiguradoError();
  const cabecalhos: Record<string, string> = { "content-type": "application/json" };
  if (config.provedor === "evolution") cabecalhos["apikey"] = config.apiKey;
  else cabecalhos["authorization"] = `Bearer ${config.apiKey}`;

  const controle = new AbortController();
  const relogio = setTimeout(() => controle.abort(), TEMPO_LIMITE_MS);
  let resposta: Response;
  try {
    resposta = await fetch(`${config.baseUrl}${caminho}`, {
      method: metodo,
      headers: cabecalhos,
      signal: controle.signal,
      ...(corpo === undefined ? {} : { body: JSON.stringify(corpo) }),
    });
  } catch (erro) {
    if (controle.signal.aborted) {
      throw new Error("O serviço de WhatsApp não respondeu: tempo esgotado.");
    }
    throw erro;
  } finally {
    clearTimeout(relogio);
  }
  if (!resposta.ok) {
    const detalhe = await resposta.text().catch(() => "");
    throw new Error(
      `O serviço de WhatsApp respondeu ${resposta.status}${detalhe ? `: ${detalhe.slice(0, 200)}` : ""}`,
    );
  }
  const texto = await resposta.text();
  return (texto ? JSON.parse(texto) : {}) as T;
}

export type CodigoDePareamento = { codigo: string; expiraEm: string };

const SEM_PAREAMENTO = "A conexão por número de telefone não está disponível neste serviço.";

export type EstadoDaSessao = {
  status: StatusDaConexao;
  qrCode?: string | null;
  qrExpiraEm?: string | null;
  numero?: string | null;
  nomeExibicao?: string | null;
  erro?: string | null;
};

/** Traduz o status cru do gateway para o vocabulário do Flow. */
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

function qrDaEvolution(bruto: Record<string, unknown>): {
  qrCode: string | null;
  expiraEm: string | null;
} {
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

/** Webhook da Evolution sempre com o segredo no cabeçalho (nunca na URL). */
export function webhookDaEvolution(url: string, segredo: string | null) {
  return {
    url,
    byEvents: false,
    base64: true,
    headers: segredo ? { "x-webhook-secret": segredo } : undefined,
    events: ["QRCODE_UPDATED", "CONNECTION_UPDATE", "MESSAGES_UPSERT"],
  };
}

function criarEvolution(cfg: Config | null) {
  const evolution = {
    async criarSessao(sessaoId: string, webhookUrl: string): Promise<EstadoDaSessao> {
      const segredo = segredoDoWebhookDeWhatsapp();
      try {
        const criado = await chamar<Record<string, unknown>>(cfg, "/instance/create", "POST", {
          instanceName: sessaoId,
          qrcode: true,
          integration: "WHATSAPP-BAILEYS",
          webhook: webhookDaEvolution(webhookUrl, segredo),
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
        // A instância já existe (reconexão): reaplica o webhook com o segredo
        // no cabeçalho antes de seguir para a conexão.
        await chamar(cfg, `/webhook/set/${encodeURIComponent(sessaoId)}`, "POST", {
          webhook: { enabled: true, ...webhookDaEvolution(webhookUrl, segredo) },
        }).catch((e) =>
          console.error(
            "[evolution] não foi possível reaplicar o webhook:",
            e instanceof Error ? e.message.slice(0, 200) : "erro",
          ),
        );
        return evolution.obterQrCode(sessaoId);
      }
    },

    async obterQrCode(sessaoId: string): Promise<EstadoDaSessao> {
      const r = await chamar<Record<string, unknown>>(
        cfg,
        `/instance/connect/${encodeURIComponent(sessaoId)}`,
        "GET",
      );
      const { qrCode, expiraEm } = qrDaEvolution(r);
      if (!qrCode) return evolution.consultarStatus(sessaoId);
      return {
        status: "qr_pronto",
        qrCode,
        qrExpiraEm: expiraEm,
        numero: null,
        nomeExibicao: null,
        erro: null,
      };
    },

    /** Código de 8 caracteres para digitar no celular, no lugar de ler o QR Code. */
    async obterCodigoDePareamento(sessaoId: string, numero: string): Promise<CodigoDePareamento> {
      const r = await chamar<Record<string, unknown>>(
        cfg,
        `/instance/connect/${encodeURIComponent(sessaoId)}?number=${encodeURIComponent(numero)}`,
        "GET",
      );
      const codigo = codigoDePareamento(r);
      if (!codigo) throw new Error("O WhatsApp não devolveu o código. Tente de novo em instantes.");
      return {
        codigo,
        expiraEm: new Date(Date.now() + MINUTOS_DO_CODIGO * 60_000).toISOString(),
      };
    },

    async consultarStatus(sessaoId: string): Promise<EstadoDaSessao> {
      const r = await chamar<Record<string, unknown>>(
        cfg,
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
        cfg,
        `/message/sendText/${encodeURIComponent(sessaoId)}`,
        "POST",
        { number: telefone.replace(/\D/g, ""), text: texto },
      );
      const chave = (r["key"] as Record<string, unknown>) ?? {};
      return { id: (chave["id"] as string) ?? (r["id"] as string) ?? null };
    },

    async reiniciarSessao(sessaoId: string): Promise<EstadoDaSessao> {
      await chamar(cfg, `/instance/restart/${encodeURIComponent(sessaoId)}`, "POST", {}).catch(
        () => undefined,
      );
      return evolution.obterQrCode(sessaoId);
    },

    async desconectar(sessaoId: string): Promise<void> {
      await chamar(cfg, `/instance/logout/${encodeURIComponent(sessaoId)}`, "DELETE");
    },
  };
  return evolution;
}

/* ---------------------------------------------------------------- Genérico */

function criarGenerico(cfg: Config | null) {
  const generico = {
    async criarSessao(sessaoId: string, webhookUrl: string): Promise<EstadoDaSessao> {
      return normalizarEstado(
        await chamar<Record<string, unknown>>(cfg, "/sessions", "POST", {
          session_id: sessaoId,
          webhook_url: webhookUrl,
        }),
      );
    },
    async obterQrCode(sessaoId: string): Promise<EstadoDaSessao> {
      return normalizarEstado(
        await chamar<Record<string, unknown>>(
          cfg,
          `/sessions/${encodeURIComponent(sessaoId)}/qr`,
          "GET",
        ),
      );
    },
    async obterCodigoDePareamento(_sessaoId: string, _numero: string): Promise<CodigoDePareamento> {
      throw new Error(SEM_PAREAMENTO);
    },
    async consultarStatus(sessaoId: string): Promise<EstadoDaSessao> {
      return normalizarEstado(
        await chamar<Record<string, unknown>>(
          cfg,
          `/sessions/${encodeURIComponent(sessaoId)}`,
          "GET",
        ),
      );
    },
    async enviarMensagem(sessaoId: string, telefone: string, texto: string) {
      const r = await chamar<Record<string, unknown>>(
        cfg,
        `/sessions/${encodeURIComponent(sessaoId)}/messages`,
        "POST",
        { to: telefone, type: "text", text: texto },
      );
      return { id: (r["message_id"] as string) ?? (r["id"] as string) ?? null };
    },
    async reiniciarSessao(sessaoId: string): Promise<EstadoDaSessao> {
      return normalizarEstado(
        await chamar<Record<string, unknown>>(
          cfg,
          `/sessions/${encodeURIComponent(sessaoId)}/restart`,
          "POST",
          {},
        ),
      );
    },
    async desconectar(sessaoId: string): Promise<void> {
      await chamar(cfg, `/sessions/${encodeURIComponent(sessaoId)}/disconnect`, "POST", {});
    },
  };
  return generico;
}

/* -------------------------------------------------------------------- Meta */

/**
 * WhatsApp Business oficial (Meta), pela Cloud API. A sessão é da conta: não há
 * QR para escanear nem logout pelo app. O estado consultado no número é real —
 * se a chamada falha, a tela mostra o erro.
 */
function criarMeta(cfg: Config | null) {
  const meta = {
    async consultarStatus(): Promise<EstadoDaSessao> {
      try {
        // Na Cloud API a base já é o número.
        const r = await chamar<Record<string, unknown>>(
          cfg,
          "?fields=display_phone_number,quality_rating",
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
      const r = await chamar<Record<string, unknown>>(cfg, "/messages", "POST", {
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
      const r = await chamar<Record<string, unknown>>(cfg, "/messages", "POST", {
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
    /** Mensagem interativa com até 3 botões (só dentro da janela de 24h). */
    async enviarInterativo(telefone: string, i: MensagemInterativa) {
      const r = await chamar<Record<string, unknown>>(cfg, "/messages", "POST", {
        messaging_product: "whatsapp",
        to: telefone.replace(/\D/g, ""),
        type: "interactive",
        interactive: {
          type: "button",
          body: { text: i.texto.slice(0, 1024) },
          ...(i.rodape ? { footer: { text: i.rodape.slice(0, 60) } } : {}),
          action: {
            buttons: i.botoes.slice(0, 3).map((b) => ({
              type: "reply",
              reply: { id: b.id.slice(0, 256), title: b.titulo.slice(0, 20) },
            })),
          },
        },
      });
      const lista = (r["messages"] as Record<string, unknown>[]) ?? [];
      return { id: (lista[0]?.["id"] as string) ?? null };
    },
    async obterCodigoDePareamento(): Promise<CodigoDePareamento> {
      throw new Error(SEM_PAREAMENTO);
    },
    reiniciarSessao(): Promise<EstadoDaSessao> {
      return meta.consultarStatus();
    },
    async desconectar(): Promise<void> {
      // O desvínculo da conta oficial é feito em Connectors → WhatsApp, não pelo app.
    },
  };
  return meta;
}

export type ModeloComBotoes = {
  nome: string;
  idioma: string;
  parametros: string[];
  botoes: string[];
};
export type MensagemInterativa = {
  texto: string;
  rodape?: string | null;
  botoes: { id: string; titulo: string }[];
};

/**
 * Interface única do provedor para uma conexão. `preferido` é o `provedor`
 * gravado em `conexoes_whatsapp`: Evolution e Meta coexistem por negócio.
 * Sem preferência, vale a configuração global (comportamento anterior).
 */
export function gatewayDoProvedor(preferido?: string | null) {
  // Lido a cada chamada: as credenciais só existem dentro do handler.
  const config = () => lerConfig(preferido);
  const oficial = () => config()?.provedor === "meta";
  const impl = () => {
    const c = config();
    if (!c) throw new GatewayNaoConfiguradoError();
    if (c.provedor === "meta") return criarMeta(c);
    return c.provedor === "generico" ? criarGenerico(c) : criarEvolution(c);
  };
  return {
    provedor: () => config()?.provedor ?? null,
    criarSessao: (sessaoId: string, webhookUrl: string) => impl().criarSessao(sessaoId, webhookUrl),
    obterQrCode: (sessaoId: string) => impl().obterQrCode(sessaoId),
    consultarStatus: (sessaoId: string) => impl().consultarStatus(sessaoId),
    obterCodigoDePareamento: (sessaoId: string, numero: string) =>
      impl().obterCodigoDePareamento(sessaoId, numero),
    enviarMensagem: (sessaoId: string, telefone: string, texto: string) =>
      impl().enviarMensagem(sessaoId, telefone, texto),
    /** Só a API oficial garante botões; nos demais provedores devolve null. */
    enviarTemplate: (telefone: string, t: ModeloComBotoes) =>
      oficial() ? criarMeta(config()).enviarTemplate(telefone, t) : Promise.resolve(null),
    enviarInterativo: (telefone: string, i: MensagemInterativa) =>
      oficial() ? criarMeta(config()).enviarInterativo(telefone, i) : Promise.resolve(null),
    /**
     * O que o canal suporta. Oficial: botões via template e janela de 24h
     * para mensagens iniciadas pelo negócio. Demais: opções numeradas, sem janela.
     */
    capacidades: () => ({ botoes: oficial(), exigeTemplateForaDaJanela: oficial() }),
    reiniciarSessao: (sessaoId: string) => impl().reiniciarSessao(sessaoId),
    desconectar: (sessaoId: string) => impl().desconectar(sessaoId),
  };
}

/** Provedor global (compatibilidade). Prefira `gatewayDoProvedor(conexao.provedor)`. */
export const gatewayDeWhatsapp = gatewayDoProvedor(null);
