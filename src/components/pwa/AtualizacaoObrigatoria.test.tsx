// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import { AtualizacaoObrigatoria } from "./AtualizacaoObrigatoria";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("AtualizacaoObrigatoria", () => {
  it("deixa o resto inerte, foca Atualizar agora e ignora Esc", () => {
    const fora = document.createElement("button");
    document.body.appendChild(fora);
    const alvo = document.createElement("div");
    document.body.appendChild(alvo);
    act(() => createRoot(alvo).render(<AtualizacaoObrigatoria />));
    expect(fora.hasAttribute("inert")).toBe(true);
    expect(alvo.hasAttribute("inert")).toBe(false);
    expect(document.querySelector("[role=alertdialog]")).toBeTruthy();
    expect(document.activeElement?.textContent).toBe("Atualizar agora");
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(document.querySelector("[role=alertdialog]")).toBeTruthy();
  });
});
