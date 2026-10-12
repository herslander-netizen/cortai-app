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
vi.mock("@/components/marca/editor/SecaoExperiencia", () => ({ SecaoExperiencia: () => null }));
vi.mock("@/components/marca/editor/SecaoImagens", () => ({ SecaoImagens: () => null }));
vi.mock("@/components/marca/editor/SecaoLink", () => ({ SecaoLink: () => null }));
vi.mock("@/components/marca/editor/SecaoRedes", () => ({ SecaoRedes: () => null }));
vi.mock("@/components/marca/editor/SecaoRecepcao", () => ({ SecaoRecepcao: () => null }));
vi.mock("@/components/marca/editor/SecaoTema", () => ({ SecaoTema: () => null }));
vi.mock("@/components/marca/editor/SecaoTextos", () => ({ SecaoTextos: () => null }));
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
    expect(alvo.querySelectorAll('[role="tab"]')).toHaveLength(4);
    expect(alvo.textContent).toContain("Experiência de agendamento");

    const aparencia = [...alvo.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find((botao) =>
      botao.textContent?.includes("Aparência"),
    );
    expect(aparencia).toBeDefined();
    await act(async () => {
      aparencia?.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, button: 0 }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(alvo.textContent).toContain("Tema e cores");
    expect(alvo.textContent).toContain("Logo e imagens");
    expect(alvo.textContent).not.toContain("Experiência de agendamento");
    await act(async () => root.unmount());
  });
});
