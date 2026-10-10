import { describe, expect, it } from "vitest";

import { haAlteracoesPendentes, lacunasDaPagina } from "./pagina-pendencias";

const base = { updated_at: "2026-10-10T10:00:00Z", published_at: "2026-10-10T09:00:00Z" };

describe("haAlteracoesPendentes", () => {
  it("sem linha, não há pendência", () => {
    expect(haAlteracoesPendentes(null)).toBe(false);
  });
  it("recém-publicado não tem pendência", () => {
    expect(
      haAlteracoesPendentes({
        ...base,
        updated_at: base.published_at,
        draft_config: {},
        published_config: {},
      }),
    ).toBe(false);
  });
  it("rascunho diferente do publicado é pendência", () => {
    expect(
      haAlteracoesPendentes({ ...base, draft_config: { a: 1 }, published_config: { a: 2 } }),
    ).toBe(true);
  });
  it("rascunho salvo igual ao publicado não conta (ex.: depois de descartar)", () => {
    expect(
      haAlteracoesPendentes({ ...base, draft_config: { a: 1 }, published_config: { a: 1 } }),
    ).toBe(false);
  });
});

describe("lacunasDaPagina", () => {
  it("tudo preenchido não gera aviso", () => {
    expect(lacunasDaPagina({ servicosAtivos: 2, profissionais: 1, diasAbertos: 6 })).toEqual([]);
  });
  it("aponta cada falta com o destino certo", () => {
    const l = lacunasDaPagina({ servicosAtivos: 0, profissionais: 0, diasAbertos: 0 });
    expect(l.map((x) => x.destino)).toEqual([
      "/barbeiro/servicos",
      "/barbeiro/profissionais",
      "/barbeiro/horarios",
    ]);
  });
});
