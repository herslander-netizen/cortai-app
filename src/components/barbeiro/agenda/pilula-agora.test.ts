import { describe, expect, it } from "vitest";

import { deslocamentoAteOMeio, ladoDoAgora } from "./pilula-agora";

const area = { top: 100, bottom: 600 };

describe("pílula Agora", () => {
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
});
