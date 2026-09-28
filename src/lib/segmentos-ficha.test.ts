import { describe, expect, it } from "vitest";
import { CHIPS_FICHA_BARBEARIA, SEGMENTOS_CONFIG, chipsSaoPadraoBarbearia } from "./segmentos";

describe("atalhos da ficha por segmento", () => {
  it("barbearia mantém o padrão atual", () => {
    expect(SEGMENTOS_CONFIG.barbearia.chipsFicha).toEqual(["Degradê", "Máquina 1", "Barba marcada", "Pouca conversa"]);
  });
  it("cada segmento grava seus atalhos na criação", () => {
    expect(SEGMENTOS_CONFIG.salao.chipsFicha).toContain("Fórmula da coloração");
    expect(SEGMENTOS_CONFIG.cabeleireiro.chipsFicha).toEqual(SEGMENTOS_CONFIG.salao.chipsFicha);
    expect(SEGMENTOS_CONFIG.esmalteria.chipsFicha).toContain("Alergia a esmalte");
    expect(SEGMENTOS_CONFIG.sobrancelha_cilios.chipsFicha).toContain("Curvatura D");
    expect(SEGMENTOS_CONFIG.estetica.chipsFicha).toContain("Pele oleosa");
    expect(SEGMENTOS_CONFIG.outro.chipsFicha).toEqual(["Pouca conversa"]);
  });
  it("detecta atalhos ainda padrão da barbearia", () => {
    expect(chipsSaoPadraoBarbearia([...CHIPS_FICHA_BARBEARIA].reverse())).toBe(true);
    expect(chipsSaoPadraoBarbearia([...CHIPS_FICHA_BARBEARIA, "Outro"])).toBe(false);
  });
  it("sugestões trazem o retorno; barbearia fica sem valor", () => {
    expect(SEGMENTOS_CONFIG.barbearia.servicosSugeridos.every((s) => s.retornoDias === undefined)).toBe(true);
    const manicure = SEGMENTOS_CONFIG.esmalteria.servicosSugeridos.find((s) => s.nome === "Manicure");
    expect(manicure?.retornoDias).toBe(15);
    expect(SEGMENTOS_CONFIG.salao.servicosSugeridos.find((s) => s.nome === "Escova")?.retornoDias).toBeUndefined();
  });
});
