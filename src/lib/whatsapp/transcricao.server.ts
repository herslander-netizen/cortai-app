/**
 * Transcrição de áudio do WhatsApp para o CortAI (só servidor).
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
  modeloReserva?: string;
  lovable: boolean;
};

/** Resolve o mesmo provedor escolhido para o cérebro; nunca troca silenciosamente de fornecedor. */
function configuracaoTranscricao(): ConfiguracaoTranscricao | null {
  const leitura = lerConfigDoProvedor();
  if (!leitura.ok) return null;
  if (leitura.config.tipo !== "compativel") return null;
  return {
    endpoint: process.env["CORTAI_STT_BASE_URL"]?.trim().replace(/\\/+$/, "") || `${leitura.config.baseUrl}/audio/transcriptions`,
    chave: process.env["CORTAI_STT_API_KEY"]?.trim() || leitura.config.chave,
    modelo: process.env["CORTAI_STT_MODEL"]?.trim() || process.env["CORTAI_AI_TRANSCRIPTION_MODEL"]?.trim() || "whisper-1",
  };    const corpo = (await resposta.json().catch(() => null)) as Record<string, unknown> | null;
    const texto = typeof corpo?.["text"] === "string" ? corpo["text"].trim() : "";
    return texto.length >= 2 ? texto : null;
