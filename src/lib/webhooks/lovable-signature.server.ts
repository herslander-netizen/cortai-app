import { createHmac, timingSafeEqual } from "node:crypto";

export type WebhookVerificationCode =
  | "missing_signature"
  | "invalid_signature"
  | "invalid_timestamp"
  | "stale_timestamp"
  | "body_too_large"
  | "invalid_json";

export class WebhookVerificationError extends Error {
  constructor(readonly code: WebhookVerificationCode) {
    super(code);
    this.name = "WebhookVerificationError";
  }
}

export type VerifiedWebhook<T> = { payload: T; body: string };

/** Verifica HMAC-SHA256 de timestamp.corpo cru, sem depender do SDK do fornecedor. */
export async function verificarWebhookIndependente<T = unknown>(opcoes: {
  req: Request;
  secret: string;
  maxBodyBytes?: number;
  toleranceMs?: number;
  nowMs?: number;
}): Promise<VerifiedWebhook<T>> {
  const { req, secret } = opcoes;
  const maxBodyBytes = opcoes.maxBodyBytes ?? 4 * 1024 * 1024;
  const toleranceMs = opcoes.toleranceMs ?? 5 * 60 * 1000;
  if (!secret.trim()) throw new WebhookVerificationError("missing_signature");

  const assinatura = req.headers.get("x-lovable-signature");
  const timestamp = req.headers.get("x-lovable-timestamp") ?? "";
  if (!assinatura || !timestamp) throw new WebhookVerificationError("missing_signature");
  if (!/^\d{10,13}$/.test(timestamp)) throw new WebhookVerificationError("invalid_timestamp");

  const numero = Number(timestamp);
  const timestampMs = timestamp.length === 10 ? numero * 1000 : numero;
  const agora = opcoes.nowMs ?? Date.now();
  if (!Number.isSafeInteger(timestampMs) || Math.abs(agora - timestampMs) > toleranceMs) {
    throw new WebhookVerificationError("stale_timestamp");
  }

  const corpo = await req.text();
  if (new TextEncoder().encode(corpo).byteLength > maxBodyBytes) {
    throw new WebhookVerificationError("body_too_large");
  }

  const esperada = createHmac("sha256", secret).update(`${timestamp}.${corpo}`, "utf8").digest("hex");
  const recebida = assinatura.replace(/^sha256=/, "").trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(recebida)) throw new WebhookVerificationError("invalid_signature");
  const recebidaBytes = Buffer.from(recebida, "hex");
  const esperadaBytes = Buffer.from(esperada, "hex");
  if (recebidaBytes.length !== esperadaBytes.length || !timingSafeEqual(recebidaBytes, esperadaBytes)) {
    throw new WebhookVerificationError("invalid_signature");
  }

  let payload: T;
  try {
    payload = JSON.parse(corpo) as T;
  } catch {
    throw new WebhookVerificationError("invalid_json");
  }
  return { payload, body: corpo };
}
