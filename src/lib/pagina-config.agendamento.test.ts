import { describe, expect, it } from "vitest";

import { aplicarLayout, normalizarPagina } from "./pagina-config";

describe("layout Agendamento = maneira direta", () => {
  const base = normalizarPagina({ layout: "figaro-site-completo", experiencia: "vitrine" });

  it("escolher Agendamento faz o link abrir direto no agendamento", () => {
    const c = aplicarLayout(base, "figaro-agendamento");
    expect(c.layout).toBe("figaro-agendamento");
    expect(c.experiencia).toBe("direta");
    expect(c.chat.modo).toBe("tradicional");
  });

  it("sair do Agendamento volta para a página completa", () => {
    const direta = aplicarLayout(base, "figaro-agendamento");
    expect(aplicarLayout(direta, "figaro-site-completo").experiencia).toBe("vitrine");
  });

  it("o Chat continua sendo conversa e sair dele volta à vitrine", () => {
    const chat = aplicarLayout(base, "cortai-chat");
    expect(chat.experiencia).toBe("conversa");
    expect(aplicarLayout(chat, "figaro-site-completo").experiencia).toBe("vitrine");
  });

  it("página salva com Agendamento e vitrine passa a abrir direto", () => {
    const salva = normalizarPagina({ layout: "figaro-agendamento", experiencia: "vitrine" });
    expect(salva.experiencia).toBe("direta");
  });
});
