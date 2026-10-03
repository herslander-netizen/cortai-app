// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AtualizacaoObrigatoria } from "./AtualizacaoObrigatoria";

describe("AtualizacaoObrigatoria", () => {
  it("deixa o resto inerte e foca Atualizar agora", () => {
    const fora = document.createElement("button");
    fora.textContent = "atrás";
    document.body.appendChild(fora);
    render(<AtualizacaoObrigatoria />);
    expect(fora.hasAttribute("inert")).toBe(true);
    expect(screen.getByRole("alertdialog")).toBeTruthy();
    expect(document.activeElement?.textContent).toBe("Atualizar agora");
  });
});
