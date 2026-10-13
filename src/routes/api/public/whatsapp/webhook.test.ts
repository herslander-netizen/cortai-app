import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verificarAssinaturaMeta } from "./webhook";

describe("verificarAssinaturaMeta", () => {
  const segredo = "segredo-de-teste";
  const corpo = '{"entry":[]}';
  const assinatura = "sha256=" + createHmac("sha256", segredo).update(corpo, "utf8").digest("hex");

  it("aceita assinatura válida para o corpo exato", () => {
    expect(verificarAssinaturaMeta(corpo, assinatura, segredo)).toBe(true);
  });

  it("rejeita assinatura ausente ou segredo ausente", () => {
    expect(verificarAssinaturaMeta(corpo, null, segredo)).toBe(false);
    expect(verificarAssinaturaMeta(corpo, assinatura, undefined)).toBe(false);
  });

  it("rejeita assinatura inválida e corpo alterado", () => {
    expect(verificarAssinaturaMeta(corpo, "sha256=" + "0".repeat(64), segredo)).toBe(false);
    expect(verificarAssinaturaMeta(corpo + " ", assinatura, segredo)).toBe(false);
  });

  it("rejeita prefixo inesperado", () => {
    expect(verificarAssinaturaMeta(corpo, assinatura.replace("sha256=", "sha1="), segredo)).toBe(false);
  });
});
