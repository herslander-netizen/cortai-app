// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Button } from "./button";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let host: HTMLDivElement | null = null;
afterEach(() => {
  host?.remove();
  host = null;
});

function render(element: React.ReactNode) {
  host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => root.render(element));
  return { root, button: host.querySelector("button") as HTMLButtonElement };
}

describe("Button", () => {
  it.each(["primary", "secondary", "ghost", "text", "destructive"] as const)(
    "renderiza a variante %s",
    (variant) => {
      const { button } = render(<Button variant={variant}>Ação</Button>);
      expect(button.className).toBeTruthy();
      expect(button.textContent).toContain("Ação");
    },
  );

  it("mostra spinner durante carregamento", async () => {
    vi.useFakeTimers();
    const { button } = render(<Button loading>Salvar</Button>);
    expect(button.disabled).toBe(true);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(301);
    });
    expect(button.querySelector(".animate-spin")).not.toBeNull();
    vi.useRealTimers();
  });

  it("bloqueia toque duplo enquanto a ação aguarda", async () => {
    let resolver: (() => void) | undefined;
    const acao = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolver = resolve;
        }),
    );
    const { button } = render(<Button onClick={acao}>Salvar</Button>);
    act(() => {
      button.click();
      button.click();
    });
    expect(acao).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolver?.();
    });
  });

  it("exige aria-label em botão de ícone", () => {
    expect(() => render(<Button variant="icon">×</Button>)).toThrow("aria-label");
    const { button } = render(
      <Button variant="icon" aria-label="Fechar">
        ×
      </Button>,
    );
    expect(button.getAttribute("aria-label")).toBe("Fechar");
  });

  it("permite conteúdo em bloco sem altura ou quebra forçadas", () => {
    const { button } = render(
      <Button size="bloco">
        <span>Nome</span>
        <small>Descrição em mais de uma linha</small>
      </Button>,
    );
    expect(button.className).toContain("h-auto");
    expect(button.className).toContain("flex-col");
    expect(button.className).toContain("whitespace-normal");
  });
});
