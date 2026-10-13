import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  verificarWebhookIndependente,
} from "./lovable-signature.server";

const secret = "segredo-de-teste-com-tamanho-suficiente";
const now = 1_800_000_000_000;
function request(body: string, timestamp = String(Math.floor(now / 1000)), key = secret) {
  const signature = createHmac("sha256", key).update(`${timestamp}.${body}`).digest("hex");
  return new Request("https://example.test/webhook", {
    method: "POST",
    headers: { "content-type": "application/json", "x-lovable-timestamp": timestamp, "x-lovable-signature": signature },
    body,
  });
}

describe("verificarWebhookIndependente", () => {
  it("aceita assinatura válida e devolve payload", async () => {
    const result = await verificarWebhookIndependente<{ ok: boolean }>({ req: request('{"ok":true}'), secret, nowMs: now });
    expect(result.payload).toEqual({ ok: true });
  });
  it("rejeita assinatura ausente/inválida", async () => {
    const req = request('{"ok":true}');
    const headers = new Headers(req.headers);
    headers.set("x-lovable-signature", "invalid");
    await expect(verificarWebhookIndependente({ req: new Request(req.url, { method: "POST", headers, body: '{"ok":true}' }), secret, nowMs: now }))
      .rejects.toMatchObject({ code: "invalid_signature" });
  });
  it("rejeita corpo alterado após assinatura", async () => {
    const signed = request('{"ok":true}');
    await expect(verificarWebhookIndependente({ req: new Request(signed.url, { method: "POST", headers: signed.headers, body: '{"ok":false}' }), secret, nowMs: now }))
      .rejects.toMatchObject({ code: "invalid_signature" });
  });
  it("rejeita timestamp antigo e inválido", async () => {
    const stale = String(Math.floor((now - 600_000) / 1000));
    await expect(verificarWebhookIndependente({ req: request('{"ok":true}', stale), secret, nowMs: now }))
      .rejects.toMatchObject({ code: "stale_timestamp" });
    await expect(verificarWebhookIndependente({ req: request('{"ok":true}', "not-a-time"), secret, nowMs: now }))
      .rejects.toMatchObject({ code: "invalid_timestamp" });
  });
  it("rejeita JSON inválido mesmo se assinado", async () => {
    await expect(verificarWebhookIndependente({ req: request("{"), secret, nowMs: now }))
      .rejects.toMatchObject({ code: "invalid_json" });
  });
  it("rejeita payload maior que o limite", async () => {
    await expect(verificarWebhookIndependente({ req: request('{"texto":"grande"}'), secret, maxBodyBytes: 4, nowMs: now }))
      .rejects.toMatchObject({ code: "body_too_large" });
  });
});
