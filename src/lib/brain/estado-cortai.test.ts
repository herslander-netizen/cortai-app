import { describe, expect, it } from "vitest";

import { PAUSA_MS, SELO_DA_CORTAI, bloqueioDaConfig, textoDoBloqueio } from "./estado-cortai";

describe("bloqueioDaConfig", () => {
  const agora = Date.parse("2026-10-10T12:00:00Z");

  it("sem linha salva, a Flow IA está ativa", () => {
    expect(bloqueioDaConfig(null, agora)).toBeNull();
    expect(bloqueioDaConfig({}, agora)).toBeNull();
  });
  it("antes da migração (coluna ausente) continua ativa", () => {
    expect(bloqueioDaConfig({ ia_pausada_em: null }, agora)).toBeNull();
  });
  it("interruptor do ADM desligado vence a pausa", () => {
    expect(
      bloqueioDaConfig(
        { cortai_ativa: false, ia_pausada_em: new Date(agora).toISOString() },
        agora,
      ),
    ).toBe("desligada");
  });
  it("pausa vale por 6 h e depois libera nova tentativa", () => {
    const dentro = new Date(agora - PAUSA_MS + 60_000).toISOString();
    const fora = new Date(agora - PAUSA_MS - 60_000).toISOString();
    expect(bloqueioDaConfig({ cortai_ativa: true, ia_pausada_em: dentro }, agora)).toBe("pausada");
    expect(bloqueioDaConfig({ cortai_ativa: true, ia_pausada_em: fora }, agora)).toBeNull();
  });
});

describe("selos", () => {
  it("todo estado tem selo e texto; desligar a IA não desliga a agenda", () => {
    for (const s of Object.values(SELO_DA_CORTAI)) {
      expect(s.rotulo.length).toBeGreaterThan(0);
      expect(s.texto.length).toBeGreaterThan(0);
    }
    expect(textoDoBloqueio("desligada")).toContain("Agenda");
  });
});
