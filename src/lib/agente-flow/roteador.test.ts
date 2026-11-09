import { describe, expect, it } from "vitest";
import { escolherEspecialista, instrucaoDoEspecialista, type ContextoDoEspecialista } from "./roteador";

const painel = (mensagem: string, ferramentasAutorizadas: string[] = []): ContextoDoEspecialista => ({
  canal: "painel", papel: "dono", mensagem, ferramentasAutorizadas,
});

describe("coordenação assistida do Flow Core", () => {
  it("direciona consultas operacionais para o especialista correto sem um segundo LLM", () => {
    expect(escolherEspecialista(painel("Agendar Beatriz amanhã às 14h"))).toBe("agenda");
    expect(escolherEspecialista(painel("Quanto entrou no caixa hoje?"))).toBe("insights");
    expect(escolherEspecialista(painel("Consultar clientes no CRM"))).toBe("crm");
    expect(escolherEspecialista(painel("Fila de espera de hoje"))).toBe("operacoes");
    expect(escolherEspecialista(painel("Onde configuro o WhatsApp?"))).toBe("conhecimento");
    expect(escolherEspecialista(painel("Bom dia"))).toBe("atendimento");
  });

  it("não apresenta especialistas internos de CRM e financeiro ao cliente ou visitante", () => {
    expect(escolherEspecialista({
      canal: "site", mensagem: "Consulte os dados do CRM", ferramentasAutorizadas: []
    })).toBe("atendimento");
    expect(escolherEspecialista({
      canal: "whatsapp", papel: "cliente", mensagem: "Quanto tem no caixa?", ferramentasAutorizadas: []
    })).toBe("atendimento");
    expect(escolherEspecialista({
      canal: "whatsapp", papel: "cliente", mensagem: "Quero remarcar", ferramentasAutorizadas: []
    })).toBe("agenda");
  });

  it("recomenda somente ferramentas previamente autorizadas e nunca amplia acessos", () => {
    const texto = instrucaoDoEspecialista(painel("Quanto entrou no caixa?", [
      "consultar_caixa_hoje", "listar_servicos"
    ]));
    expect(texto).toContain("consultar_caixa_hoje");
    expect(texto).not.toContain("consultar_indicadores_crm");
    expect(texto).not.toContain("confirmar_pagamento");
    expect(instrucaoDoEspecialista(painel("Quanto entrou no caixa?"))).toContain("Nao existem consultas");
  });
});
