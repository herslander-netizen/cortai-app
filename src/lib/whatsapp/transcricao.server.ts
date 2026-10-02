/**
 * Camada de transcrição de áudio do CortAI.
 *
 * O fluxo previsto é: áudio → transcrição → CortAI → Cortaí → resposta.
 *
 * Aqui não existe simulação: se o serviço de WhatsApp não entregar um endereço
 * de mídia acessível, ou se a IA não estiver disponível, a função devolve
 * `null` e o fluxo avisa a pessoa com honestidade de que só lê texto.
 */

const ENDPOINT = "https://ai.gateway.lovable.dev/v1/audio/transcriptions";
const MODELO = "google/gemini-3.5-transcribe";
const TAMANHO_MAXIMO = 12 * 1024 * 1024; // 12 MB

export function transcricaoConfigurada(): boolean {
  return Boolean(process.env["LOVABLE_API_KEY"]);
}

/**
 * Transcreve um áudio a partir do endereço entregue pelo gateway.
 * Devolve `null` quando não é possível transcrever de verdade.
 */
export async function transcreverAudio(
  midiaUrl: string | null | undefined,
): Promise<string | null> {
  const chave = process.env["LOVABLE_API_KEY"];
  if (!chave || !midiaUrl) return null;
  if (!/^https?:\/\//i.test(midiaUrl)) return null;

  try {
    const baixado = await fetch(midiaUrl, {
      headers: process.env["WHATSAPP_GATEWAY_API_KEY"]
        ? { authorization: `Bearer ${process.env["WHATSAPP_GATEWAY_API_KEY"]}` }
        : {},
    });
    if (!baixado.ok) return null;
    const bytes = await baixado.arrayBuffer();
    if (bytes.byteLength === 0 || bytes.byteLength > TAMANHO_MAXIMO) return null;

    const tipo = baixado.headers.get("content-type") ?? "audio/ogg";
    const formulario = new FormData();
    formulario.append("file", new Blob([bytes], { type: tipo }), "audio.ogg");
    formulario.append("model", MODELO);
    formulario.append("language", "pt");

    const resposta = await fetch(ENDPOINT, {
      method: "POST",
      headers: { authorization: `Bearer ${chave}` },
      body: formulario,
    });
    if (!resposta.ok) return null;
    const corpo = (await resposta.json()) as { text?: string };
    const texto = (corpo.text ?? "").trim();
    return texto.length > 0 ? texto : null;
  } catch {
    return null;
  }
}
