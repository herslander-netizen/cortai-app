import { describe, expect, it } from "vitest";

import { deveMostrarStatusDoChat } from "./ChatShell";

describe("deveMostrarStatusDoChat", () => {
  it("esconde presença estática online abaixo do nome", () => {
    expect(deveMostrarStatusDoChat("Online agora", false)).toBe(false);
    expect(deveMostrarStatusDoChat("Agenda online", false)).toBe(false);
  });

  it("mantém estados de atividade como digitando", () => {
    expect(deveMostrarStatusDoChat("digitando…", true)).toBe(true);
  });

  it("mantém aviso de funcionamento quando está fechado", () => {
    expect(deveMostrarStatusDoChat("Fechado agora · abre amanhã às 09:00", false)).toBe(true);
  });

  it("não renderiza uma linha vazia sem status", () => {
    expect(deveMostrarStatusDoChat(undefined, false)).toBe(false);
  });
});
