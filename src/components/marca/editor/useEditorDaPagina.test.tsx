// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { configPadrao } from "@/lib/pagina-config";
import type { MarcaData } from "@/lib/marca.functions";
import { useEditorDaPagina } from "./useEditorDaPagina";

const api = vi.hoisted(() => ({
  restaurar: vi.fn(),
  descartar: vi.fn(),
  salvar: vi.fn(),
  publicar: vi.fn(),
  mudarLink: vi.fn(),
}));
vi.mock("@/lib/marca.functions", () => ({
  restaurarMarca: "restaurar", descartarRascunhoPagina: "descartar",
  salvarRascunhoPagina: "salvar", publicarPagina: "publicar",
  alterarLinkPublico: "mudarLink",
}));
vi.mock("@tanstack/react-start", () => ({
  useServerFn: (nome: keyof typeof api) => api[nome],
}));
vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: null }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/lib/publico.functions", () => ({ getPaginaPublica: vi.fn() }));
vi.mock("@/lib/imagem", () => ({ comprimirImagem: vi.fn() }));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type Editor = ReturnType<typeof useEditorDaPagina>;
async function montar(pendente: boolean, recarregar = vi.fn().mockResolvedValue(undefined)) {
  const alvo = document.createElement("div");
  document.body.appendChild(alvo);
  const root = createRoot(alvo);
  const inicial = {
    id: "negocio-teste", nome: "Negócio", slug: "negocio",
    fotos: [], segmento: "neutro", plano: "profissional",
    pagina: configPadrao(), publicada: configPadrao(),
    alteracoes_pendentes: pendente,
    logo_signed_url: null, capa_signed_url: null, avatar_signed_url: null,
    lacunas: [],
  } as unknown as MarcaData;
  let editor: Editor | null = null;
  function Teste() {
    editor = useEditorDaPagina(inicial, recarregar);
    return null;
  }
  await act(async () => { root.render(createElement(Teste)); });
  return {
    get: () => {
      if (editor === null) throw new Error("Hook não montado");
      return editor as Editor;
    },
    recarregar,
    fechar: async () => {
      await act(async () => { root.unmount(); });
      alvo.remove();
    },
  };
}
beforeEach(() => {
  vi.clearAllMocks();
  api.restaurar.mockResolvedValue({ ok: true });
  api.descartar.mockResolvedValue({ ok: true });
});

describe("personalização: descarte e restauração", () => {
  it("descarta mudanças locais sem chamar o servidor", async () => {
    const tela = await montar(false);
    await act(async () => { tela.get().setMarca("nome", "Novo nome"); });
    expect(tela.get().naoSalvo).toBe(true);
    await act(async () => { await tela.get().descartar(); });
    expect(api.descartar).not.toHaveBeenCalled();
    expect(tela.get().naoSalvo).toBe(false);
    expect(tela.get().erro).toBe(false);
    await tela.fechar();
  });

  it("descarta rascunho salvo via API e recarrega a versão atual", async () => {
    const tela = await montar(true);
    await act(async () => { await tela.get().descartar(); });
    expect(api.descartar).toHaveBeenCalledTimes(1);
    expect(tela.recarregar).toHaveBeenCalledTimes(1);
    expect(tela.get().busy).toBe(false);
    await tela.fechar();
  });

  it("falha do servidor na restauração produz erro, nunca sucesso", async () => {
    api.restaurar.mockRejectedValueOnce(new Error("Falha de teste"));
    const tela = await montar(false);
    await act(async () => { await tela.get().restaurar("versao-teste"); });
    expect(tela.get().erro).toBe(true);
    expect(tela.get().busy).toBe(false);
    expect(tela.get().status).not.toMatch(/restaurada como rascunho/i);
    await tela.fechar();
  });

  it("após restaurar, erro de atualização não vira confirmação falsa", async () => {
    const recarregar = vi.fn().mockRejectedValue(new Error("Sem conexão"));
    const tela = await montar(false, recarregar);
    await act(async () => { await tela.get().restaurar("versao-teste"); });
    expect(api.restaurar).toHaveBeenCalledTimes(1);
    expect(tela.get().erro).toBe(true);
    expect(tela.get().busy).toBe(false);
    await tela.fechar();
  });
});
