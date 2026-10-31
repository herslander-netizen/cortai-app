// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AccessCodeInput } from "./AccessCodeInput";

vi.mock("framer-motion", async (importOriginal) => {
  const original = await importOriginal<typeof import("framer-motion")>();
  return { ...original, useReducedMotion: () => false };
});

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement | null = null;
let root: ReturnType<typeof createRoot> | null = null;

async function montar(onCodeComplete = vi.fn(async () => true)) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root?.render(createElement(AccessCodeInput, {
      emailOuTelefone: "teste@exemplo.com",
      onCodeComplete,
      onResendCode: vi.fn(async () => undefined),
    }));
  });
  return { alvo: host, onCodeComplete };
}

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  root = null;
  host?.remove();
  host = null;
  vi.useRealTimers();
});

describe("AccessCodeInput", () => {
  it("só libera a confirmação depois de preencher os seis dígitos", async () => {
    const { alvo, onCodeComplete } = await montar();
    const campos = [...alvo.querySelectorAll<HTMLInputElement>('input[aria-label^="Dígito"]')];
    const confirmar = alvo.querySelector<HTMLButtonElement>('button[type="button"]');

    expect(campos).toHaveLength(6);
    expect(confirmar?.disabled).toBe(true);

    for (const [indice, campo] of campos.entries()) {
      await act(async () => {
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
        setter?.call(campo, String(indice + 1));
        campo.dispatchEvent(new Event("input", { bubbles: true }));
      });
    }

    expect(confirmar?.disabled).toBe(false);
    await act(async () => confirmar?.click());
    expect(onCodeComplete).toHaveBeenCalledWith("123456");
  });

  it("aceita colar o código inteiro sem verificar antes do toque", async () => {
    const { alvo, onCodeComplete } = await montar();
    const primeiro = alvo.querySelector<HTMLInputElement>('input[aria-label="Dígito 1 de 6"]');
    const confirmar = [...alvo.querySelectorAll<HTMLButtonElement>("button")].find((button) => button.textContent?.includes("Confirmar código"));

    await act(async () => {
      const evento = new Event("paste", { bubbles: true, cancelable: true });
      Object.defineProperty(evento, "clipboardData", { value: { getData: () => "123456" } });
      primeiro?.dispatchEvent(evento);
    });

    expect(onCodeComplete).not.toHaveBeenCalled();
    expect(confirmar?.disabled).toBe(false);
  });
});
