import { describe, expect, it } from "vitest";

import { aplicarEstiloDoChat, ESTILOS_DO_CHAT, estiloAtualDoChat } from "./estilos-chat";
import { aplicarLayout, configPadrao } from "./pagina-config";

describe("estilos do chat", () => {
  it("o padrão é o estilo Flow (o visual de sempre)", () => {
    expect(estiloAtualDoChat(configPadrao().chat)).toBe("cortai");
  });

  it("aplica um estilo sem perder recepção nem mensagens", () => {
    const base = configPadrao();
    base.chat.nomeRecepcao = "Ana";
    const c = aplicarEstiloDoChat(base, "elegante");
    expect(c.chat.estilo).toBe("elegante");
    expect(c.chat.nomeRecepcao).toBe("Ana");
    expect(estiloAtualDoChat(c.chat)).toBe("elegante");
  });

  it("ajuste solto deixa o estilo como personalizado", () => {
    const c = aplicarEstiloDoChat(configPadrao(), "suave");
    expect(estiloAtualDoChat({ ...c.chat, texto: "grande" })).toBeNull();
  });

  it("os estilos prontos são todos diferentes", () => {
    const chaves = ESTILOS_DO_CHAT.map((e) => JSON.stringify(e.valores));
    expect(new Set(chaves).size).toBe(ESTILOS_DO_CHAT.length);
  });

  it("escolher o layout Chat liga a conversa e sair dele volta à vitrine", () => {
    const chat = aplicarLayout(configPadrao(), "cortai-chat");
    expect(chat.experiencia).toBe("conversa");
    expect(chat.chat.modo).toBe("conversa");
    const volta = aplicarLayout(chat, "figaro-site-completo");
    expect(volta.experiencia).toBe("vitrine");
    expect(volta.chat.modo).toBe("tradicional");
    // Quem escolheu "Direta" e troca entre sites não é mexido.
    const direta = aplicarLayout(
      { ...configPadrao(), experiencia: "direta" },
      "figaro-agendamento",
    );
    expect(direta.experiencia).toBe("direta");
  });
});
