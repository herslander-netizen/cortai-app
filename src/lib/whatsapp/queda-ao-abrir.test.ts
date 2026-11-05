import { describe, expect, it } from "vitest";

import { erroDaQueda, TEXTO_QUEDA_AO_ABRIR } from "./queda-ao-abrir";

describe("queda ao abrir a conexão", () => {
  it("401 enquanto o QR ou o código estavam na tela: avisa que não é o número", () => {
    expect(erroDaQueda({ estadoNovo: "close", motivo: 401, statusAnterior: "qr_pronto" })).toBe(
      TEXTO_QUEDA_AO_ABRIR,
    );
    expect(erroDaQueda({ estadoNovo: "close", motivo: "401", statusAnterior: "conectando" })).toBe(
      TEXTO_QUEDA_AO_ABRIR,
    );
  });

  it("depois de conectado, ou por outro motivo, não inventa explicação", () => {
    expect(
      erroDaQueda({ estadoNovo: "close", motivo: 401, statusAnterior: "conectado" }),
    ).toBeNull();
    expect(
      erroDaQueda({ estadoNovo: "close", motivo: 428, statusAnterior: "qr_pronto" }),
    ).toBeNull();
    expect(
      erroDaQueda({ estadoNovo: "open", motivo: 200, statusAnterior: "qr_pronto" }),
    ).toBeNull();
  });
});
