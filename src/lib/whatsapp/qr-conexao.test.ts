import { describe, expect, it } from "vitest";
import { qrAposEstado } from "./qr-conexao";

const agora = Date.parse("2026-10-08T17:00:00Z");
const futuro = "2026-10-08T17:01:00Z";
const passado = "2026-10-08T16:59:00Z";
const atual = { qr_code: "QR1", qr_expira_em: futuro };

describe("qrAposEstado", () => {
  it("A/E/F: connecting preserva QR válido", () => {
    expect(qrAposEstado("conectando", {}, atual, agora)).toEqual(atual);
  });
  it("B: connecting sem QR fica vazio", () => {
    expect(qrAposEstado("conectando", {}, null, agora).qr_code).toBeNull();
  });
  it("C/G: conectado remove QR", () => {
    expect(qrAposEstado("conectado", { qrCode: "X" }, atual, agora).qr_code).toBeNull();
  });
  it("D: QR expirado é removido", () => {
    expect(qrAposEstado("conectando", {}, { qr_code: "Q", qr_expira_em: passado }, agora).qr_code).toBeNull();
  });
  it("QR novo substitui o anterior", () => {
    expect(qrAposEstado("qr_pronto", { qrCode: "QR2", qrExpiraEm: futuro }, atual, agora).qr_code).toBe("QR2");
  });
  it("desconectado limpa", () => {
    expect(qrAposEstado("desconectado", {}, atual, agora).qr_code).toBeNull();
  });
});
