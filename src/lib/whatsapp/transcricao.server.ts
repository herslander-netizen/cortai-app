/**
 * Transcrição de áudio do WhatsApp para o CortAI (só servidor).
 *
 * áudio (Base64 do payload ou buscado na Evolution) → texto em pt-BR → mesmo
 * fluxo das mensagens de texto. O áudio nunca é gravado nem logado: vive só
 * na memória desta chamada.
 */

const ENDPOINT = "https://ai.gateway.lovable.dev/v1/audio/transcriptions";
const MODELO = "openai/gpt-transcribe";
const TEMPO_LIMITE_MS = 20_000;
const MODELO_RESERVA = "google/gemini-3.5-transcribe";
const TAMANHO_MAXIMO = 24 * 1024 * 1024;
const TAMANHO_MAXIMO_RESERVA = 14 * 1024 * 1024;

export function transcricaoConfigurada(): boolean {
  return Boolean(process.env["LOVABLE_API_KEY"]);
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
  const baseUrl = (process.env["EVOLUTION_API_URL"] ?? process.env["WHATSAPP_GATEWAY_URL"])?.replace(
    /\/+$/,
    "",
  );
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
): Promise<string | null> {
  const formulario = new FormData();
  formulario.append(
    "file",
    new Blob([bytes as BlobPart], { type: tipo }),
    `audio.${extensaoDoTipo(tipo)}`,
  );
  formulario.append("model", modelo);
  if (modelo === MODELO) formulario.append("languages", "pt");
  else formulario.append("language", "pt-BR");
  formulario.append("stream", "true");

  const controle = new AbortController();
  const relogio = setTimeout(() => controle.abort(), TEMPO_LIMITE_MS);
  try {
    const resposta = await fetch(ENDPOINT, {
      method: "POST",
      headers: { authorization: `Bearer ${chave}`, "X-Lovable-AIG-SDK": "fetch" },
      body: formulario,
      signal: controle.signal,
    });
    if (!resposta.ok || !resposta.body) {
      console.error("[whatsapp/audio] transcrição recusada", { modelo, status: resposta.status });
      return null;
    }
    const leitor = resposta.body.getReader();
    const dec = new TextDecoder();
    let buffer = "";
    let parcial = "";
    let final: string | null = null;
    for (;;) {
      const { value, done } = await leitor.read();
      if (done) break;
      buffer += dec.decode(value, { stream: true });
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
        try {
          const ev = JSON.parse(dados) as { type?: string; text?: string; delta?: string };
          if (ev.type === "transcript.text.delta" && ev.delta) parcial += ev.delta;
          else if (ev.type === "transcript.text.done" && typeof ev.text === "string") final = ev.text;
        } catch {
          /* evento parcial */
        }
      }
    }
    const texto = (final ?? parcial).trim();
    return texto.length >= 2 ? texto : null;
  } catch {
    console.error(
      "[whatsapp/audio] falha na transcrição",
      { modelo, motivo: controle.signal.aborted ? "tempo esgotado" : "erro" },
    );
    return null;
  } finally {
    clearTimeout(relogio);
  }
}

/**
 * Transcreve o áudio em Base64 por inteiro (sem cortar o final). Se o modelo
 * principal falhar ou não entender, tenta o modelo reserva em pt-BR.
 * Devolve `null` quando nenhum dos dois entendeu.
 */
export async function transcreverAudioBase64(
  base64: string,
  opcoes: { mimetype?: string | null; duracaoS?: number | null } = {},
): Promise<string | null> {
  const chave = process.env["LOVABLE_API_KEY"];
  if (!chave || !base64) return null;
  const bytes = base64ParaBytes(base64);
  if (bytes.byteLength === 0) return null;
  if (bytes.byteLength > TAMANHO_MAXIMO) {
    console.error("[whatsapp/audio] áudio grande demais para transcrever");
    return null;
  }
  const tipo = (opcoes.mimetype ?? "audio/ogg").split(";")[0]!.trim() || "audio/ogg";
  const principal = await chamarTranscricao(chave, bytes, tipo, MODELO);
  if (principal) return principal;
  if (bytes.byteLength > TAMANHO_MAXIMO_RESERVA) return null;
  return chamarTranscricao(chave, bytes, tipo, MODELO_RESERVA);
}
