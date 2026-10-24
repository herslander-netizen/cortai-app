// @vitest-environment jsdom
import { act, createElement, createRef, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SecaoImagens } from "./SecaoImagens";

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({
    data: [
      { path: "logos/atual.webp", url: "https://example.test/atual.webp" },
      { path: "logos/anterior.webp", url: "https://example.test/anterior.webp" },
    ],
  }),
}));
vi.mock("@/lib/marca.functions", () => ({ listarLogosDoNegocio: vi.fn() }));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let host: HTMLDivElement | null = null;
let root: ReturnType<typeof createRoot> | null = null;

async function montar(element: ReactNode) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => root?.render(element));
  return host;
}

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  root = null;
  host?.remove();
  host = null;
});

describe("SecaoImagens — galeria de logos", () => {
  it("distingue a logo em uso e anima miniaturas disponíveis sem perder o clique", async () => {
    const usarLogo = vi.fn();
    const alvo = await montar(
      createElement(SecaoImagens, {
        coverRef: createRef<HTMLInputElement>(),
        fileRef: createRef<HTMLInputElement>(),
        coverPreview: "data:image/webp;base64,Y2FwYQ==",
        logoPreview: "data:image/webp;base64,bG9nbw==",
        logoAtual: "logos/atual.webp",
        busy: false,
        upload: vi.fn(),
        usarLogo,
        removerLogo: vi.fn(),
      }),
    );

    const ativa = alvo.querySelector<HTMLButtonElement>('button[aria-pressed="true"]');
    expect(ativa).not.toBeNull();
    expect(ativa?.disabled).toBe(true);
    expect(ativa?.textContent).toContain("Em uso");
    expect(ativa?.style.padding).toBe("16px");
    expect(ativa?.style.borderRadius).toBe("8px");

    const disponivel = Array.from(alvo.querySelectorAll<HTMLButtonElement>("button")).find(
      (botao) => botao.textContent?.includes("Usar esta logo"),
    );
    expect(disponivel).not.toBeUndefined();
    expect(disponivel?.getAttribute("aria-pressed")).toBe("false");
    expect(disponivel?.style.padding).toBe("8px");
    expect(disponivel?.style.borderRadius).toBe("12px");

    await act(async () => disponivel?.click());
    expect(usarLogo).toHaveBeenCalledWith(
      "logos/anterior.webp",
      "https://example.test/anterior.webp",
    );
  });
});
