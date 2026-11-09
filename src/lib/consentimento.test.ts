// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  categoriaPermitida,
  lerConsentimento,
  salvarConsentimento,
  SOMENTE_NECESSARIAS,
  TODAS_ACEITAS,
  VERSAO_DA_POLITICA,
} from "./consentimento";

describe("consentimento de cookies", () => {
  beforeEach(() => localStorage.clear());

  it("não libera tecnologias opcionais sem escolha", () => {
    expect(lerConsentimento()).toBeNull();
    expect(categoriaPermitida("necessarios")).toBe(true);
    expect(categoriaPermitida("analises")).toBe(false);
    expect(categoriaPermitida("marketing")).toBe(false);
  });

  it("permite rejeitar as opcionais e editar as escolhas", () => {
    salvarConsentimento(SOMENTE_NECESSARIAS);
    expect(lerConsentimento()?.versao).toBe(VERSAO_DA_POLITICA);
    expect(categoriaPermitida("marketing")).toBe(false);
    salvarConsentimento(TODAS_ACEITAS);
    expect(categoriaPermitida("marketing")).toBe(true);
  });

  it("pede nova escolha se a versão do documento mudou", () => {
    localStorage.setItem(
      "cortai:consentimento",
      JSON.stringify({
        versao: "2026-09-14",
        registradoEm: "2026-09-14T12:00:00Z",
        categorias: TODAS_ACEITAS,
      }),
    );
    expect(lerConsentimento()).toBeNull();
    expect(categoriaPermitida("marketing")).toBe(false);
  });

  it("rejeita objetos malformados sem liberar marketing", () => {
    localStorage.setItem(
      "cortai:consentimento",
      JSON.stringify({
        versao: VERSAO_DA_POLITICA,
        registradoEm: "2026-11-08T12:00:00Z",
        categorias: { necessarios: true, preferencias: true, analises: "sim", marketing: true },
      }),
    );
    expect(lerConsentimento()).toBeNull();
    expect(categoriaPermitida("marketing")).toBe(false);
  });
});
