import { describe, expect, it } from "vitest";

import {
  configPadrao,
  normalizarPagina,
  secoesObrigatoriasAusentes,
} from "./pagina-config";

describe("ajustes por seção", () => {
  it("o padrão preserva o comportamento anterior", () => {
    const c = configPadrao();
    expect(c.secoes.galeria.titulo).toBe("");
    expect(c.secoes.avaliacoes).toEqual({ ordem: "data", mostrarResumo: true });
    expect(c.secoes.profissionais).toEqual({ mostrarFoto: true, mostrarDetalhes: true });
    expect(c.secoes.servicos.populares).toBe(true);
  });

  it("página salva antes do campo existir ganha o padrão", () => {
    const antiga = { ...configPadrao() } as Record<string, unknown>;
    delete antiga["secoes"];
    expect(normalizarPagina(antiga).secoes.localizacao).toEqual({ mostrarDetalhes: false, bio: "" });
  });

  it("valor inválido volta ao padrão sem perder o resto", () => {
    const c = normalizarPagina({ ...configPadrao(), secoes: { galeria: { titulo: "x".repeat(80) } } });
    expect(c.secoes.galeria.titulo).toBe("");
    expect(c.cta).toBe("Agendar horário");
  });

  it("layouts do Figaro exigem serviços; ocultar bloqueia a publicação", () => {
    const base = configPadrao({ layout: "figaro-site-completo" });
    expect(secoesObrigatoriasAusentes(base)).toEqual([]);
    const sem = { ...base, componentes: { ...base.componentes, servicos: false } };
    expect(secoesObrigatoriasAusentes(sem)).toEqual(["servicos"]);
    expect(secoesObrigatoriasAusentes({ ...sem, layout: "minimalista" })).toEqual([]);
  });
});
