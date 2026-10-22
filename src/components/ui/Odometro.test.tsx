// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeAll, describe, expect, it } from "vitest";

import { sentidosDoOdometro } from "@/lib/odometro";

import { Odometro } from "./Odometro";
import { PulsoDeNumero } from "./PulsoDeNumero";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

describe("sentidosDoOdometro", () => {
  it("o dígito maior entra de baixo e o menor de cima; o que não muda fica parado", () => {
    expect(sentidosDoOdometro("128", "135")).toEqual([0, 1, -1]);
    expect(sentidosDoOdometro("4,6", "4,6")).toEqual([0, 0, 0]);
  });

  it("alinha pela direita quando o número ganha um dígito", () => {
    expect(sentidosDoOdometro("9", "10")).toEqual([0, -1]);
    expect(sentidosDoOdometro("9%", "15%")).toEqual([0, -1, 0]);
  });
});

describe("Odometro e PulsoDeNumero", () => {
  beforeAll(() => {
    window.matchMedia ??= ((query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    })) as unknown as typeof window.matchMedia;
  });

  it("mostram o texto e leem o número inteiro para leitores de tela", () => {
    const host = document.createElement("div");
    const root = createRoot(host);
    act(() =>
      root.render(
        <PulsoDeNumero chave="a">
          <Odometro texto="1.240" />
        </PulsoDeNumero>,
      ),
    );
    expect(host.textContent).toBe("1.240");
    expect(host.querySelector('[aria-label="1.240"]')).not.toBeNull();
    act(() =>
      root.render(
        <PulsoDeNumero chave="a">
          <Odometro texto="1.241" />
        </PulsoDeNumero>,
      ),
    );
    expect(host.querySelector('[aria-label="1.241"]')).not.toBeNull();
    act(() => root.unmount());
  });
});
