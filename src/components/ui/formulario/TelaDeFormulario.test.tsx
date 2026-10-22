// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TelaDeFormulario } from "./TelaDeFormulario";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let host: HTMLDivElement | null = null;
let root: Root | null = null;

afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  host = null;
  root = null;
});

describe("TelaDeFormulario", () => {
  it("pede confirmação antes de fechar um formulário com alterações pendentes", async () => {
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    const onFechar = vi.fn();

    await act(async () =>
      root!.render(
        createElement(TelaDeFormulario, {
          titulo: "Editar serviço",
          sujo: true,
          onFechar,
          children: createElement("p", null, "Dados alterados"),
        }),
      ),
    );

    await act(async () => {
      document.body.querySelector<HTMLButtonElement>('button[aria-label="Fechar"]')!.click();
    });

    expect(document.body.textContent).toContain("Sair sem salvar?");
    expect(onFechar).not.toHaveBeenCalled();

    await act(async () => {
      Array.from(document.body.querySelectorAll("button"))
        .find((button) => button.textContent?.includes("Continuar editando"))!
        .click();
    });

    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();
    expect(onFechar).not.toHaveBeenCalled();
  });

  it("mantém a ação principal em um rodapé separado da área rolável", async () => {
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);

    await act(async () =>
      root!.render(
        createElement(TelaDeFormulario, {
          titulo: "Novo agendamento",
          onFechar: vi.fn(),
          acao: { rotulo: "Confirmar agendamento", onClick: vi.fn() },
          children: createElement("p", null, "Escolha um horário"),
        }),
      ),
    );

    const dialogo = document.body.querySelector('[role="dialog"]')!;
    const conteudo = dialogo.querySelector(".overflow-y-auto")!;
    const confirmar = Array.from(dialogo.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Confirmar agendamento"),
    )!;
    const rodape = confirmar.parentElement!;

    expect(rodape.className).toContain("shrink-0");
    expect(rodape.className).not.toContain("absolute");
    expect(rodape.contains(conteudo)).toBe(false);
    expect(confirmar.className).toContain("w-full");
  });

  it("pede confirmação ao usar o gesto de voltar com alterações pendentes", async () => {
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    const onFechar = vi.fn();

    await act(async () =>
      root!.render(
        createElement(TelaDeFormulario, {
          titulo: "Editar serviço",
          sujo: true,
          onFechar,
          children: createElement("p", null, "Dados alterados"),
        }),
      ),
    );

    await act(async () => {
      window.dispatchEvent(new PopStateEvent("popstate", { state: {} }));
    });

    expect(document.body.textContent).toContain("Sair sem salvar?");
    expect(onFechar).not.toHaveBeenCalled();
  });

  it("fecha ao usar o gesto de voltar quando não há alterações pendentes", async () => {
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    const onFechar = vi.fn();

    await act(async () =>
      root!.render(
        createElement(TelaDeFormulario, {
          titulo: "Novo serviço",
          sujo: false,
          onFechar,
          children: createElement("p", null, "Dados sem alterações"),
        }),
      ),
    );

    await act(async () => {
      window.dispatchEvent(new PopStateEvent("popstate", { state: {} }));
    });

    expect(onFechar).toHaveBeenCalledTimes(1);
  });

  it("no modo compacto mostra o passo na barra, sem título grande, e voltar não pede confirmação", async () => {
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    const onFechar = vi.fn();
    const onVoltar = vi.fn();

    await act(async () =>
      root!.render(
        createElement(TelaDeFormulario, {
          titulo: "Novo agendamento",
          subtitulo: "Dia e hora do atendimento",
          sujo: true,
          onFechar,
          onVoltar,
          compacto: { passo: "Horário", indice: 2 },
          children: createElement("p", null, "Conteúdo"),
        }),
      ),
    );

    expect(document.body.querySelector(".titulo-tela")).toBeNull();
    expect(document.body.textContent).toContain("Novo agendamento");
    expect(document.body.textContent).toContain("Horário");
    expect(document.body.textContent).toContain("Dia e hora do atendimento");

    await act(async () => {
      document.body.querySelector<HTMLButtonElement>('button[aria-label="Voltar"]')!.click();
    });

    expect(onVoltar).toHaveBeenCalledTimes(1);
    expect(onFechar).not.toHaveBeenCalled();
    expect(document.body.textContent).not.toContain("Sair sem salvar?");
  });
});
