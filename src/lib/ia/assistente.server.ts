/**
 * Camada de IA do CortAI — só roda no servidor.
 *
 * Fala com o Lovable AI Gateway (Responses API, sempre em streaming) e devolve
 * uma resposta ESTRUTURADA. A chave nunca sai do servidor e, se ela não existir,
 * o produto continua funcionando com um aviso honesto — nada é simulado.
 */
import {
  DESTINOS_PERMITIDOS,
  respostaIndisponivel,
  type HorarioSugerido,
  type IntencaoDaIA,
  type RespostaDoAssistente,
  type ServicoSugerido,
} from "./assistente";

import { provedorCompativelDoCanal } from "@/lib/brain/gateway.server";

// Infraestrutura da Alvo IA / Lovable AI Gateway — nenhum consumo de tokens da OpenAI.
const ENDPOINT = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODELO = "google/gemini-3-flash";

export function assistenteConfigurado(): boolean {
  return Boolean(process.env["LOVABLE_API_KEY"]) || provedorCompativelDoCanal("painel") !== null;
}

export type ContextoDaBarbearia = {
  nome: string;
  segmento: string;
  slug: string;
  whatsapp: string | null;
  servicos: { nome: string; duracaoMin: number; precoCentavos: number }[];
  horarios: { diaSemana: number; fechado: boolean; abre: string; fecha: string }[];
  naFila: number;
};

const REGRAS = `Você é o assistente do CortAI, uma plataforma de gestão para negócios brasileiros de Beleza.
Fale português do Brasil, com frases curtas, diretas e sem jargão técnico.

O que você faz:
- Ajuda a pessoa responsável a cadastrar serviços, definir horários de funcionamento e entender a fila.
- Explica onde cada coisa fica no CortAI e oferece o atalho certo.

Regras obrigatórias:
- Respeite o segmento informado e nunca use vocabulário de barbearia em outro segmento.
- Se o segmento não estiver definido, use só palavras neutras: negócio, profissional, serviço, atendimento e cliente.
- Nunca use emojis de segmento (como tesoura ou poste de barbearia).
- NUNCA invente dados do negócio. Use apenas o contexto recebido. Se não souber, pergunte.
- Qualquer alteração de dados (serviços, horários) vem com precisa_confirmar = true e uma pergunta curta de confirmação. Você nunca afirma que já salvou.
- Preço sempre em centavos (35 reais = 3500). Duração em minutos.
- Dias da semana: 0 = domingo … 6 = sábado. Horas no formato HH:MM.
- Quando a pessoa só quer saber onde fica algo, use intencao = "navegar" e escolha um destino da lista permitida.
- Se a pessoa pedir algo fora do CortAI, diga com gentileza que não faz parte do sistema.
- Nunca prometa envio de WhatsApp: a integração ainda não está conectada.

Destinos permitidos: ${Object.keys(DESTINOS_PERMITIDOS).join(", ")}.`;

const ESQUEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    resposta: { type: "string" },
    intencao: {
      type: "string",
      enum: ["conversa", "cadastrar_servicos", "definir_horarios", "navegar", "consultar", "ajuda"],
    },
    precisa_confirmar: { type: "boolean" },
    pergunta_de_confirmacao: { type: ["string", "null"] },
    destino: { type: ["string", "null"] },
    servicos: {
      type: ["array", "null"],
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          nome: { type: "string" },
          categoria: { type: "string" },
          duracao_min: { type: "integer" },
          preco_centavos: { type: "integer" },
        },
        required: ["nome", "categoria", "duracao_min", "preco_centavos"],
      },
    },
    horarios: {
      type: ["array", "null"],
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          dia_semana: { type: "integer" },
          fechado: { type: "boolean" },
          abre: { type: "string" },
          fecha: { type: "string" },
        },
        required: ["dia_semana", "fechado", "abre", "fecha"],
      },
    },
  },
  required: [
    "resposta",
    "intencao",
    "precisa_confirmar",
    "pergunta_de_confirmacao",
    "destino",
    "servicos",
    "horarios",
  ],
} as const;

function contextoEmTexto(ctx: ContextoDaBarbearia): string {
  const servicos = ctx.servicos.length
    ? ctx.servicos
        .map((s) => `- ${s.nome}: ${(s.precoCentavos / 100).toFixed(2)} reais, ${s.duracaoMin} min`)
        .join("\n")
    : "- nenhum serviço cadastrado ainda";
  const horarios = ctx.horarios.length
    ? ctx.horarios
        .map((h) => `- dia ${h.diaSemana}: ${h.fechado ? "fechado" : `${h.abre} às ${h.fecha}`}`)
        .join("\n")
    : "- horários ainda não definidos";
  return `Negócio: ${ctx.nome} (segmento: ${ctx.segmento}; link público /f/${ctx.slug})
WhatsApp cadastrado: ${ctx.whatsapp ? "sim" : "não"}
Pessoas na fila agora: ${ctx.naFila}
Serviços cadastrados:
${servicos}
Horários de funcionamento:
${horarios}`;
}

type Turno = { autor: "barbeiro" | "assistente"; conteudo: string };

function inteiro(valor: unknown, padrao: number): number {
  const n = typeof valor === "number" ? valor : Number(valor);
  return Number.isFinite(n) ? Math.round(n) : padrao;
}

function hora(valor: unknown, padrao: string): string {
  return typeof valor === "string" && /^\d{1,2}:\d{2}$/.test(valor)
    ? valor.padStart(5, "0")
    : padrao;
}

/** Normaliza a saída do modelo — nada entra no app sem passar por aqui. */
export function normalizarResposta(bruto: unknown): RespostaDoAssistente {
  const o = (typeof bruto === "object" && bruto !== null ? bruto : {}) as Record<string, any>;
  const servicosBrutos = Array.isArray(o["servicos"]) ? o["servicos"] : null;
  const horariosBrutos = Array.isArray(o["horarios"]) ? o["horarios"] : null;

  const servicos: ServicoSugerido[] | null = servicosBrutos
    ? servicosBrutos
        .map((s: Record<string, any>) => ({
          nome: String(s?.["nome"] ?? "")
            .trim()
            .slice(0, 60),
          categoria:
            String(s?.["categoria"] ?? "Serviço")
              .trim()
              .slice(0, 40) || "Serviço",
          duracaoMin: Math.min(480, Math.max(5, inteiro(s?.["duracao_min"], 30))),
          precoCentavos: Math.min(10_000_000, Math.max(0, inteiro(s?.["preco_centavos"], 0))),
        }))
        .filter((s) => s.nome.length >= 2)
        .slice(0, 20)
    : null;

  const horarios: HorarioSugerido[] | null = horariosBrutos
    ? horariosBrutos
        .map((h: Record<string, any>) => ({
          diaSemana: Math.min(6, Math.max(0, inteiro(h?.["dia_semana"], 1))),
          fechado: Boolean(h?.["fechado"]),
          abre: hora(h?.["abre"], "09:00"),
          fecha: hora(h?.["fecha"], "19:00"),
        }))
        .slice(0, 7)
    : null;

  const destinoBruto = typeof o["destino"] === "string" ? o["destino"] : null;
  const destino = destinoBruto && DESTINOS_PERMITIDOS[destinoBruto] ? destinoBruto : null;
  const intencoes: IntencaoDaIA[] = [
    "conversa",
    "cadastrar_servicos",
    "definir_horarios",
    "navegar",
    "consultar",
    "ajuda",
  ];
  const intencao = intencoes.includes(o["intencao"]) ? (o["intencao"] as IntencaoDaIA) : "conversa";

  return {
    resposta:
      String(o["resposta"] ?? "").trim() || "Pode repetir de outro jeito? Não entendi direito.",
    intencao,
    precisaConfirmar:
      Boolean(o["precisa_confirmar"]) &&
      Boolean((servicos && servicos.length) || (horarios && horarios.length)),
    perguntaDeConfirmacao:
      typeof o["pergunta_de_confirmacao"] === "string" && o["pergunta_de_confirmacao"].trim()
        ? o["pergunta_de_confirmacao"].trim()
        : null,
    destino,
    rotuloDoDestino: destino ? (DESTINOS_PERMITIDOS[destino] ?? null) : null,
    servicos: servicos && servicos.length ? servicos : null,
    horarios: horarios && horarios.length ? horarios : null,
    disponivel: true,
  };
}

/** Erros do gateway viram mensagem clara — nunca uma resposta inventada. */
function erroDoGateway(status: number, corpo: string): Error {
  if (status === 402) {
    return new Error(
      "Os créditos de IA do CortAI acabaram. Peça para o responsável adicionar créditos.",
    );
  }
  if (status === 429)
    return new Error("O assistente está sobrecarregado agora. Tente de novo em instantes.");
  if (status === 401 || status === 403) {
    return new Error("O assistente está sem acesso neste ambiente. Fale com o suporte do CortAI.");
  }
  return new Error(
    `O assistente não conseguiu responder agora (${status}). ${corpo.slice(0, 120)}`,
  );
}

/**
 * Pergunta ao modelo e devolve a resposta estruturada.
 * Sem chave configurada, devolve o fallback honesto (disponivel: false).
 */
export async function pensar(input: {
  mensagem: string;
  contexto: ContextoDaBarbearia;
  historico?: Turno[];
  instrucaoExtra?: string;
}): Promise<RespostaDoAssistente> {
  // Provedor gratuito/compatível configurado para o painel (CORTAI_AI_*) tem prioridade.
  const compat = provedorCompativelDoCanal("painel");
  const chave = compat?.chave ?? process.env["LOVABLE_API_KEY"];
  if (!chave) return respostaIndisponivel();

  const entrada = [
    { role: "system", content: REGRAS },
    { role: "system", content: `Contexto atual do negócio:\n${contextoEmTexto(input.contexto)}` },
    ...(input.instrucaoExtra ? [{ role: "system", content: input.instrucaoExtra }] : []),
    ...(input.historico ?? []).slice(-10).map((t) => ({
      role: t.autor === "barbeiro" ? "user" : "assistant",
      content: t.conteudo,
    })),
    { role: "user", content: input.mensagem },
  ];

  const chamar = (mensagens: unknown[], formato: Record<string, unknown>) =>
    fetch(compat ? `${compat.baseUrl}/chat/completions` : ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${chave}` },
      ...(compat ? { signal: AbortSignal.timeout(compat.tempoLimiteMs) } : {}),
      body: JSON.stringify({
        model: compat?.modelo ?? MODELO,
        messages: mensagens,
        response_format: formato,
      }),
    });

  let resposta = await chamar(entrada, {
    type: "json_schema",
    json_schema: { name: "resposta_do_cortai", strict: true, schema: ESQUEMA },
  });
  // Nem todo provedor aceita json_schema estrito: pede JSON puro com o esquema na instrução.
  if (compat && resposta.status === 400) {
    resposta = await chamar(
      [
        ...entrada,
        {
          role: "system",
          content: `Responda SOMENTE com um objeto JSON válido, sem texto fora dele, seguindo este esquema: ${JSON.stringify(ESQUEMA)}`,
        },
      ],
      { type: "json_object" },
    );
  }

  if (!resposta.ok) throw erroDoGateway(resposta.status, await resposta.text().catch(() => ""));

  const corpo = (await resposta.json()) as Record<string, any>;
  const texto = String(corpo?.["choices"]?.[0]?.message?.content ?? "");
  if (!texto.trim()) {
    return {
      ...respostaIndisponivel(),
      resposta: "Não consegui formular uma resposta agora. Tente escrever de outro jeito.",
      disponivel: true,
    };
  }
  try {
    return normalizarResposta(JSON.parse(texto));
  } catch {
    return {
      resposta: texto.slice(0, 800),
      intencao: "conversa",
      precisaConfirmar: false,
      perguntaDeConfirmacao: null,
      destino: null,
      rotuloDoDestino: null,
      servicos: null,
      horarios: null,
      disponivel: true,
    };
  }
}
