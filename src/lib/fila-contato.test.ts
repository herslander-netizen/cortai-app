import { describe, expect, it } from "vitest";
import { alteracoesContatoDaFila } from "./fila-contato";

describe("cadastro da lista de espera: mudança de WhatsApp", () => {
  it("não escreve nada se nome e telefone permanecem os mesmos", () => {
    const r = alteracoesContatoDaFila(
      { nome: "Ana Silva", telefone: "(79) 99999-1111" },
      { nome: "Ana Silva", telefone: "(79) 99999-1111" },
    );
    expect(r).toEqual({ telefoneAlterado: false, alteracoes: {} });
  });

  it("não apaga confirmação ou opt-in por simples formatação ou DDI", () => {
    const r = alteracoesContatoDaFila(
      { nome: "Ana Silva", telefone: "5579999991111" },
      { nome: "Ana Silva", telefone: "(79) 99999-1111" },
    );
    expect(r.telefoneAlterado).toBe(false);
    expect(r.alteracoes).toEqual({});
  });

  it("troca de número revoga sinais antigos sem oferecer novo consentimento", () => {
    const r = alteracoesContatoDaFila(
      { nome: "Ana Silva", telefone: "(79) 99999-1111" },
      { nome: "Ana Silva", telefone: "(79) 99999-2222" },
    );
    expect(r).toEqual({
      telefoneAlterado: true,
      alteracoes: {
        telefone: "(79) 99999-2222",
        whatsapp_confirmado_em: null,
        opt_in_whatsapp: false,
        opt_in_em: null,
        sem_whatsapp_em: null,
      },
    });
    expect(r.alteracoes).not.toHaveProperty("whatsapp_parado_em");
    expect(r.alteracoes).not.toHaveProperty("whatsapp_parado_motivo");
    expect(r.alteracoes).not.toHaveProperty("consentimento");
  });

  it("permite corrigir só o nome sem tocar o telefone ou as autorizações", () => {
    const r = alteracoesContatoDaFila(
      { nome: "Ana", telefone: "(79) 99999-1111" },
      { nome: "Ana Silva", telefone: "(79) 99999-1111" },
    );
    expect(r).toEqual({ telefoneAlterado: false, alteracoes: { nome: "Ana Silva" } });
  });

  it("um telefone antes vazio começa sem confirmação", () => {
    const r = alteracoesContatoDaFila(
      { nome: "Ana Silva", telefone: null },
      { nome: "Ana Silva", telefone: "(79) 99999-1111" },
    );
    expect(r.telefoneAlterado).toBe(true);
    expect(r.alteracoes.whatsapp_confirmado_em).toBeNull();
  });
});
