/**
 * Camada de IA do Flow — só roda no servidor.
 *
 * Fala com o provedor compatível configurado e devolve uma resposta ESTRUTURADA.
 * A chave nunca sai do servidor e, se o provedor não estiver configurado, devolve
 * um aviso honesto — sem fallback silencioso e sem simular respostas.
 */
import {
  DESTINOS_PERMITIDOS,
  respostaIndisponivel,
  type HorarioSugerido,
  type IntencaoDaIA,
  type RespostaDoAssistente,
  type ServicoSugerido,
} from "./assistente";

import {
  criarSessaoDoGateway,
  ErroDoGateway,
  provedorCompativelDoCanal,
  textoDaSaida,
  type ItemDeEntrada,
} from "@/lib/brain/gateway.server";


export function assistenteConfigurado(): boolean {
  return provedorCompativelDoCanal("painel") !== null;
}

export type ContextoDoNegocio = {
  nome: string;
  segmento: string;
  slug: string;
  whatsapp: string | null;
  servicos: { nome: string; duracaoMin: number; precoCentavos: number }[];
  horarios: { diaSemana: number; fechado: boolean; abre: string; fecha: string }[];
  naFila: number;
};

/** Alias de compatibilidade para consumidores legados; o contexto é de qualquer negócio. */
export type ContextoDaBarbearia = ContextoDoNegocio;

const REGRAS = `Você é a Flow IA, a inteligência central de uma plataforma de gestão para diferentes tipos de negócios de serviços.
Fale português do Brasil, com frases curtas, diretas e sem jargão técnico.

O que você faz:
- Ajuda a pessoa responsável a cadastrar serviços, definir horários de funcionamento e entender a fila.
- Explica onde cada coisa fica no Flow e oferece o atalho certo.

Regras obrigatórias:
- Respeite o segmento informado e nunca use vocabulário de barbearia em outro segmento.
- A plataforma atende diferentes segmentos; Beleza é apenas um dos grupos possíveis, não a identidade do produto.\n- Se o segmento não estiver definido ou for genérico, use só palavras neutras: negócio, profissional, serviço, atendimento e cliente.
- Nunca presuma que o negócio é uma barbearia, salão, clínica ou outro segmento sem evidência no contexto.\n- Nunca use emojis ou exemplos exclusivos de um segmento quando o segmento não estiver definido.
- NUNCA invente dados do negócio. Use apenas o contexto recebido. Se não souber, pergunte.
- Qualquer alteração de dados (serviços, horários) vem com precisa_confirmar = true e uma pergunta curta de confirmação. Você nunca afirma que já salvou.
- Preço sempre em centavos (35 reais = 3500). Duração em minutos.
- Dias da semana: 0 = domingo … 6 = sábado. Horas no formato HH:MM.
- Quando a pessoa só quer saber onde fica algo, use intencao = "navegar" e escolha um destino da lista permitida.
- Se a pessoa pedir algo fora do Flow, diga com gentileza que não faz parte do sistema.
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

function contextoEmTexto(ctx: ContextoDoNegocio): string {
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

/**
 * Pergunta ao modelo e devolve a resposta estruturada.
 * Sem chave configurada, devolve o fallback honesto (disponivel: false).
 */
export async function extrairCadastroEstruturado(input: {
  mensagem: string;
  contexto: ContextoDoNegocio;
  historico?: Turno[];
  instrucaoExtra?: string;
}): Promise<RespostaDoAssistente> {
  // Esta capacidade continua especializada, mas transporte, fallback e observabilidade
  // pertencem exclusivamente ao cérebro. O modo básico não pode fingir uma extração.
  if (!provedorCompativelDoCanal("painel")) return respostaIndisponivel();

  const entrada: ItemDeEntrada[] = [
    ...(input.historico ?? []).slice(-10).map((t) => ({
      role: t.autor === "barbeiro" ? "user" : "assistant",
      content: t.conteudo,
    })),
    { role: "user", content: input.mensagem },
  ];

  const instrucoes = `${REGRAS}\n\nContexto atual do negócio:\n${contextoEmTexto(input.contexto)}\n\n${input.instrucaoExtra ?? ""}\nResponda SOMENTE com um objeto JSON válido, sem texto fora dele, seguindo este esquema:\n${JSON.stringify(ESQUEMA)}`;
  let itens: ItemDeEntrada[];
  try {
    itens = await criarSessaoDoGateway({ canal: "painel", usarModoBasico: false }).responder({
      instrucoes,
      entrada,
      ferramentas: [],
    });
  } catch (erro) {
    if (erro instanceof ErroDoGateway) throw erro;
    throw new Error("A IA do Flow não conseguiu responder agora.");
  }
  const texto = textoDaSaida(itens);
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
