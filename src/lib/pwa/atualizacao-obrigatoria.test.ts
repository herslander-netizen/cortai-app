import { describe, expect, it, vi } from "vitest";
import { deveBloquear, rotaBloqueavel, tentarFechar } from "./atualizacao-obrigatoria";
import { situacaoDaVersao } from "@/lib/versao";

const info = (atual: string, minima: string) => ({ atual, minima, url: "x" });

describe("atualização obrigatória", () => {
  it("situação da versão", () => {
    expect(situacaoDaVersao(info("4.0.0", "4.0.0"), "3.0.0")).toBe("obrigatoria");
    expect(situacaoDaVersao(info("3.1.0", "1.0.0"), "3.0.0")).toBe("recomendada");
    expect(situacaoDaVersao(info("3.0.0", "1.0.0"), "3.0.0")).toBe("em_dia");
  });
  it("erro de leitura/offline não bloqueia", () => {
    expect(deveBloquear({ situacao: null, caminho: "/barbeiro/agenda", modoFoco: false })).toBe(
      false,
    );
    expect(deveBloquear({ situacao: "em_dia", caminho: "/admin", modoFoco: false })).toBe(false);
  });
  it("bloqueia áreas internas e nunca as públicas", () => {
    for (const c of ["/barbeiro/hoje", "/admin", "/app", "/painel/agenda"])
      expect(rotaBloqueavel(c)).toBe(true);
    for (const c of [
      "/",
      "/b/loja",
      "/agendar/loja",
      "/avaliar/t",
      "/vaga/t",
      "/login",
      "/entrar/retorno",
      "/apresentacao",
      "/apps",
    ])
      expect(rotaBloqueavel(c)).toBe(false);
  });
  it("Modo Foco adia", () => {
    expect(
      deveBloquear({ situacao: "obrigatoria", caminho: "/barbeiro/agenda", modoFoco: true }),
    ).toBe(false);
    expect(
      deveBloquear({ situacao: "obrigatoria", caminho: "/barbeiro/agenda", modoFoco: false }),
    ).toBe(true);
  });
  it("cancelar tenta fechar e cai no bloqueio se a janela continuar", async () => {
    const janela = { close: vi.fn(), closed: false } as unknown as Window;
    expect(await tentarFechar(janela, 1)).toBe(true);
    expect(janela.close).toHaveBeenCalled();
    const fechada = { close: vi.fn(), closed: true } as unknown as Window;
    expect(await tentarFechar(fechada, 1)).toBe(false);
  });
});
