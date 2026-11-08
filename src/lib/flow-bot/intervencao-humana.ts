/**
 * Apenas mensagens de saída com conteúdo representam uma possível intervenção humana.
 * A flag fromMe indica origem no número do negócio, não que a pessoa abriu/leu a conversa.
 * Esta função NÃO distingue envios do Flow: o chamador ainda deve consultar ehEnvioDoFlow.
 */
const TIPOS_DE_MIDIA = [
  "audioMessage",
  "imageMessage",
  "videoMessage",
  "documentMessage",
  "stickerMessage",
  "contactMessage",
  "contactsArrayMessage",
  "locationMessage",
  "liveLocationMessage",
  "ptvMessage",
] as const;

function objeto(valor: unknown): Record<string, unknown> | null {
  return valor && typeof valor === "object" && !Array.isArray(valor)
    ? (valor as Record<string, unknown>)
    : null;
}

function mensagemReal(valor: unknown, profundidade = 0): boolean {
  const mensagem = objeto(valor);
  if (!mensagem || profundidade > 3) return false;
  if (typeof mensagem["conversation"] === "string" && mensagem["conversation"].trim()) return true;
  const estendida = objeto(mensagem["extendedTextMessage"]);
  if (typeof estendida?.["text"] === "string" && estendida["text"].trim()) return true;
  if (TIPOS_DE_MIDIA.some((tipo) => objeto(mensagem[tipo]) !== null)) return true;

  // Mensagens temporárias/visualização única ainda são envios, não eventos de leitura.
  for (const tipo of ["ephemeralMessage", "viewOnceMessage", "viewOnceMessageV2", "viewOnceMessageV2Extension"]) {
    const envelope = objeto(mensagem[tipo]);
    if (envelope && mensagemReal(envelope["message"], profundidade + 1)) return true;
  }
  // protocolMessage, senderKeyDistributionMessage, reactionMessage, recibos,
  // sync/histórico e envelopes vazios não comprovam resposta da equipe.
  return false;
}

/**
 * Evidência de envio novo pelo próprio número, para usar SOMENTE no ramo
 * messages.upsert antes de registrarRespostaDoNegocio.
 */
export function eventoComMensagemDeSaidaReal(dados: Record<string, unknown>): boolean {
  const chave = objeto(dados["key"]);
  if (chave?.["fromMe"] !== true) return false;
  // Histórico importado não deve reiniciar a pausa ao reconectar.
  if (dados["type"] === "append") return false;
  return mensagemReal(dados["message"]);
}
