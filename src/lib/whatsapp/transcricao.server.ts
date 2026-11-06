/**
 * Transcrição de áudio do WhatsApp para a Flow IA (só servidor).
 *
 * áudio (Base64 do payload ou buscado na Evolution) → texto em pt-BR → mesmo
 * fluxo das mensagens de texto. O áudio nunca é gravado nem logado: vive só
 * na memória desta chamada.
 */

import { lerConfigDoProvedor } from "@/lib/brain/gateway-compativel.server";

const TEMPO_LIMITE_MS = 20_000;

type ConfiguracaoTranscricao = {
  endpoint: string;
  chave: string;
  modelo: string;
};

const BASE_DA_GROQ = "https://api.groq.com/openai/v1";
// Modelo completo (não o "turbo"): entende melhor português falado no celular (06/11/2026: "Número 1, limpeza de pele"
// saía como "na empresa de pele").
const MODELO_DA_GROQ = "whisper-large-v3";
/** Chave da Groq sempre começa com "gsk_": serve para achar o provedor quando só a chave foi configurada. */
const ehChaveDaGroq = (chave: string | undefined) => Boolean(chave?.trim().startsWith("gsk_"));

/**
 * Endereço da transcrição. `CORTAI_STT_BASE_URL` pode vir como base ("https://api.groq.com/openai/v1", como no
 * `.env.example`) ou já com `/audio/transcriptions`. Sem ela: chave da Groq (`gsk_…`) usa o endereço da Groq; senão,
 * a base da Flow IA. Antes, a base sem o caminho dava 404 e, na prévia de 06/11/2026, a chave da Groq chegou sem o
 * endereço e foi mandada ao provedor da IA ("transcrição recusada (404)").
 */
export function endpointDeTranscricao(
  stt: string | undefined,
  baseDaIa: string,
  chaveStt?: string,
): string {
  const base = (stt?.trim() || (ehChaveDaGroq(chaveStt) ? BASE_DA_GROQ : baseDaIa)).replace(
    /\/+$/,
    "",
  );
  return /\/audio\/transcriptions$/.test(base) ? base : `${base}/audio/transcriptions`;
}

/** Resolve o mesmo provedor escolhido para o cérebro; nunca troca silenciosamente de fornecedor. */
function configuracaoTranscricao(): ConfiguracaoTranscricao | null {
  const leitura = lerConfigDoProvedor();
  if (!leitura.ok) return null;
  if (leitura.config.tipo !== "compativel") return null;
  const chaveStt = process.env["CORTAI_STT_API_KEY"]?.trim();
  return {
    endpoint: endpointDeTranscricao(
      process.env["CORTAI_STT_BASE_URL"],
      leitura.config.baseUrl,
      chaveStt,
    ),
    chave: chaveStt || leitura.config.chave,
    modelo:
      process.env["CORTAI_STT_MODEL"]?.trim() ||
      process.env["CORTAI_AI_TRANSCRIPTION_MODEL"]?.trim() ||
      (ehChaveDaGroq(chaveStt) ? MODELO_DA_GROQ : "whisper-1"),
  };
}

/** Só o servidor consultado (sem caminho nem chave), para o motivo gravado na mensagem dizer onde falhou. */
export function servidorDaTranscricao(): string | null {
  const c = configuracaoTranscricao();
  if (!c) return null;
  try {
    return new URL(c.endpoint).host;
  } catch {
    return null;
  }
}
const TAMANHO_MAXIMO = 24 * 1024 * 1024;

export function transcricaoConfigurada(): boolean {
  return configuracaoTranscricao() !== null;
}

/** Extensão coerente com o tipo (o navegador grava webm/mp4; o WhatsApp manda ogg). */
export function extensaoDoTipo(tipo: string): string {
  const t = tipo.toLowerCase();
  if (t.includes("webm")) return "webm";
  if (t.includes("mp4") || t.includes("m4a") || t.includes("aac")) return "m4a";
  if (t.includes("mpeg") || t.includes("mp3")) return "mp3";
  if (t.includes("wav")) return "wav";
  return "ogg";
}

function base64ParaBytes(b64: string): Uint8Array {
  const limpo = b64.replace(/^data:[^,]*,/, "").replace(/\s/g, "");
  const bin = atob(limpo);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/** Busca o Base64 da mídia na Evolution quando não veio no webhook. */
export async function buscarBase64NaEvolution(
  sessaoId: string,
  mensagem: Record<string, unknown>,
): Promise<string | null> {
  const baseUrl = (
    process.env["EVOLUTION_API_URL"] ?? process.env["WHATSAPP_GATEWAY_URL"]
  )?.replace(/\/+$/, "");
  const apiKey = process.env["EVOLUTION_API_KEY"] ?? process.env["WHATSAPP_GATEWAY_API_KEY"];
  if (!baseUrl || !apiKey) return null;
  const controle = new AbortController();
  const relogio = setTimeout(() => controle.abort(), 10_000);
  try {
    const r = await fetch(
      `${baseUrl}/chat/getBase64FromMediaMessage/${encodeURIComponent(sessaoId)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json", apikey: apiKey },
        body: JSON.stringify({ message: mensagem, convertToMp4: false }),
        signal: controle.signal,
      },
    );
    if (!r.ok) {
      console.error("[whatsapp/audio] Evolution não entregou a mídia", { status: r.status });
      return null;
    }
    const corpo = (await r.json().catch(() => null)) as Record<string, unknown> | null;
    const b64 = corpo?.["base64"];
    return typeof b64 === "string" && b64 ? b64 : null;
  } catch {
    console.error("[whatsapp/audio] falha ao buscar mídia na Evolution");
    return null;
  } finally {
    clearTimeout(relogio);
  }
}

/**
 * Transcreve o áudio em Base64. Devolve `null` quando não deu para entender.
 * `duracaoS` (do audioMessage.seconds) limita a leitura aos primeiros 2 minutos.
 */
async function chamarTranscricao(
  chave: string,
  bytes: Uint8Array,
  tipo: string,
  modelo: string,
  configuracao: ConfiguracaoTranscricao,
  aoRecusar?: (status: number) => void,
  dica?: string,
): Promise<string | null> {
  const formulario = new FormData();
  formulario.append(
    "file",
    new Blob([bytes as BlobPart], { type: tipo }),
    `audio.${extensaoDoTipo(tipo)}`,
  );
  formulario.append("model", modelo);
  formulario.append("language", "pt");
  formulario.append("temperature", "0");
  // Dica de vocabulário (nomes dos serviços do negócio e palavras do atendimento): ajuda o modelo a acertar.
  if (dica) formulario.append("prompt", dica.slice(0, 600));

  const controle = new AbortController();
  const relogio = setTimeout(() => controle.abort(), TEMPO_LIMITE_MS);
  try {
    const resposta = await fetch(configuracao.endpoint, {
      method: "POST",
      headers: {
        authorization: `Bearer ${chave}`,
      },
      body: formulario,
      signal: controle.signal,
    });
    if (!resposta.ok || !resposta.body) {
      console.error("[whatsapp/audio] transcrição recusada", { modelo, status: resposta.status });
      aoRecusar?.(resposta.status);
      return null;
    }
    const corpo = (await resposta.json().catch(() => null)) as Record<string, unknown> | null;
    const texto = typeof corpo?.["text"] === "string" ? corpo["text"].trim() : "";
    return texto.length >= 2 ? texto : null;
  } catch {
    console.error("[whatsapp/audio] falha na transcrição", {
      modelo,
      motivo: controle.signal.aborted ? "tempo esgotado" : "erro",
    });
    return null;
  } finally {
    clearTimeout(relogio);
  }
}

/** Frase de apoio para o modelo: o cliente fala as opções do menu e os serviços do negócio. */
export function dicaDeVocabulario(servicos: readonly string[]): string {
  const nomes = servicos
    .map((n) => n.trim())
    .filter(Boolean)
    .slice(0, 25);
  const base =
    "Agendamento por WhatsApp. Opção número 1, 2, 3. Quero marcar horário amanhã, hoje, sim, não.";
  return nomes.length ? `${base} Serviços: ${nomes.join(", ")}.` : base;
}

/**
 * Transcreve o áudio em Base64 por inteiro (sem cortar o final). Se o modelo
 * principal falhar ou não entender, tenta o modelo reserva em pt-BR.
 * Devolve `null` quando nenhum dos dois entendeu.
 */
export async function transcreverAudioBase64(
  base64: string,
  opcoes: {
    mimetype?: string | null;
    duracaoS?: number | null;
    /** Recebe o status HTTP quando o serviço recusa (ex.: 402 sem crédito). */
    aoRecusar?: (status: number) => void;
    /** Nomes dos serviços do negócio: viram a dica de vocabulário da transcrição. */
    servicos?: readonly string[];
  } = {},
): Promise<string | null> {
  const configuracao = configuracaoTranscricao();
  if (!configuracao || !base64) return null;
  const chave = configuracao.chave;
  const bytes = base64ParaBytes(base64);
  if (bytes.byteLength === 0) return null;
  if (bytes.byteLength > TAMANHO_MAXIMO) {
    console.error("[whatsapp/audio] áudio grande demais para transcrever");
    return null;
  }
  const tipo = (opcoes.mimetype ?? "audio/ogg").split(";")[0]!.trim() || "audio/ogg";
  const principal = await chamarTranscricao(
    chave,
    bytes,
    tipo,
    configuracao.modelo,
    configuracao,
    opcoes.aoRecusar,
    dicaDeVocabulario(opcoes.servicos ?? []),
  );
  return principal;
}
