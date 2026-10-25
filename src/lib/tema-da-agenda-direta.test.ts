import { describe, expect, it } from "vitest";

import { normalizarPagina, TEMAS_DO_CATALOGO } from "./pagina-config";
import {
  agendaDiretaComTema,
  atributosDaAgendaDireta,
  estiloDaAgendaDireta,
} from "./tema-da-agenda-direta";

const direta = (tema: string) =>
  normalizarPagina({ layout: "figaro-agendamento", experiencia: "direta", tema });

describe("personalização da agenda direta", () => {
  const PRINCIPAIS = [
    "figaro-classico",
    "figaro-rock-n-roll",
    "figaro-retro",
    "feminino-rose",
    "feminino-lavanda",
    "feminino-pessego",
  ];

  it("todo tema do catálogo tem composição; os seis principais têm cada um a sua", () => {
    const todas = TEMAS_DO_CATALOGO.map(
      (t) => atributosDaAgendaDireta(direta(t))["data-estrutura"],
    );
    expect(todas.every(Boolean)).toBe(true);
    const principais = PRINCIPAIS.map((t) => atributosDaAgendaDireta(direta(t))["data-estrutura"]);
    expect(new Set(principais).size).toBe(PRINCIPAIS.length);
  });

  it("cada tema usa a própria cor de página, sem herdar o rosa do chat", () => {
    const paginas = TEMAS_DO_CATALOGO.map(
      (t) => (estiloDaAgendaDireta(direta(t)) as Record<string, string>)["--chat-page"],
    );
    expect(new Set(paginas).size).toBe(TEMAS_DO_CATALOGO.length);
    const rock = estiloDaAgendaDireta(direta("figaro-rock-n-roll")) as Record<string, string>;
    expect(rock["--chat-primary"]).toBe("#E8582A");
  });

  it("fora do layout Agendamento nada muda", () => {
    const site = normalizarPagina({ layout: "figaro-site-completo", tema: "figaro-retro" });
    expect(agendaDiretaComTema(site)).toBe(false);
    expect(atributosDaAgendaDireta(site)).toEqual({});
  });
});
