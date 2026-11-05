import { describe, expect, it } from "vitest";

import { remetenteDaEvolution } from "./remetente-evolution";

describe("remetenteDaEvolution", () => {
  it("contato pelo número", () => {
    expect(remetenteDaEvolution({ key: { remoteJid: "557998181983@s.whatsapp.net" } })).toEqual({
      tipo: "contato",
      telefone: "557998181983",
    });
  });

  it("contato por @lid com o número em remoteJidAlt", () => {
    expect(
      remetenteDaEvolution({
        key: { remoteJid: "153197792497769@lid", remoteJidAlt: "557999171258@s.whatsapp.net" },
      }),
    ).toEqual({ tipo: "contato", telefone: "557999171258" });
  });

  it("contato por @lid com o número em senderPn (chave ou dados)", () => {
    expect(
      remetenteDaEvolution({
        key: { remoteJid: "153197792497769@lid", senderPn: "557999171258@s.whatsapp.net" },
      }),
    ).toEqual({ tipo: "contato", telefone: "557999171258" });
    expect(
      remetenteDaEvolution({
        key: { remoteJid: "153197792497769@lid" },
        senderPn: "557999171258@s.whatsapp.net",
      }),
    ).toEqual({ tipo: "contato", telefone: "557999171258" });
  });

  it("@lid sem número: ignorado com motivo próprio (não é grupo)", () => {
    expect(remetenteDaEvolution({ key: { remoteJid: "153197792497769@lid" } })).toEqual({
      tipo: "ignorar",
      motivo: "lid_sem_numero",
    });
  });

  it("grupos, transmissões e canais continuam fora", () => {
    for (const jid of ["1203630@g.us", "status@broadcast", "1203@newsletter"])
      expect(remetenteDaEvolution({ key: { remoteJid: jid } })).toEqual({
        tipo: "ignorar",
        motivo: "grupo",
      });
  });

  it("número com sufixo de aparelho (:12) vira só o número", () => {
    expect(remetenteDaEvolution({ key: { remoteJid: "557998181983:12@s.whatsapp.net" } })).toEqual({
      tipo: "contato",
      telefone: "557998181983",
    });
  });
});
