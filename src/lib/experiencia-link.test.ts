import { describe, expect, it } from "vitest";
import { aplicarLayout, configPadrao, normalizarPagina } from "./pagina-config";
import { destinoDoLinkCurto, fluxoDoAgendamento, vitrineDeveRedirecionar } from "./experiencia-link";
import { normalizarPaginaComPreset } from "./flow-visual-presets";

describe("contrato das três experiências públicas (Clássica/Site/Chat)", () => {
  const slug = "studio-exemplo";

  it("Vitrine abre a página própria e só redireciona fora da vitrine", () => {
    expect(destinoDoLinkCurto(slug, "vitrine")).toBe("/b/studio-exemplo");
    expect(vitrineDeveRedirecionar("vitrine", "")).toBe(false);
    expect(fluxoDoAgendamento("vitrine", "tradicional")).toBe("passo_a_passo");
    expect(fluxoDoAgendamento("vitrine", "conversa")).toBe("conversa");
  });

  it("Layout de agendamento direto sempre mantém o passo a passo", () => {
    const c = aplicarLayout(configPadrao(), "figaro-agendamento");
    expect(c.experiencia).toBe("direta");
    expect(destinoDoLinkCurto(slug, c.experiencia, "?origem=site"))
      .toBe("/agendar/studio-exemplo?origem=site");
    expect(fluxoDoAgendamento(c.experiencia, "conversa")).toBe("passo_a_passo");
    expect(vitrineDeveRedirecionar(c.experiencia, "?ver=pagina")).toBe(false);
    expect(vitrineDeveRedirecionar(c.experiencia, "")).toBe(true);
  });

  it("Chat continua conversacional mesmo se a modalidade salva divergir", () => {
    const c = aplicarLayout(configPadrao(), "cortai-chat");
    expect(c.experiencia).toBe("conversa");
    expect(destinoDoLinkCurto(slug, c.experiencia)).toBe("/agendar/studio-exemplo");
    expect(fluxoDoAgendamento(c.experiencia, "tradicional")).toBe("conversa");
    expect(vitrineDeveRedirecionar(c.experiencia, "?ver=pagina")).toBe(false);
  });

  it("trocar entre estilos preserva a navegação esperada e a configuração publicada", () => {
    const site = aplicarLayout(configPadrao(), "figaro-site-completo");
    const chat = aplicarLayout(site, "cortai-chat");
    const deVolta = aplicarLayout(chat, "figaro-site-completo");
    expect(deVolta.experiencia).toBe("vitrine");
    expect(fluxoDoAgendamento(deVolta.experiencia, deVolta.chat.modo)).toBe("passo_a_passo");
    expect(fluxoDoAgendamento(chat.experiencia, chat.chat.modo)).toBe("conversa");
    const publicado = normalizarPagina(deVolta);
    const preservado = normalizarPaginaComPreset(publicado, "estetica");
    expect(preservado).toEqual(publicado);
  });
});
