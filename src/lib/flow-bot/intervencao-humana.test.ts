import { describe, expect, it } from "vitest";

import { eventoComMensagemDeSaidaReal } from "./intervencao-humana";

const chave = { remoteJid: "5579991112222@s.whatsapp.net", fromMe: true, id: "msg-1" };
const evento = (message?: unknown, resto: Record<string, unknown> = {}) => ({
  key: chave,
  ...(message === undefined ? {} : { message }),
  ...resto,
});

describe("identificação de intervenção humana no WhatsApp", () => {
  it("abrir a conversa, marcar como lida, receber notificação ou atualizar status não é resposta", () => {
    for (const dados of [
      evento(),
      evento({}),
      evento({ protocolMessage: { type: 0, key: { id: "msg-anterior" } } }),
      evento({ senderKeyDistributionMessage: { groupId: "g" } }),
      evento({ reactionMessage: { text: "👍" } }),
      evento({ messageContextInfo: { deviceListMetadataVersion: 2 } }),
      evento({ conversation: "   " }),
      evento({ extendedTextMessage: { text: "" } }),
      evento({ conversation: "Já tinha enviado" }, { type: "append" }),
    ]) {
      expect(eventoComMensagemDeSaidaReal(dados)).toBe(false);
    }
  });

  it("só considera mensagens realmente enviadas do próprio número", () => {
    expect(eventoComMensagemDeSaidaReal({ ...evento({ conversation: "Vou atender" }), key: { ...chave, fromMe: false } })).toBe(false);
    expect(eventoComMensagemDeSaidaReal(evento({ conversation: "Oi, vou verificar seu horário." }))).toBe(true);
    expect(eventoComMensagemDeSaidaReal(evento({ extendedTextMessage: { text: "Agora eu assumo." } }))).toBe(true);
    expect(eventoComMensagemDeSaidaReal(evento({ ephemeralMessage: { message: { conversation: "Olá" } } }))).toBe(true);
  });

  it("áudio, foto, documento, vídeo, localização, figurinha e contato enviados também são mensagens", () => {
    for (const tipo of [
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
    ]) {
      expect(eventoComMensagemDeSaidaReal(evento({ [tipo]: {} })), tipo).toBe(true);
    }
  });

  it("não atribui autoria humana a envios automáticos: o registro do Flow ainda deve ser conferido por ID", () => {
    // fromMe + conteúdo é apenas candidato; verificar ehEnvioDoFlow no servidor antes de pausar.
    expect(eventoComMensagemDeSaidaReal(evento({ conversation: "Confirmado!" }))).toBe(true);
  });
});
