import { describe, expect, it } from "vitest";

import { configPadrao } from "@/lib/pagina-config";
import {
  erroDaBio,
  erroDeBiosObrigatorias,
  erroDoHandle,
  erroDoSubtituloDaGaleria,
  erroDoTituloDaGaleria,
  primeiroErroDaSecao,
} from "./validacao";

describe("validação dos editores de seção", () => {
  it("galeria: vazio usa o padrão; preenchido exige 5 caracteres", () => {
    expect(erroDoTituloDaGaleria("")).toBeNull();
    expect(erroDoTituloDaGaleria("abc")).toBe("Mínimo de 5 caracteres");
    expect(erroDoTituloDaGaleria("Nossos trabalhos")).toBeNull();
    expect(erroDoSubtituloDaGaleria("abcd")).toBe("Mínimo de 5 caracteres");
  });

  it("bio: no máximo 2000 caracteres", () => {
    expect(erroDaBio("a".repeat(2000))).toBeNull();
    expect(erroDaBio("a".repeat(2001))).toMatch(/2000/);
  });

  it("detalhes ligados exigem todas as bios", () => {
    expect(erroDeBiosObrigatorias(false, ["", ""], "equipe")).toBeNull();
    expect(erroDeBiosObrigatorias(true, ["ok", ""], "equipe")).toMatch(/profissionais/);
    expect(erroDeBiosObrigatorias(true, ["ok", "ok"], "equipe")).toBeNull();
    expect(erroDeBiosObrigatorias(true, [], "equipe")).not.toBeNull();
  });

  it("handle não aceita espaço", () => {
    expect(erroDoHandle("meu_negocio")).toBeNull();
    expect(erroDoHandle("meu negocio")).toBe("Espaços não são permitidos");
  });

  it("junta as regras da seção salva no rascunho", () => {
    const c = configPadrao();
    expect(primeiroErroDaSecao("galeria", c.secoes)).toBeNull();
    const ruim = { ...c.secoes, localizacao: { mostrarDetalhes: true, bio: "" } };
    expect(primeiroErroDaSecao("localizacao", ruim)).toMatch(/localização/);
  });
});
