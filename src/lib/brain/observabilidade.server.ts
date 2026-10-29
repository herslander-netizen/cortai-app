/**
 * Observabilidade da Flow IA — rastreio de cada turno no Langfuse. Só servidor.
 *
 * Papel: OBSERVAR. Nada aqui autoriza, bloqueia ou executa ação; se o Langfuse
 * estiver fora do ar, desligado ou mal configurado, o atendimento segue igual.
 *
 * Como envia: OTLP/HTTP em JSON para `/api/public/otel/v1/traces` (a API de ingestão
 * antiga do Langfuse está em desativação). É um `fetch` simples — sem SDK — porque o
 * app roda em Workers (Nitro/Cloudflare), onde o SDK de Node/OpenTelemetry não é garantido.
 *
 * Privacidade (padrão = mínimo):
 * - não envia texto de conversa, telefone, nome nem valores de argumentos de ação;
 * - envia só metadados operacionais: canal, papel, modelo, latência, tokens, nomes de
 *   ferramentas, estado final;
 * - tenant, pessoa e conversa só entram como pseudônimo (HMAC com `CORTAI_OBS_SALT`);
 *   sem o salt, nenhum identificador é enviado;
 * - `CORTAI_OBS_CAPTURE_TEXT=true` liga a captura de texto, sempre mascarada e truncada.
 */
import type { EventoDeChamada } from "./gateway.server";

type Env = Record<string, string | undefined>;

export type EstadoFinal =
  /** A IA respondeu em texto; nenhuma ação preparada nem executada. */
  | "resposta"
  /** Uma escrita foi só PREPARADA e aguarda o "sim" da pessoa. Nada foi executado. */
  | "acao_preparada"
  /** A pessoa confirmou e o backend devolveu sucesso. */
  | "acao_confirmada_executada"
  /** Executada na hora, sem "sim" redundante (política de execução direta). */
  | "acao_executada_direta"
  /** A pessoa confirmou, mas o backend devolveu erro. */
  | "acao_confirmada_falhou"
  | "acao_recusada"
  /** Segunda confirmação da mesma ação pendente: não executou de novo. */
  | "confirmacao_duplicada"
  | "bloqueado_guarda"
  | "passos_esgotados"
  | "indisponivel"
  | "erro_interno";

const ESTADOS_DE_FALHA: EstadoFinal[] = [
  "acao_confirmada_falhou",
  "passos_esgotados",
  "indisponivel",
  "erro_interno",
];

export type ConfigDeObservabilidade = {
  baseUrl: string;
  autorizacao: string;
  amostragem: number;
  sal: string | null;
  capturarTexto: boolean;
  tempoLimiteMs: number;
  versaoDoPrompt: string;
};

/** `null` = observabilidade desligada (sem chaves, desativada de propósito ou configuração inválida). */
export function lerConfigDeObservabilidade(env: Env = process.env): ConfigDeObservabilidade | null {
  const desligada = (env["CORTAI_OBS_ENABLED"] ?? "").trim().toLowerCase();
  if (desligada === "false" || desligada === "0" || desligada === "off") return null;
  const publica = (env["LANGFUSE_PUBLIC_KEY"] ?? "").trim();
  const secreta = (env["LANGFUSE_SECRET_KEY"] ?? "").trim();
  if (!publica || !secreta) return null;

  const base = (env["LANGFUSE_BASE_URL"] ?? "https://cloud.langfuse.com")
    .trim()
    .replace(/\/+$/, "");
  let url: URL;
  try {
    url = new URL(base);
  } catch {
    return null;
  }
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol !== "https:" && !(url.protocol === "http:" && local)) return null;

  const taxa = Number(env["CORTAI_OBS_SAMPLE_RATE"] ?? "1");
  const limite = Number(env["CORTAI_OBS_TIMEOUT_MS"]);
  return {
    baseUrl: base,
    autorizacao: `Basic ${btoa(`${publica}:${secreta}`)}`,
    amostragem: Number.isFinite(taxa) ? Math.min(1, Math.max(0, taxa)) : 1,
    sal: (env["CORTAI_OBS_SALT"] ?? "").trim() || null,
    capturarTexto: (env["CORTAI_OBS_CAPTURE_TEXT"] ?? "").trim().toLowerCase() === "true",
    tempoLimiteMs: Number.isFinite(limite) && limite >= 200 && limite <= 5_000 ? limite : 1_500,
    versaoDoPrompt: (env["CORTAI_PROMPT_VERSION"] ?? "v1").trim().slice(0, 40) || "v1",
  };
}

/* ------------------------------ Mascaramento ----------------------------- */

const MASCARAS: [RegExp, string][] = [
  [/\b(?:sk|pk|rk|lf|ghp|xox[abp])[-_][A-Za-z0-9_-]{12,}\b/g, "[chave]"],
  [/\bBearer\s+[A-Za-z0-9._~+/=-]{12,}/gi, "Bearer [chave]"],
  [/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g, "[token]"],
  [/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, "[e-mail]"],
  [/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, "[documento]"],
  [/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g, "[documento]"],
  [/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, "[id]"],
  [/(?:\+?\d[\s().-]?){8,}\d/g, "[número]"],
];

/** Tira o que identifica pessoas, credenciais e documentos, e limita o tamanho. */
export function mascarar(texto: string, limite = 300): string {
  let t = texto;
  for (const [padrao, troca] of MASCARAS) t = t.replace(padrao, troca);
  return t.length > limite ? `${t.slice(0, limite)}…` : t;
}

/* ------------------------------ Pseudônimos ------------------------------ */

async function pseudonimo(sal: string | null, valor: string | null | undefined) {
  if (!sal || !valor) return null;
  try {
    const chave = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(sal),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const assinatura = await crypto.subtle.sign("HMAC", chave, new TextEncoder().encode(valor));
    return Array.from(new Uint8Array(assinatura).slice(0, 8), (b) =>
      b.toString(16).padStart(2, "0"),
    ).join("");
  } catch {
    return null;
  }
}

/* --------------------------------- Turno -------------------------------- */

export type EventoDeFerramenta = {
  nome: string;
  /** leitura executada, escrita preparada (nada executou), escrita executada após confirmação, ou recusada. */
  fase: "leitura" | "preparada" | "executada" | "recusada";
  ok: boolean;
  latenciaMs?: number;
  /** Só os NOMES dos argumentos; os valores só vão com captura de texto ligada. */
  argumentos?: Record<string, unknown> | undefined;
  erro?: string | null;
};

export type InfoDoTurno = {
  canal: string;
  papel?: string | null;
  tenantId: string;
  ator: string;
  conversaId?: string | null;
  /** Como o comando chegou ao cérebro. */
  origem?: "texto" | "voz";
};

export type Turno = {
  /** Identificador desta execução (igual ao trace id no Langfuse). */
  readonly runId: string;
  aoChamarModelo(e: EventoDeChamada): void;
  registrarFerramenta(e: EventoDeFerramenta): void;
  definirEstado(estado: EstadoFinal): void;
  /** Envia o rastro. Nunca lança e espera no máximo `tempoLimiteMs`. */
  finalizar(extra?: { textoDaPessoa?: string; textoDaResposta?: string }): Promise<void>;
};

const TURNO_INERTE: Turno = {
  runId: "",
  aoChamarModelo: () => undefined,
  registrarFerramenta: () => undefined,
  definirEstado: () => undefined,
  finalizar: async () => undefined,
};

function hexAleatorio(bytes: number) {
  const b = new Uint8Array(bytes);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}

type Atributo = { key: string; value: Record<string, unknown> };
function attr(key: string, valor: unknown): Atributo | null {
  if (valor === undefined || valor === null) return null;
  if (typeof valor === "boolean") return { key, value: { boolValue: valor } };
  if (typeof valor === "number")
    return {
      key,
      value: Number.isInteger(valor) ? { intValue: String(valor) } : { doubleValue: valor },
    };
  return { key, value: { stringValue: typeof valor === "string" ? valor : JSON.stringify(valor) } };
}
const lista = (...a: (Atributo | null)[]) => a.filter((x): x is Atributo => x !== null);
const nano = (ms: number) => `${Math.round(ms)}000000`;

type Span = {
  nome: string;
  inicio: number;
  fim: number;
  atributos: Atributo[];
  erro?: string | undefined;
};

/** Monta o corpo OTLP/JSON do turno. Puro: não faz rede nem lê ambiente. */
export function montarPayloadOtlp(entrada: {
  traceId: string;
  inicio: number;
  fim: number;
  estado: EstadoFinal;
  info: {
    canal: string;
    papel: string | null;
    origem?: string | undefined;
    usuario: string | null;
    sessao: string | null;
    negocio: string | null;
  };
  versaoDoPrompt: string;
  modelos: { id: string; evento: EventoDeChamada; inicio: number }[];
  ferramentas: { id: string; evento: EventoDeFerramenta; inicio: number; fim: number }[];
  texto?: { entrada?: string; saida?: string };
}) {
  const falhou = ESTADOS_DE_FALHA.includes(entrada.estado);
  const raiz = hexAleatorio(8);
  const spans: Record<string, unknown>[] = [];
  const empurrar = (id: string, pai: string | null, s: Span, ehErro: boolean) =>
    spans.push({
      traceId: entrada.traceId,
      spanId: id,
      ...(pai ? { parentSpanId: pai } : {}),
      name: s.nome,
      kind: 1,
      startTimeUnixNano: nano(s.inicio),
      endTimeUnixNano: nano(Math.max(s.fim, s.inicio)),
      attributes: s.atributos,
      status: ehErro ? { code: 2, message: s.erro ?? "erro" } : { code: 1 },
    });

  empurrar(
    raiz,
    null,
    {
      nome: "cortai.turno",
      inicio: entrada.inicio,
      fim: entrada.fim,
      atributos: lista(
        attr("langfuse.trace.name", "cortai.turno"),
        attr("langfuse.user.id", entrada.info.usuario),
        attr("langfuse.session.id", entrada.info.sessao),
        attr("langfuse.trace.metadata.canal", entrada.info.canal),
        attr("langfuse.trace.metadata.origem", entrada.info.origem),
        attr("langfuse.trace.metadata.papel", entrada.info.papel),
        attr("langfuse.trace.metadata.negocio", entrada.info.negocio),
        attr("langfuse.trace.metadata.estado_final", entrada.estado),
        attr("langfuse.trace.metadata.prompt_version", entrada.versaoDoPrompt),
        attr("langfuse.trace.metadata.rodadas_do_modelo", entrada.modelos.length),
        attr("langfuse.trace.input", entrada.texto?.entrada),
        attr("langfuse.trace.output", entrada.texto?.saida),
        attr("langfuse.observation.level", falhou ? "ERROR" : "DEFAULT"),
      ),
      ...(falhou ? { erro: entrada.estado } : {}),
    },
    falhou,
  );

  for (const m of entrada.modelos) {
    const e = m.evento;
    empurrar(
      m.id,
      raiz,
      {
        nome: "cortai.modelo",
        inicio: m.inicio,
        fim: m.inicio + e.latenciaMs,
        atributos: lista(
          attr("langfuse.observation.type", "generation"),
          attr("langfuse.observation.model.name", e.modelo),
          attr("gen_ai.request.model", e.modelo),
          attr("gen_ai.system", e.provedor),
          attr("gen_ai.usage.input_tokens", e.uso?.entrada),
          attr("gen_ai.usage.output_tokens", e.uso?.saida),
          e.uso
            ? attr("langfuse.observation.usage_details", {
                input: e.uso.entrada ?? 0,
                output: e.uso.saida ?? 0,
                total: e.uso.total ?? (e.uso.entrada ?? 0) + (e.uso.saida ?? 0),
              })
            : null,
          attr("langfuse.observation.metadata.ferramentas_pedidas", e.ferramentas.join(",")),
          attr("langfuse.observation.metadata.gerou_texto", e.geroutexto),
          attr("langfuse.observation.metadata.http_status", e.httpStatus),
          attr("langfuse.observation.level", e.ok ? "DEFAULT" : "ERROR"),
        ),
        ...(e.ok ? {} : { erro: `modelo_${e.httpStatus ?? "falha"}` }),
      },
      !e.ok,
    );
  }

  for (const f of entrada.ferramentas) {
    const e = f.evento;
    empurrar(
      f.id,
      raiz,
      {
        nome: `cortai.acao.${e.nome}`,
        inicio: f.inicio,
        fim: f.fim,
        atributos: lista(
          attr("langfuse.observation.type", "tool"),
          attr("langfuse.observation.metadata.fase", e.fase),
          attr("langfuse.observation.metadata.ok", e.ok),
          attr("langfuse.observation.input", e.argumentos),
          attr("langfuse.observation.level", e.ok ? "DEFAULT" : "ERROR"),
        ),
        ...(e.ok ? {} : { erro: e.erro ?? "falha" }),
      },
      !e.ok,
    );
  }

  return {
    resourceSpans: [
      {
        resource: {
          attributes: lista(
            attr("service.name", "cortai"),
            attr("deployment.environment", "producao"),
          ),
        },
        scopeSpans: [{ scope: { name: "cortai.brain" }, spans }],
      },
    ],
  };
}

/* Disjuntor: depois de falhas seguidas, pausa o envio para não somar latência a cada turno. */
const FALHAS_SEGUIDAS_MAX = 3;
const PAUSA_APOS_FALHAS_MS = 60_000;
let falhasSeguidas = 0;
let pausadoAte = 0;

/** Só para testes. */
export function reiniciarDisjuntor() {
  falhasSeguidas = 0;
  pausadoAte = 0;
}

function nomesDosArgumentos(
  dados: Record<string, unknown> | undefined,
  capturar: boolean,
): Record<string, unknown> | undefined {
  if (!dados) return undefined;
  if (!capturar) return { campos: Object.keys(dados).slice(0, 20) };
  return { valores_mascarados: mascarar(JSON.stringify(dados), 600) };
}

export function iniciarTurno(
  info: InfoDoTurno,
  env: Env = process.env,
  buscar: typeof fetch = fetch,
): Turno {
  let config: ConfigDeObservabilidade | null = null;
  try {
    config = lerConfigDeObservabilidade(env);
  } catch {
    config = null;
  }
  if (!config) return TURNO_INERTE;
  const cfg = config;

  const sorteado = Math.random() < cfg.amostragem;
  const inicio = Date.now();
  const traceId = hexAleatorio(16);
  const modelos: { id: string; evento: EventoDeChamada; inicio: number }[] = [];
  const ferramentas: { id: string; evento: EventoDeFerramenta; inicio: number; fim: number }[] = [];
  let estado: EstadoFinal | null = null;
  let enviado = false;

  return {
    runId: traceId,
    aoChamarModelo(e) {
      try {
        if (modelos.length < 20)
          modelos.push({ id: hexAleatorio(8), evento: e, inicio: Date.now() - e.latenciaMs });
      } catch {
        /* nunca interfere */
      }
    },
    registrarFerramenta(e) {
      try {
        if (ferramentas.length >= 40) return;
        const fim = Date.now();
        ferramentas.push({
          id: hexAleatorio(8),
          evento: { ...e, argumentos: nomesDosArgumentos(e.argumentos, cfg.capturarTexto) },
          inicio: fim - (e.latenciaMs ?? 0),
          fim,
        });
      } catch {
        /* nunca interfere */
      }
    },
    definirEstado(novo) {
      estado = novo;
    },
    async finalizar(extra) {
      if (enviado) return;
      enviado = true;
      try {
        const final = estado ?? "resposta";
        if (!sorteado && !ESTADOS_DE_FALHA.includes(final)) return;
        if (Date.now() < pausadoAte) return;

        const [usuario, sessao, negocio] = await Promise.all([
          pseudonimo(cfg.sal, info.ator),
          pseudonimo(cfg.sal, info.conversaId ?? null),
          pseudonimo(cfg.sal, info.tenantId),
        ]);
        const corpo = montarPayloadOtlp({
          traceId,
          inicio,
          fim: Date.now(),
          estado: final,
          info: {
            canal: info.canal,
            papel: info.papel ?? null,
            origem: info.origem,
            usuario,
            sessao,
            negocio,
          },
          versaoDoPrompt: cfg.versaoDoPrompt,
          modelos,
          ferramentas,
          ...(cfg.capturarTexto
            ? {
                texto: {
                  ...(extra?.textoDaPessoa ? { entrada: mascarar(extra.textoDaPessoa) } : {}),
                  ...(extra?.textoDaResposta ? { saida: mascarar(extra.textoDaResposta) } : {}),
                },
              }
            : {}),
        });

        const controle = new AbortController();
        const relogio = setTimeout(() => controle.abort(), cfg.tempoLimiteMs);
        try {
          const r = await buscar(`${cfg.baseUrl}/api/public/otel/v1/traces`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: cfg.autorizacao,
              "x-langfuse-ingestion-version": "4",
            },
            body: JSON.stringify(corpo),
            signal: controle.signal,
          });
          if (r.ok) falhasSeguidas = 0;
          else throw new Error(`langfuse ${r.status}`);
        } finally {
          clearTimeout(relogio);
        }
      } catch (erro) {
        falhasSeguidas += 1;
        if (falhasSeguidas >= FALHAS_SEGUIDAS_MAX) pausadoAte = Date.now() + PAUSA_APOS_FALHAS_MS;
        // Só a classe do erro: nunca o corpo da requisição nem as chaves.
        console.warn(
          `[observabilidade] envio ao Langfuse falhou (${erro instanceof Error ? erro.name : "erro"}).`,
        );
      }
    },
  };
}
