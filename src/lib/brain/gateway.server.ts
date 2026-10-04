/**
 * Gateway interno de IA do CortAI — só servidor.
 *
 * Fala com o Lovable AI Gateway pela Responses API, sempre em streaming (SSE),
 * e devolve o `output` final da resposta. A chave nunca sai do servidor.
 * Reaproveita o id de execução devolvido pelo gateway nas chamadas seguintes
 * da mesma rodada (passos de ferramenta), sem nunca criar um id próprio.
 */

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

export function iaDisponivel(): boolean {
  return Boolean(process.env["LOVABLE_API_KEY"]);
}

function mensagemSegura(status: number): string {
  if (status === 402) return "Os créditos de IA do CortAI acabaram.";
  if (status === 403) return "A IA do CortAI está bloqueada para este negócio agora.";
  if (status === 429) return "A IA do CortAI está sobrecarregada. Tente de novo em instantes.";
  if (status === 401) return "A IA do CortAI está sem configuração neste ambiente.";
  return "A IA do CortAI não conseguiu responder agora.";
}

/** Lê o SSE até `response.completed` e devolve os itens de saída. */
async function lerStream(resposta: Response): Promise<ItemDeEntrada[]> {
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
      } else if (evento["type"] === "response.failed" || evento["type"] === "error") {
        throw new ErroDoGateway(500, mensagemSegura(500));
      }
    }
  }
  return saida ?? itensFeitos;
}

export function criarSessaoDoGateway() {
  let runId: string | undefined;
  return {
    async responder(input: {
      instrucoes: string;
      entrada: ItemDeEntrada[];
      ferramentas: FerramentaDoModelo[];
    }): Promise<ItemDeEntrada[]> {
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
        throw new ErroDoGateway(resposta.status, mensagemSegura(resposta.status));
      }
      return lerStream(resposta);
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
