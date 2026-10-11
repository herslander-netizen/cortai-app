/**
 * Gateway interno de IA do CortAI — só servidor.
 *
 * Fala com o Lovable AI Gateway pela Responses API, sempre em streaming (SSE),
 * e devolve o `output` final da resposta. A chave nunca sai do servidor.
 * Reaproveita o id de execução devolvido pelo gateway nas chamadas seguintes
 * da mesma rodada (passos de ferramenta), sem nunca criar um id próprio.
 */

import type { Canal } from "./acoes.server";
import {
  chamarCompativel,
  ErroDoProvedor,
  lerConfigDoProvedor,
  type LeituraDaConfig,
  type UsoDeTokens,
} from "./gateway-compativel.server";

export const MODELO_CORTAI = "openai/gpt-6-astra";
const URL_RESPOSTAS = "https://ai.gateway.lovable.dev/v1/responses";
const CABECALHO_RUN = "X-Lovable-AIG-Run-ID";

export type ItemDeEntrada = Record<string, unknown>;
export type FerramentaDoModelo = {
  type: "function";
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  strict: false;
};

/** Erro do gateway com o status preservado (402/403 pausam a IA; 429/5xx são transitórios). */
export class ErroDoGateway extends Error {
  constructor(
    readonly status: number,
    mensagem: string,
  ) {
    super(mensagem);
  }
  get semCredito() {
    return this.status === 402 || this.status === 403;
  }
}

/**
 * Qual provedor atende cada canal do cérebro. Sem `CORTAI_AI_PROVIDER` é o Lovable AI
 * Gateway de sempre. `openai_compatible` usa CORTAI_AI_BASE_URL/MODEL/API_KEY (ex.: GPT-OSS-20B)
 * SÓ nos canais de `CORTAI_AI_CANAIS` (padrão: painel); os outros seguem no Lovable.
 * Voltar ao modelo anterior = remover o canal da lista ou as variáveis `CORTAI_AI_*`.
 */
function resolverProvedor(canal?: Canal): LeituraDaConfig {
  const leitura = lerConfigDoProvedor();
  if (!leitura.ok || leitura.config.tipo !== "compativel") return leitura;
  if (!canal || leitura.config.canais.includes(canal)) return leitura;
  return { ok: true, config: { tipo: "lovable" } };
}

export function identidadeDoModelo(canal?: Canal): { provedor: string; modelo: string } {
  const leitura = resolverProvedor(canal);
  if (leitura.ok && leitura.config.tipo === "compativel")
    return { provedor: leitura.config.nome, modelo: leitura.config.modelo };
  return { provedor: "lovable", modelo: MODELO_CORTAI };
}

/** Sem `canal`, responde "alguma IA está configurada?" (usado só no painel de status). */
export function iaDisponivel(canal?: Canal): boolean {
  const leitura = resolverProvedor(canal);
  if (!leitura.ok) return false;
  if (leitura.config.tipo === "compativel") return true;
  if (process.env["LOVABLE_API_KEY"]) return true;
  // Sem chave do Lovable: ainda há IA se o provedor novo está válido e o canal não foi pedido.
  const global = lerConfigDoProvedor();
  return !canal && global.ok && global.config.tipo === "compativel";
}

/** O que cada chamada ao modelo deixa para a observabilidade (sem conteúdo de conversa). */
export type EventoDeChamada = {
  provedor: string;
  modelo: string;
  latenciaMs: number;
  ok: boolean;
  httpStatus?: number;
  uso?: UsoDeTokens;
  /** Nomes das ferramentas pedidas pelo modelo nesta rodada. */
  ferramentas: string[];
  geroutexto: boolean;
};

function mensagemSegura(status: number): string {
  if (status === 402) return "Os créditos de IA do CortAI acabaram.";
  if (status === 403) return "A IA do CortAI está bloqueada para este negócio agora.";
  if (status === 429) return "A IA do CortAI está sobrecarregada. Tente de novo em instantes.";
  if (status === 401) return "A IA do CortAI está sem configuração neste ambiente.";
  return "A IA do CortAI não conseguiu responder agora.";
}

/** Lê o SSE até `response.completed` e devolve os itens de saída. */
async function lerStream(
  resposta: Response,
  aoUso?: (uso: UsoDeTokens) => void,
): Promise<ItemDeEntrada[]> {
  const leitor = resposta.body?.getReader();
  if (!leitor) return [];
  const decodificador = new TextDecoder();
  let buffer = "";
  let saida: ItemDeEntrada[] | null = null;
  const itensFeitos: ItemDeEntrada[] = [];
  for (;;) {
    const { value, done } = await leitor.read();
    if (done) break;
    buffer += decodificador.decode(value, { stream: true });
    let fim: number;
    while ((fim = buffer.indexOf("\n\n")) >= 0) {
      const bloco = buffer.slice(0, fim);
      buffer = buffer.slice(fim + 2);
      const dados = bloco
        .split("\n")
        .filter((l) => l.startsWith("data:"))
        .map((l) => l.slice(5).trim())
        .join("");
      if (!dados || dados === "[DONE]") continue;
      let evento: Record<string, any>;
      try {
        evento = JSON.parse(dados);
      } catch {
        continue;
      }
      if (evento["type"] === "response.output_item.done" && evento["item"]) {
        itensFeitos.push(evento["item"]);
      } else if (evento["type"] === "response.completed") {
        saida = (evento["response"]?.output as ItemDeEntrada[]) ?? null;
        const u = evento["response"]?.usage as Record<string, unknown> | undefined;
        if (u && aoUso) {
          const num = (v: unknown) => (typeof v === "number" ? v : undefined);
          const uso: UsoDeTokens = {};
          const e = num(u["input_tokens"]);
          const sd = num(u["output_tokens"]);
          const t = num(u["total_tokens"]);
          if (e !== undefined) uso.entrada = e;
          if (sd !== undefined) uso.saida = sd;
          if (t !== undefined) uso.total = t;
          aoUso(uso);
        }
      } else if (evento["type"] === "response.failed" || evento["type"] === "error") {
        throw new ErroDoGateway(500, mensagemSegura(500));
      }
    }
  }
  return saida ?? itensFeitos;
}

export function criarSessaoDoGateway(opcoes?: {
  canal?: Canal;
  aoChamar?: (e: EventoDeChamada) => void;
}) {
  let runId: string | undefined;
  const avisar = (e: EventoDeChamada) => {
    try {
      opcoes?.aoChamar?.(e);
    } catch {
      /* observabilidade nunca derruba o atendimento */
    }
  };
  const resumo = (itens: ItemDeEntrada[]) => ({
    ferramentas: itens
      .filter((i) => i["type"] === "function_call")
      .map((i) => String(i["name"] ?? "")),
    geroutexto: textoDaSaida(itens).length > 0,
  });
  return {
    async responder(input: {
      instrucoes: string;
      entrada: ItemDeEntrada[];
      ferramentas: FerramentaDoModelo[];
    }): Promise<ItemDeEntrada[]> {
      const inicio = Date.now();
      const leitura = resolverProvedor(opcoes?.canal);
      if (!leitura.ok) {
        console.error(`[cerebro] ${leitura.motivo}`);
        throw new ErroDoGateway(401, mensagemSegura(401));
      }
      const identidade = identidadeDoModelo(opcoes?.canal);
      const base = { ...identidade, ferramentas: [] as string[], geroutexto: false };

      if (leitura.config.tipo === "compativel") {
        try {
          const { itens, uso } = await chamarCompativel(leitura.config, input);
          avisar({
            ...base,
            ...resumo(itens),
            latenciaMs: Date.now() - inicio,
            ok: true,
            uso,
          });
          return itens;
        } catch (erro) {
          const status = erro instanceof ErroDoProvedor ? erro.status : 500;
          avisar({ ...base, latenciaMs: Date.now() - inicio, ok: false, httpStatus: status });
          throw new ErroDoGateway(status, mensagemSegura(status));
        }
      }

      const chave = process.env["LOVABLE_API_KEY"];
      if (!chave) throw new ErroDoGateway(401, mensagemSegura(401));
      const headers = new Headers({
        "Content-Type": "application/json",
        "Lovable-API-Key": chave,
        "X-Lovable-AIG-SDK": "fetch",
      });
      if (runId) headers.set(CABECALHO_RUN, runId);
      const resposta = await fetch(URL_RESPOSTAS, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: MODELO_CORTAI,
          instructions: input.instrucoes,
          input: input.entrada,
          tools: input.ferramentas,
          stream: true,
          store: false,
          reasoning: { effort: "low", summary: "auto" },
          include: ["reasoning.encrypted_content"],
        }),
      });
      runId ??= resposta.headers.get(CABECALHO_RUN)?.trim() || undefined;
      if (!resposta.ok) {
        const corpo = await resposta.text().catch(() => "");
        console.error(`[cerebro] gateway ${resposta.status}: ${corpo.slice(0, 300)}`);
        avisar({
          ...base,
          latenciaMs: Date.now() - inicio,
          ok: false,
          httpStatus: resposta.status,
        });
        throw new ErroDoGateway(resposta.status, mensagemSegura(resposta.status));
      }
      let uso: UsoDeTokens | undefined;
      try {
        const itens = await lerStream(resposta, (u) => (uso = u));
        avisar({
          ...base,
          ...resumo(itens),
          latenciaMs: Date.now() - inicio,
          ok: true,
          ...(uso ? { uso } : {}),
        });
        return itens;
      } catch (erro) {
        avisar({ ...base, latenciaMs: Date.now() - inicio, ok: false });
        throw erro;
      }
    },
  };
}

/** Texto final de uma lista de itens de saída. */
export function textoDaSaida(itens: ItemDeEntrada[]): string {
  return itens
    .filter((i) => i["type"] === "message")
    .flatMap((i) => (i["content"] as Record<string, unknown>[] | undefined) ?? [])
    .filter((c) => c["type"] === "output_text")
    .map((c) => String(c["text"] ?? ""))
    .join("")
    .trim();
}
