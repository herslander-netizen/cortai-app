import { afterEach, describe, expect, it, vi } from "vitest";

import { deslocamentoAteOMeio, ladoDoAgora, publicarAgora, solicitarAgora } from "./pilula-agora";

const area = { top: 100, bottom: 600 };

describe("pílula Agora", () => {
  afterEach(() => {
    publicarAgora({ lado: null, ir: null });
    vi.useRealTimers();
  });
  it("visível dentro da área livre", () => {
    expect(ladoDoAgora({ top: 300, bottom: 302 }, area)).toBe("visivel");
  });
  it("acima quando passou do topo fixo", () => {
    expect(ladoDoAgora({ top: 40, bottom: 42 }, area)).toBe("acima");
  });
  it("abaixo quando está atrás da faixa", () => {
    expect(ladoDoAgora({ top: 650, bottom: 652 }, area)).toBe("abaixo");
  });
  it("na borda conta como visível (sem piscar)", () => {
    expect(ladoDoAgora({ top: 99, bottom: 101 }, area)).toBe("visivel");
    expect(ladoDoAgora({ top: 599, bottom: 601 }, area)).toBe("visivel");
    expect(ladoDoAgora({ top: 600, bottom: 602 }, area)).toBe("visivel");
  });
  it("calcula a rolagem até o meio", () => {
    expect(deslocamentoAteOMeio(900, area)).toBe(550);
    expect(deslocamentoAteOMeio(350, area)).toBe(0);
  });
  it("expira um pedido guardado depois de dois segundos", () => {
    vi.useFakeTimers();
    const ir = vi.fn();
    solicitarAgora();
    vi.advanceTimersByTime(2_001);
    publicarAgora({ lado: "visivel", ir });
    vi.runAllTimers();
    expect(ir).not.toHaveBeenCalled();
  });
});
