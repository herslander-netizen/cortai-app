/** Gateway interno de IA do Flow. Só usa provedor compatível configurado no servidor. */

import type { Canal } from "./acoes.server";
import { modoBasicoLigado, planejarModoBasico } from "./modo-basico";
import {
  chamarCompativel,
  ErroDoProvedor,
  lerConfigDoProvedor,
  type ConfigCompativel,
  type LeituraDaConfig,
  type UsoDeTokens,
} from "./gateway-compativel.server";

export const MODELO_CORTAI = "openai/gpt-oss-20b";

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
    /** Provedor que recusou: a pausa por crédito só vale para ele, não para outro configurado depois. */
    readonly provedor: string = "não configurado",
  ) {
    super(mensagem);
  }
  get semCredito() {
    return this.status === 402 || this.status === 403;
  }
}

/**
 * Resolve o provedor por canal. Só usa o provedor explicitamente configurado ou o modo de
 * regras; sem configuração, a IA fica indisponível.
 */
function resolverProvedor(canal?: Canal): LeituraDaConfig {
  const leitura = lerConfigDoProvedor();
  if (!leitura.ok) return leitura;
  if (leitura.config.tipo === "regras")
    return !canal || canal === "painel"
      ? leitura
      : { ok: false, motivo: "O modo por regras está disponível apenas no painel." };
  if (!canal || leitura.config.canais.includes(canal)) return leitura;
  return { ok: false, motivo: `Nenhum provedor independente configurado para o canal ${canal}.` };
}

export function identidadeDoModelo(canal?: Canal): { provedor: string; modelo: string } {
  const leitura = resolverProvedor(canal);
  if (leitura.ok && leitura.config.tipo === "regras")
    return { provedor: "modo-basico", modelo: "regras" };
  if (leitura.ok && leitura.config.tipo === "compativel")
    return { provedor: leitura.config.nome, modelo: leitura.config.modelo };
  return { provedor: "não configurado", modelo: MODELO_CORTAI };
}

/** Provedor compatível configurado para o canal, ou null se indisponível. */
export function provedorCompativelDoCanal(canal: Canal): ConfigCompativel | null {
  const leitura = resolverProvedor(canal);
  return leitura.ok && leitura.config.tipo === "compativel" ? leitura.config : null;
}

/** Sem `canal`, responde "alguma IA está configurada?" (usado só no painel de status). */
export function iaDisponivel(canal?: Canal): boolean {
  // No painel o modo básico (regras) é a rede de segurança: sempre há como responder.
  if (canal === "painel" && modoBasicoLigado()) return true;
  const leitura = resolverProvedor(canal);
  if (!leitura.ok) return false;
  if (leitura.config.tipo === "regras") return true;
  if (leitura.config.tipo === "compativel") return true;
  return false;
}

/** O que cada chamada ao modelo deixa para a observabilidade (sem conteúdo de conversa). */
export type EventoDeChamada = {
  provedor: string;
  modelo: string;
  latenciaMs: number;
  ok: boolean;
  httpStatus?: number;
  categoriaErro?: "autenticacao" | "credito" | "permissao" | "limite" | "temporario" | "rede";
  uso?: UsoDeTokens;
  /** Nomes das ferramentas pedidas pelo modelo nesta rodada. */
  ferramentas: string[];
  geroutexto: boolean;
};

function mensagemSegura(status: number): string {
  if (status === 402) return "Os créditos de IA do Flow acabaram.";
  if (status === 403) return "A IA do Flow está bloqueada para este negócio agora.";
  if (status === 429) return "A IA do Flow está sobrecarregada. Tente de novo em instantes.";
  if (status === 401) return "A autenticação da IA do Flow foi recusada neste ambiente.";
  return "A IA do Flow não conseguiu responder agora.";
}

function categoriaDoStatus(status: number): EventoDeChamada["categoriaErro"] {
  if (status === 401) return "autenticacao";
  if (status === 402) return "credito";
  if (status === 403) return "permissao";
  if (status === 429) return "limite";
  if (status === 502 || status === 504) return "rede";
  if (status >= 500) return "temporario";
  return undefined;
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
  /** Papel e profissional de quem fala (o modo básico precisa para agendar para a pessoa certa). */
  papel?: string | null;
  profissionalId?: string | null;
  /** Capacidades especializadas podem exigir o provedor real, sem resposta por regras. */
  usarModoBasico?: boolean;
  aoChamar?: (e: EventoDeChamada) => void;
}) {
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
  type EntradaDoPasso = {
    instrucoes: string;
    entrada: ItemDeEntrada[];
    ferramentas: FerramentaDoModelo[];
  };
  let usandoBasico = false;
  const usarModoBasico = opcoes?.usarModoBasico ?? true;

  /** Modo básico: o "modelo" é um conjunto de regras (sem IA, sem chave, sem custo). */
  const pelasRegras = (input: EntradaDoPasso): ItemDeEntrada[] => {
    const inicio = Date.now();
    const itens = planejarModoBasico({
      instrucoes: input.instrucoes,
      entrada: input.entrada,
      ferramentas: input.ferramentas,
      papel: opcoes?.papel,
      profissionalId: opcoes?.profissionalId,
    });
    avisar({
      provedor: "modo-basico",
      modelo: "regras",
      latenciaMs: Date.now() - inicio,
      ok: true,
      ...resumo(itens),
    });
    return itens;
  };

  const pelaIA = async (input: EntradaDoPasso): Promise<ItemDeEntrada[]> => {
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
      } catch (erroPrimario) {
        const statusPrimario = erroPrimario instanceof ErroDoProvedor ? erroPrimario.status : 500;
        const categoriaPrimaria = categoriaDoStatus(statusPrimario);
        avisar({
          ...base,
          latenciaMs: Date.now() - inicio,
          ok: false,
          httpStatus: statusPrimario,
          ...(categoriaPrimaria ? { categoriaErro: categoriaPrimaria } : {}),
        });

        // Só falhas transitórias acionam o secundário. Erros de credencial, bloqueio
        // ou crédito (401/402/403) não são mascarados por outro provedor.
        const fallback = leitura.config.fallback;
        const transitoria = statusPrimario === 429 || statusPrimario >= 500;
        if (!fallback || !transitoria) {
          throw new ErroDoGateway(statusPrimario, mensagemSegura(statusPrimario), identidade.provedor);
        }

        const inicioFallback = Date.now();
        const configFallback: ConfigCompativel = {
          tipo: "compativel",
          ...fallback,
          canais: leitura.config.canais,
        };
        const identidadeFallback = { provedor: fallback.nome, modelo: fallback.modelo };
        const baseFallback = {
          ...identidadeFallback,
          ferramentas: [] as string[],
          geroutexto: false,
        };
        try {
          const { itens, uso } = await chamarCompativel(configFallback, input);
          avisar({
            ...baseFallback,
            ...resumo(itens),
            latenciaMs: Date.now() - inicioFallback,
            ok: true,
            uso,
          });
          return itens;
        } catch (erroFallback) {
          const statusFallback = erroFallback instanceof ErroDoProvedor ? erroFallback.status : 500;
          const categoriaFallback = categoriaDoStatus(statusFallback);
          avisar({
            ...baseFallback,
            latenciaMs: Date.now() - inicioFallback,
            ok: false,
            httpStatus: statusFallback,
            ...(categoriaFallback ? { categoriaErro: categoriaFallback } : {}),
          });
          throw new ErroDoGateway(
            statusFallback,
            mensagemSegura(statusFallback),
            identidadeFallback.provedor,
          );
        }
      }
    }

    const erro = new ErroDoGateway(401, mensagemSegura(401), "não configurado");
    avisar({ ...base, latenciaMs: Date.now() - inicio, ok: false, httpStatus: 401 });
    throw erro;
  };

  return {
    /** Esta sessão respondeu pelo modo básico (a IA está desligada, sem crédito ou fora do ar)? */
    usouModoBasico: () => usandoBasico,
    async responder(input: EntradaDoPasso): Promise<ItemDeEntrada[]> {
      const leitura = resolverProvedor(opcoes?.canal);
      // Escolha explícita (CORTAI_AI_PROVIDER=regras) ou rede de segurança já acionada neste turno.
      if (usarModoBasico && (usandoBasico || (leitura.ok && leitura.config.tipo === "regras"))) {
        usandoBasico = true;
        return pelasRegras(input);
      }
      try {
        return await pelaIA(input);
      } catch (erro) {
        // Só no painel e de forma VISÍVEL (a resposta avisa): a equipe nunca fica sem resposta.
        if (usarModoBasico && opcoes?.canal === "painel" && modoBasicoLigado()) {
          usandoBasico = true;
          return pelasRegras(input);
        }
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
