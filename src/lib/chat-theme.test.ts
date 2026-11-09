import { describe, expect, it } from "vitest";
import { SEGMENTOS } from "@/lib/segmentos";
import { ICONES_DO_CHAT_POR_SEGMENTO } from "@/components/chat/PadraoChatSegmento";
import { tokensEscurosDaAgendaParaChat } from "@/lib/chat-theme";

describe("Chat Flow: tema escuro e padrões", () => {
  it("tem símbolos por segmento oficial e não mistura categorias", () => {
    expect(Object.keys(ICONES_DO_CHAT_POR_SEGMENTO)).toEqual([...SEGMENTOS]);
    for (const segmento of SEGMENTOS) expect(ICONES_DO_CHAT_POR_SEGMENTO[segmento].length).toBeGreaterThanOrEqual(5);
    expect(ICONES_DO_CHAT_POR_SEGMENTO.barbearia[0]).not.toBe(ICONES_DO_CHAT_POR_SEGMENTO.estetica[0]);
  });
  it("mantém o tema escuro como padrão por token, sem cores novas", () => {
    const tokens = tokensEscurosDaAgendaParaChat({ superficie: "padrao", corDestaque: "azul" });
    expect(tokens).toMatchObject({
      "--chat-page": "var(--identity-deep)",
      "--chat-page-text": "var(--identity-off-white)",
      "--chat-primary": "var(--figaro-action-blue)",
    });
  });
  it("não se sobrepõe às superfícies ou cores que o negócio personalizou", () => {
    expect(tokensEscurosDaAgendaParaChat({ superficie: "clara" })).toEqual({});
    expect(tokensEscurosDaAgendaParaChat({ superficie: "tema" })).toEqual({});
    const tokens = tokensEscurosDaAgendaParaChat({ superficie: "padrao", corDestaque: "rosa" });
    expect(tokens).not.toHaveProperty("--chat-primary");
  });
});
