import { describe, expect, it } from "vitest";

import { estadoDoEditor } from "./estadoDoEditor";

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
});
