import { describe, expect, it } from "vitest";

import { avisoDoLimiteMensal, estadoDaAgendaOnline } from "@/lib/agenda-online";
import {
  destinoDoLinkCurto,
  fluxoDoAgendamento,
  vitrineDeveRedirecionar,
} from "@/lib/experiencia-link";
import { configPadrao, normalizarPagina } from "@/lib/pagina-config";
import { SEGMENTOS_CONFIG } from "@/lib/segmentos";

describe("agenda online por plano e limite", () => {
  it("sem limite (Conecta/Studio) fica aberta", () => {
    expect(estadoDaAgendaOnline({ emTeste: false, limite: null, uso: 999 })).toBe("aberta");
  });
  it("Essencial abaixo e no limite", () => {
    expect(estadoDaAgendaOnline({ emTeste: false, limite: 40, uso: 39 })).toBe("aberta");
    expect(estadoDaAgendaOnline({ emTeste: false, limite: 40, uso: 40 })).toBe("limite_atingido");
  });
  it("teste grátis não tem limite", () => {
    expect(estadoDaAgendaOnline({ emTeste: true, limite: 40, uso: 80 })).toBe("aberta");
    expect(avisoDoLimiteMensal({ emTeste: true, limite: 40, uso: 80 })).toBeNull();
  });
  it("avisos de 80% e 100%", () => {
    expect(avisoDoLimiteMensal({ emTeste: false, limite: 40, uso: 31 })).toBeNull();
    expect(avisoDoLimiteMensal({ emTeste: false, limite: 40, uso: 32 })).toBe("perto");
    expect(avisoDoLimiteMensal({ emTeste: false, limite: 40, uso: 40 })).toBe("atingido");
  });
});

describe("experiência do link", () => {
  it("link curto preserva a busca", () => {
    expect(destinoDoLinkCurto("x", "direta", "?origem=qr")).toBe("/agendar/x?origem=qr");
    expect(destinoDoLinkCurto("x", "conversa")).toBe("/agendar/x");
    expect(destinoDoLinkCurto("x", "vitrine", "?a=1")).toBe("/b/x?a=1");
  });
  it("vitrine redireciona fora da Vitrine, exceto ?ver=pagina", () => {
    expect(vitrineDeveRedirecionar("direta", "")).toBe(true);
    expect(vitrineDeveRedirecionar("conversa", "?origem=qr")).toBe(true);
    expect(vitrineDeveRedirecionar("direta", "?ver=pagina")).toBe(false);
    expect(vitrineDeveRedirecionar("vitrine", "")).toBe(false);
  });
  it("fluxo em /agendar", () => {
    expect(fluxoDoAgendamento("direta", "conversa")).toBe("passo_a_passo");
    expect(fluxoDoAgendamento("conversa", "tradicional")).toBe("conversa");
    expect(fluxoDoAgendamento("vitrine", "conversa")).toBe("conversa");
    expect(fluxoDoAgendamento("vitrine", "tradicional")).toBe("passo_a_passo");
  });
  it("padrão por segmento", () => {
    expect(SEGMENTOS_CONFIG.barbearia.experienciaPadrao).toBe("direta");
    expect(SEGMENTOS_CONFIG.salao.experienciaPadrao).toBe("vitrine");
    expect(SEGMENTOS_CONFIG.outro.experienciaPadrao).toBe("vitrine");
  });
});

describe("normalizarPagina campo a campo", () => {
  const antiga = {
    ...configPadrao({ tema: "premium", cta: "Reservar" }),
  } as Record<string, unknown>;
  delete antiga["versao"];
  delete antiga["experiencia"];
  delete antiga["botaoFixo"];

  it("configuração antiga continua igual e vira vitrine", () => {
    const n = normalizarPagina(antiga);
    expect(n.tema).toBe("premium");
    expect(n.cta).toBe("Reservar");
    expect(n.cores).toEqual(antiga["cores"]);
    expect(n.experiencia).toBe("vitrine");
    expect(n.versao).toBe(1);
    expect(n.botaoFixo).toBe(true);
  });
  it("um campo inválido não reseta os demais e campos desconhecidos ficam", () => {
    const n = normalizarPagina({ ...antiga, layout: "inexistente", extra: 7 }) as unknown as Record<
      string,
      unknown
    >;
    expect(n["layout"]).toBe("cinematografico");
    expect(n["tema"]).toBe("premium");
    expect(n["cta"]).toBe("Reservar");
    expect(n["extra"]).toBe(7);
  });
});
