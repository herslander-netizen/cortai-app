import { describe, expect, it } from "vitest";

import { deveMostrarStatusDoChat } from "./ChatShell";

describe("deveMostrarStatusDoChat", () => {
  it("mantém o texto Online agora sem o ponto piscante ao lado", () => {
    expect(deveMostrarStatusDoChat("Online agora")).toBe(true);
    expect(deveMostrarStatusDoChat("Agenda online")).toBe(true);
  });

  it("mantém os estados de atividade como digitando", () => {
    expect(deveMostrarStatusDoChat("digitando…")).toBe(true);
  });

  it("mantém avisos de funcionamento quando está fechado", () => {
    expect(deveMostrarStatusDoChat("Fechado agora · abre amanhã às 09:00")).toBe(true);
  });

  it("não renderiza uma linha vazia sem status", () => {
    expect(deveMostrarStatusDoChat(undefined)).toBe(false);
  });
});
