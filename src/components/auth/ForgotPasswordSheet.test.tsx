// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ForgotPasswordSheet } from "./ForgotPasswordSheet";

vi.mock("framer-motion", async (importOriginal) => {
  const original = await importOriginal<typeof import("framer-motion")>();
  return { ...original, useReducedMotion: () => false };
});

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

beforeEach(() => {
  Object.defineProperty(window, "requestAnimationFrame", { configurable: true, value: () => 1 });
  Object.defineProperty(window, "cancelAnimationFrame", { configurable: true, value: () => undefined });
});

let host: HTMLDivElement | null = null;
let root: ReturnType<typeof createRoot> | null = null;

async function montar() {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root?.render(createElement(ForgotPasswordSheet, {
      isOpen: true,
      onClose: vi.fn(),
      initialEmail: "teste@exemplo.com",
      onSubmitEmail: vi.fn(async () => true),
      onVerifyCode: vi.fn(async () => true),
      onContinue: vi.fn(),
    }));
  });
  return host;
}

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  root = null;
  host?.remove();
  host = null;
});

describe("ForgotPasswordSheet", () => {
  it("mantém os campos legíveis sobre a superfície clara da recuperação", async () => {
    const alvo = await montar();
    const tela = alvo.querySelector<HTMLElement>('[role="dialog"]');
    const campo = alvo.querySelector<HTMLInputElement>('input[type="email"]');

    expect(tela?.style.getPropertyValue("--campo-fundo")).toBe("var(--figaro-surface-container-highest)");
    expect(tela?.style.getPropertyValue("--paper")).toBe("var(--figaro-on-surface)");
    expect(tela?.style.getPropertyValue("--mute")).toBe("var(--figaro-on-surface-variant)");
    expect(campo?.classList.contains("field-control")).toBe(true);
  });
});
