// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConsentimentoAvisosWhatsapp } from "./ConsentimentoAvisosWhatsapp";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let alvo: HTMLDivElement | null = null;
let desmontar: (() => void) | null = null;

afterEach(() => {
  if (desmontar) act(() => desmontar?.());
  alvo?.remove();
  alvo = null;
  desmontar = null;
});

describe("consentimento dos avisos no agendamento", () => {
  it("nasce desligado e permite agendar sem autorizar mensagens", () => {
    alvo = document.createElement("div");
    document.body.appendChild(alvo);
    const raiz = createRoot(alvo);
    desmontar = () => raiz.unmount();
    act(() => raiz.render(createElement(ConsentimentoAvisosWhatsapp, {
      aceito: false,
      aoAlterar: vi.fn(),
    })));
    const check = alvo.querySelector<HTMLInputElement>('input[type="checkbox"]');
    expect(check).not.toBeNull();
    expect(check?.checked).toBe(false);
    expect(alvo.textContent).toContain("opcional");
  });

  it("requer ação expressa para ativar o recebimento", () => {
    alvo = document.createElement("div");
    document.body.appendChild(alvo);
    const raiz = createRoot(alvo);
    desmontar = () => raiz.unmount();
    const aoAlterar = vi.fn();
    act(() => raiz.render(createElement(ConsentimentoAvisosWhatsapp, {
      aceito: false,
      aoAlterar,
    })));
    act(() => alvo?.querySelector<HTMLInputElement>('input[type="checkbox"]')?.click());
    expect(aoAlterar).toHaveBeenCalledWith(true);
  });
});
