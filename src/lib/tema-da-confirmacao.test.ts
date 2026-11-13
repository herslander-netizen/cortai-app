import { describe, expect, it } from "vitest";

import { normalizarPagina, TEMAS_DO_CATALOGO } from "./pagina-config";
import { estiloDaAgendaDireta } from "./tema-da-agenda-direta";
import { estiloDaConfirmacao, varianteDaConfirmacao } from "./tema-da-confirmacao";

const styles = (config: ReturnType<typeof normalizarPagina>, visual: Parameters<typeof estiloDaConfirmacao>[1]) =>
  estiloDaConfirmacao(config, visual) as Record<string, string>;

describe("confirmação segue a mesma identidade da página pública", () => {
  it("todos os temas do catálogo preservam a paleta de Agendamento direto", () => {
    for (const tema of TEMAS_DO_CATALOGO) {
      const pagina = normalizarPagina({ layout: "figaro-agendamento", experiencia: "direta", tema });
      const temaDaReserva = estiloDaAgendaDireta(pagina) as Record<string, string>;
      const confirmacao = styles(pagina, varianteDaConfirmacao(pagina, "passo_a_passo"));
      expect(confirmacao["--chat-page"], tema).toBe(temaDaReserva["--chat-page"]);
      expect(confirmacao["--chat-primary"], tema).toBe(temaDaReserva["--chat-primary"]);
      expect(confirmacao["--chat-heading"], tema).toBe(temaDaReserva["--chat-heading"]);
    }
  });

  it("o site respeita as cores publicadas e não força a superfície do chat", () => {
    for (const tema of TEMAS_DO_CATALOGO) {
      const pagina = normalizarPagina({ layout: "figaro-site-completo", experiencia: "vitrine", tema });
      const confirmacao = styles(pagina, varianteDaConfirmacao(pagina, "passo_a_passo"));
      expect(confirmacao["--chat-page"], tema).toBe(pagina.cores.fundo);
      expect(confirmacao["--chat-page-text"], tema).toBe(pagina.cores.texto);
      expect(confirmacao["--chat-primary"], tema).toBe(pagina.cores.botao);
    }
  });

  it("o fluxo Chat preserva o fundo e acento configurados para a conversa", () => {
    const pagina = normalizarPagina({
      experiencia: "conversa",
      layout: "cortai-chat",
      tema: "feminino-lavanda",
      chat: { superficie: "escura", corDestaque: "lilas" },
    });
    const confirmacao = styles(pagina, varianteDaConfirmacao(pagina, "conversa"));
    expect(confirmacao["--chat-page"]).toBe("#0F1218");
    expect(varianteDaConfirmacao(pagina, "conversa")).toBe("conversa");
    expect(confirmacao["--chat-primary"]).toBeTruthy();
  });

  it("a variante corresponde ao fluxo efetivo sem confundir o layout com a experiência", () => {
    const figaro = normalizarPagina({ layout: "figaro-retro", experiencia: "direta" });
    const site = normalizarPagina({ layout: "minimalista", experiencia: "vitrine" });
    const direta = normalizarPagina({ layout: "minimalista", experiencia: "direta" });
    expect(varianteDaConfirmacao(figaro, "passo_a_passo")).toBe("figaro");
    expect(varianteDaConfirmacao(site, "passo_a_passo")).toBe("site");
    expect(varianteDaConfirmacao(direta, "passo_a_passo")).toBe("direta");
    expect(varianteDaConfirmacao(figaro, "conversa")).toBe("conversa");
  });
});
