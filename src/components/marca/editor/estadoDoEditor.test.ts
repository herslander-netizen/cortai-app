import { describe, expect, it } from "vitest";

import { estadoDoEditor, tipoDeDescarte } from "./estadoDoEditor";

const base = {
  fase: "ocioso",
  erro: false,
  status: null,
  naoSalvo: false,
  pendente: false,
} as const;

describe("estadoDoEditor", () => {
  it("não mostra nada quando tudo está publicado", () => {
    expect(estadoDoEditor(base)).toBeNull();
  });
  it("publicar e salvar são estados ocupados", () => {
    expect(estadoDoEditor({ ...base, fase: "publicando" })?.ocupado).toBe(true);
    expect(estadoDoEditor({ ...base, fase: "salvando" })?.texto).toMatch(/Salvando/);
  });
  it("erro tem prioridade sobre pendência", () => {
    const e = estadoDoEditor({ ...base, erro: true, status: "Falhou", naoSalvo: true });
    expect(e?.tom).toBe("erro");
  });
  it("mudança local não salva avisa antes do rascunho pendente", () => {
    const e = estadoDoEditor({ ...base, naoSalvo: true, pendente: true });
    expect(e?.texto).toMatch(/não foram salvas/);
  });
  it("rascunho salvo e não publicado deixa claro que a página pública não mudou", () => {
    expect(estadoDoEditor({ ...base, pendente: true })?.texto).toMatch(/não mudou/);
  });
  it("sucesso só aparece sem pendências", () => {
    expect(estadoDoEditor({ ...base, status: "Página publicada com sucesso." })?.tom).toBe("ok");
  });
  it("o aviso de sucesso não esconde rascunho ainda pendente", () => {
    const e = estadoDoEditor({
      ...base, status: "Página publicada com sucesso.", pendente: true,
    });
    expect(e?.tom).toBe("pendente");
    expect(e?.texto).toMatch(/não mudou/);
  });
  it("o aviso de sucesso não esconde alterações locais não salvas", () => {
    const e = estadoDoEditor({
      ...base, status: "Página publicada com sucesso.", naoSalvo: true,
    });
    expect(e?.tom).toBe("pendente");
    expect(e?.texto).toMatch(/não foram salvas/);
  });
  it("descarte diferencia edição local, rascunho salvo e ausência de mudanças", () => {
    expect(tipoDeDescarte({ naoSalvo: false, pendente: false })).toBe("nenhum");
    expect(tipoDeDescarte({ naoSalvo: true, pendente: false })).toBe("edicao_local");
    expect(tipoDeDescarte({ naoSalvo: false, pendente: true })).toBe("rascunho_salvo");
    expect(tipoDeDescarte({ naoSalvo: true, pendente: true })).toBe("rascunho_salvo");
  });
});
