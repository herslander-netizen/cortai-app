/**
 * Provedor de IA compatível com a API Chat Completions (ex.: GPT-OSS-20B hospedado).
 *
 * Só servidor. Traduz o formato interno do cérebro (itens no estilo Responses API:
 * `message`, `function_call`, `function_call_output`) para mensagens de chat e de volta,
 * sem tocar no agente: `agente.server.ts` continua falando o mesmo idioma de sempre.
 *
 * Princípios:
 * - sem provedor secundário parcial: configuração incompleta = IA indisponível;
 * - fallback explícito e opcional só para falhas transitórias do provedor primário;
 * - o raciocínio interno do modelo nunca chega ao usuário (tokens/blocos são removidos);
 * - sem timeout infinito; a chave só vai no cabeçalho Authorization e nunca é logada.
 */
import type { Canal } from "./acoes.server";
import type { FerramentaDoModelo, ItemDeEntrada } from "./gateway.server";

export type ConfigSecundaria = {
  /** Host do provedor secundário (para rastreio); não é segredo. */
  nome: string;
  baseUrl: string;
  modelo: string;
  chave: string;
  tempoLimiteMs: number;
  esforcoDeRaciocinio: "low" | "medium" | "high" | null;
};

export type ConfigCompativel = {
  tipo: "compativel";
  /** Host do provedor (para rastreio); não é segredo. */
  nome: string;
  baseUrl: string;
  modelo: string;
  chave: string;
  tempoLimiteMs: number;
  esforcoDeRaciocinio: "low" | "medium" | "high" | null;
  /** Canais explicitamente autorizados a usar este provedor. */
  canais: Canal[];
  /** Alternativa opcional; só acionada em falha transitória do primário. */
  fallback?: ConfigSecundaria;
};

export type ConfigDoProvedor = { tipo: "regras" } | ConfigCompativel;

export type LeituraDaConfig =
  { ok: true; config: ConfigDoProvedor } | { ok: false; motivo: string };

type Env = Record<string, string | undefined>;

const TEMPO_LIMITE_PADRAO_MS = 45_000;

function ehLocal(host: string) {
  return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
}

/**
 * Lê `CORTAI_AI_*`. Provedor ausente ou desconhecido significa IA indisponível:
 * nenhum pedido cai silenciosamente em outro provedor.
 */
export function lerConfigDoProvedor(env: Env = process.env): LeituraDaConfig {
  const bruto = (env["CORTAI_AI_PROVIDER"] ?? "").trim().toLowerCase();
  if (!bruto)
    return {
      ok: false,
      motivo: "Configure CORTAI_AI_PROVIDER e as credenciais do provedor de IA.",
    };
  // Modo básico por regras: sem IA, sem chave, sem custo (só painel).
  if (bruto === "regras") return { ok: true, config: { tipo: "regras" } };
  // Ollama Cloud expõe a mesma superfície compatível; os aliases deixam a intenção
  // explícita no secret sem criar um segundo provedor ou caminho de execução.
  if (bruto !== "openai_compatible" && bruto !== "ollama" && bruto !== "ollama_cloud")
    return { ok: false, motivo: `CORTAI_AI_PROVIDER inválido ("${bruto.slice(0, 40)}").` };

  const baseUrl = (env["CORTAI_AI_BASE_URL"] ?? "").trim().replace(/\/+$/, "");
  const modelo = (env["CORTAI_AI_MODEL"] ?? "").trim();
  const chave = (env["CORTAI_AI_API_KEY"] ?? "").trim();
  if (!baseUrl || !modelo || !chave)
    return {
      ok: false,
      motivo: "Faltam CORTAI_AI_BASE_URL, CORTAI_AI_MODEL ou CORTAI_AI_API_KEY.",
    };

  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    return { ok: false, motivo: "CORTAI_AI_BASE_URL não é uma URL válida." };
  }
  if (url.protocol !== "https:" && !(url.protocol === "http:" && ehLocal(url.hostname)))
    return { ok: false, motivo: "CORTAI_AI_BASE_URL precisa usar https." };

  // Migração por fluxo: por padrão só o painel (interno) usa o provedor novo.
  const pedidos = (env["CORTAI_AI_CANAIS"] ?? "painel")
    .split(",")
    .map((c) => c.trim().toLowerCase())
    .filter(Boolean);
  const canais = pedidos.filter(
    (c): c is Canal => c === "painel" || c === "whatsapp" || c === "site",
  );
  if (!canais.length || canais.length !== pedidos.length)
    return { ok: false, motivo: "CORTAI_AI_CANAIS aceita só painel, whatsapp e site." };

  const lerTempoLimite = (valor: string | undefined) => {
    const numero = Number(valor);
    return Number.isFinite(numero) && numero >= 1_000 && numero <= 120_000
      ? numero
      : TEMPO_LIMITE_PADRAO_MS;
  };
  const lerEsforco = (valor: string | undefined) => {
    const esforco = (valor ?? "").trim().toLowerCase();
    return esforco === "low" || esforco === "medium" || esforco === "high" ? esforco : null;
  };

  // A alternativa é totalmente opcional. Se qualquer variável dela foi definida,
  // exigimos o conjunto completo para evitar um fallback aparentemente ativo, mas inválido.
  const fallbackBaseUrl = (env["CORTAI_AI_FALLBACK_BASE_URL"] ?? "")
    .trim()
    .replace(/\/+$/, "");
  const fallbackModelo = (env["CORTAI_AI_FALLBACK_MODEL"] ?? "").trim();
  const fallbackChave = (env["CORTAI_AI_FALLBACK_API_KEY"] ?? "").trim();
  const fallbackConfigurado = Boolean(fallbackBaseUrl || fallbackModelo || fallbackChave);
  let fallback: ConfigSecundaria | undefined;
  if (fallbackConfigurado) {
    if (!fallbackBaseUrl || !fallbackModelo || !fallbackChave) {
      return {
        ok: false,
        motivo:
          "Fallback incompleto: configure CORTAI_AI_FALLBACK_BASE_URL, CORTAI_AI_FALLBACK_MODEL e CORTAI_AI_FALLBACK_API_KEY.",
      };
    }
    let fallbackUrl: URL;
    try {
      fallbackUrl = new URL(fallbackBaseUrl);
    } catch {
      return { ok: false, motivo: "CORTAI_AI_FALLBACK_BASE_URL não é uma URL válida." };
    }
    if (
      fallbackUrl.protocol !== "https:" &&
      !(fallbackUrl.protocol === "http:" && ehLocal(fallbackUrl.hostname))
    ) {
      return { ok: false, motivo: "CORTAI_AI_FALLBACK_BASE_URL precisa usar https." };
    }
    fallback = {
      nome: fallbackUrl.hostname,
      baseUrl: fallbackBaseUrl,
      modelo: fallbackModelo,
      chave: fallbackChave,
      tempoLimiteMs: lerTempoLimite(env["CORTAI_AI_FALLBACK_TIMEOUT_MS"]),
      esforcoDeRaciocinio: lerEsforco(env["CORTAI_AI_FALLBACK_REASONING_EFFORT"]),
    };
  }

  return {
    ok: true,
    config: {
      tipo: "compativel",
      nome: url.hostname,
      baseUrl,
      modelo,
      chave,
      tempoLimiteMs: lerTempoLimite(env["CORTAI_AI_TIMEOUT_MS"]),
      esforcoDeRaciocinio: lerEsforco(env["CORTAI_AI_REASONING_EFFORT"]),
      canais,
      ...(fallback ? { fallback } : {}),
    },
  };
}

/* ------------------------- Tradução de formatos ------------------------- */

type MensagemDeChat = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: {
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }[];
  tool_call_id?: string;
};

function textoDoItem(item: ItemDeEntrada): string {
  const c = item["content"];
  if (typeof c === "string") return c;
  if (Array.isArray(c))
    return c
      .map((p) =>
        p && typeof p === "object" ? String((p as Record<string, unknown>)["text"] ?? "") : "",
      )
      .join("");
  return "";
}

/** Itens internos (histórico + passos de ferramenta) → mensagens de chat. */
export function itensParaMensagens(instrucoes: string, entrada: ItemDeEntrada[]): MensagemDeChat[] {
  const mensagens: MensagemDeChat[] = [{ role: "system", content: instrucoes }];
  for (const item of entrada) {
    const tipo = item["type"];
    if (tipo === "reasoning") continue;
    if (tipo === "function_call") {
      const anterior = mensagens[mensagens.length - 1];
      const alvo =
        anterior && anterior.role === "assistant"
          ? anterior
          : (mensagens[mensagens.push({ role: "assistant", content: null }) - 1] as MensagemDeChat);
      (alvo.tool_calls ??= []).push({
        id: String(item["call_id"] ?? item["id"] ?? ""),
        type: "function",
        function: {
          name: String(item["name"] ?? ""),
          arguments: typeof item["arguments"] === "string" ? item["arguments"] : "{}",
        },
      });
      continue;
    }
    if (tipo === "function_call_output") {
      mensagens.push({
        role: "tool",
        tool_call_id: String(item["call_id"] ?? ""),
        content:
          typeof item["output"] === "string"
            ? item["output"]
            : JSON.stringify(item["output"] ?? null),
      });
      continue;
    }
    if (tipo === "message" || typeof item["role"] === "string") {
      const papel =
        item["role"] === "user" ? "user" : item["role"] === "system" ? "system" : "assistant";
      mensagens.push({ role: papel, content: textoDoItem(item) });
    }
  }
  return mensagens;
}

export function ferramentasParaChat(ferramentas: FerramentaDoModelo[]) {
  return ferramentas.map((f) => ({
    type: "function" as const,
    function: { name: f.name, description: f.description, parameters: f.parameters },
  }));
}

/**
 * Remove o que é raciocínio interno ou marca de formato do modelo
 * (`<|channel|>analysis...`, `<think>...</think>`, `<|end|>`): nunca vai ao usuário.
 */
export function limparMarcasInternas(texto: string): string {
  // Formato "harmony" do GPT-OSS: se vazou, só vale o que está no canal "final".
  const marcaFinal = "<|channel|>final<|message|>";
  const posFinal = texto.lastIndexOf(marcaFinal);
  const util = posFinal >= 0 ? texto.slice(posFinal + marcaFinal.length) : texto;
  return util
    .replace(
      /<\|channel\|>\s*(?:analysis|commentary)\s*<\|message\|>[\s\S]*?(?:<\|end\|>|<\|start\|>|$)/g,
      "",
    )
    .replace(/<think>[\s\S]*?(?:<\/think>|$)/gi, "")
    .replace(/<\|[^|>]{1,40}\|>/g, "")
    .trim();
}

export type UsoDeTokens = { entrada?: number; saida?: number; total?: number };

export class ErroDoProvedor extends Error {
  constructor(
    readonly status: number,
    mensagem: string,
  ) {
    super(mensagem);
  }
}

/** Resposta de chat → itens internos (texto e chamadas de ferramenta). */
export function respostaParaItens(corpo: unknown): { itens: ItemDeEntrada[]; uso: UsoDeTokens } {
  const objeto = (v: unknown): Record<string, unknown> | undefined =>
    v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined;
  const raiz = objeto(corpo) ?? {};
  const escolha = objeto(Array.isArray(raiz["choices"]) ? raiz["choices"][0] : undefined);
  const msg = objeto(escolha?.["message"]);
  if (!msg) throw new ErroDoProvedor(502, "Resposta sem mensagem.");

  const chamadas = Array.isArray(msg["tool_calls"]) ? (msg["tool_calls"] as unknown[]) : [];
  if (escolha?.["finish_reason"] === "length" && chamadas.length)
    throw new ErroDoProvedor(502, "Resposta cortada no meio de uma chamada de ferramenta.");

  const itens: ItemDeEntrada[] = [];
  const texto = typeof msg["content"] === "string" ? limparMarcasInternas(msg["content"]) : "";
  if (texto)
    itens.push({
      type: "message",
      role: "assistant",
      content: [{ type: "output_text", text: texto }],
    });
  chamadas.forEach((chamada, i) => {
    const c = objeto(chamada);
    const funcao = objeto(c?.["function"]);
    const args = funcao?.["arguments"];
    itens.push({
      type: "function_call",
      name: String(funcao?.["name"] ?? ""),
      arguments: typeof args === "string" ? args : JSON.stringify(args ?? {}),
      call_id: String(c?.["id"] || `call_${Date.now().toString(36)}_${i}`),
    });
  });

  const u = objeto(raiz["usage"]);
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
  const uso: UsoDeTokens = {};
  const entrada = num(u?.["prompt_tokens"]);
  const saida = num(u?.["completion_tokens"]);
  const total = num(u?.["total_tokens"]);
  if (entrada !== undefined) uso.entrada = entrada;
  if (saida !== undefined) uso.saida = saida;
  if (total !== undefined) uso.total = total;
  return { itens, uso };
}

/** Uma rodada no provedor compatível. Erros viram `ErroDoProvedor` (com status HTTP). */
export async function chamarCompativel(
  config: ConfigCompativel,
  input: { instrucoes: string; entrada: ItemDeEntrada[]; ferramentas: FerramentaDoModelo[] },
  buscar: typeof fetch = fetch,
): Promise<{ itens: ItemDeEntrada[]; uso: UsoDeTokens }> {
  const controle = new AbortController();
  const relogio = setTimeout(() => controle.abort(), config.tempoLimiteMs);
  try {
    const ferramentas = ferramentasParaChat(input.ferramentas);
    const resposta = await buscar(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.chave}` },
      signal: controle.signal,
      body: JSON.stringify({
        model: config.modelo,
        messages: itensParaMensagens(input.instrucoes, input.entrada),
        ...(ferramentas.length ? { tools: ferramentas, tool_choice: "auto" } : {}),
        temperature: 0.2,
        stream: false,
        ...(config.esforcoDeRaciocinio ? { reasoning_effort: config.esforcoDeRaciocinio } : {}),
      }),
    });
    if (!resposta.ok) {
      // Nunca registre o corpo: mensagens de erro de terceiros podem carregar prompt,
      // identificadores ou outros dados sensíveis. O gateway já preserva o status para a
      // política de fallback e para o estado visível da Flow IA.
      console.warn(
        JSON.stringify({
          evento: "cortai_ai_provider_error",
          provedor: config.nome,
          status: resposta.status,
        }),
      );
      throw new ErroDoProvedor(resposta.status, "provedor recusou");
    }
    return respostaParaItens(await resposta.json());
  } catch (erro) {
    if (erro instanceof ErroDoProvedor) throw erro;
    throw new ErroDoProvedor(controle.signal.aborted ? 504 : 502, "provedor inacessível");
  } finally {
    clearTimeout(relogio);
  }
}
