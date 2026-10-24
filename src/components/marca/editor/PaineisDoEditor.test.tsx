// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";

import { configPadrao } from "@/lib/pagina-config";

import { PaineisDoEditor } from "./PaineisDoEditor";

vi.mock("@/components/marca/editor/LacunasDaPagina", () => ({ LacunasDaPagina: () => null }));
vi.mock("@/components/marca/editor/FaixaDeEstado", () => ({ FaixaDeEstado: () => null }));
vi.mock("@/components/marca/editor/SecaoAjustesFinos", () => ({ SecaoAjustesFinos: () => null }));
vi.mock("@/components/marca/editor/SecaoConteudo", () => ({ SecaoConteudo: () => null }));
vi.mock("@/components/marca/editor/SecaoImagens", () => ({ SecaoImagens: () => null }));
vi.mock("@/components/marca/editor/SecaoLink", () => ({ SecaoLink: () => null }));
vi.mock("@/components/marca/editor/SecaoRedes", () => ({ SecaoRedes: () => null }));
vi.mock("@/components/marca/editor/SecaoRecepcao", () => ({ SecaoRecepcao: () => null }));
vi.mock("@/components/marca/editor/SecaoTema", () => ({ SecaoTema: () => null }));
vi.mock("@/components/marca/editor/SecaoVersoes", () => ({ SecaoVersoes: () => null }));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

describe("PaineisDoEditor", () => {
  it("organiza as configurações em áreas e permite navegar por elas", async () => {
    const alvo = document.createElement("div");
    document.body.appendChild(alvo);
    const e = {
      config: configPadrao(),
      setPagina: vi.fn(),
      setConfig: vi.fn(),
      usaConversa: false,
      form: { nome: "", logo_url: null },
      fileRef: { current: null },
      coverRef: { current: null },
      coverPreview: null,
      logoPreview: null,
      busy: false,
      upload: vi.fn(),
      usarLogo: vi.fn(),
      removerLogo: vi.fn(),
      slug: "",
      setSlug: vi.fn(),
      salvarSlug: vi.fn(),
      setMarca: vi.fn(),
      avatarRef: { current: null },
      avatarPreview: null,
      setAvatarPreview: vi.fn(),
      vocabulario: { comArtigo: "negócio" },
      fase: "ocioso",
      erro: false,
      status: null,
      naoSalvo: false,
      pendente: false,
      restaurar: vi.fn(),
    } as unknown as Parameters<typeof PaineisDoEditor>[0]["e"];
    const initial = { segmento: "neutro", lacunas: [] } as unknown as Parameters<
      typeof PaineisDoEditor
    >[0]["initial"];
    const root = createRoot(alvo);

    await act(async () =>
      root.render(createElement(PaineisDoEditor, { e, initial, versions: [] })),
    );

    expect(alvo.querySelector('[role="tablist"]')).not.toBeNull();
    expect(alvo.querySelectorAll('[role="tab"]')).toHaveLength(3);
    expect(alvo.textContent).not.toContain("Conteúdo");
    expect(alvo.textContent).toContain("Logo e imagens");
    expect(alvo.textContent).toContain("Cores, fontes e detalhes");

    const divulgacao = [...alvo.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find((botao) =>
      botao.textContent?.includes("Divulgação"),
    );
    expect(divulgacao).toBeDefined();
    await act(async () => {
      divulgacao?.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, button: 0 }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(alvo.textContent).not.toContain("Cores, fontes e detalhes");
    await act(async () => root.unmount());
  });
});
