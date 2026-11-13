import { describe, expect, it } from "vitest";
import { respostaDeConversaProfissional } from "./conversa-profissional";

describe("conversa operacional sem IA", () => {
  it("responde com acolhimento para o profissional", () => {
    expect(respostaDeConversaProfissional("Oi", "profissional")).toContain("agenda");
    expect(respostaDeConversaProfissional("o que você consegue fazer?", "profissional")).toContain("Flow Core");
  });

  it("não inventa consulta nem ação", () => {
    const resposta = respostaDeConversaProfissional("como está o dia?", "profissional");
    expect(resposta).toContain("consultar");
    expect(resposta).not.toMatch(/agendado|enviado|cancelado/i);
  });

  it("retorna null para pergunta que precisa do catálogo", () => {
    expect(respostaDeConversaProfissional("qual é meu próximo cliente?", "profissional")).toBeNull();
  });
});
