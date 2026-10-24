// @vitest-environment jsdom
import { act, createElement, createRef, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { configPadrao } from "@/lib/pagina-config";
import { SecaoRecepcao } from "./SecaoRecepcao";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let host: HTMLDivElement | null = null;
let root: ReturnType<typeof createRoot> | null = null;

async function montar(element: ReactNode) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => root?.render(element));
  return host;
}

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  root = null;
  host?.remove();
  host = null;
});

describe("SecaoRecepcao — troca da foto", () => {
  it("mostra a prévia e remove a foto sem alterar outros campos da recepção", async () => {
    const base = configPadrao();
    const avatar = "https://example.test/recepcao.webp";
    const config = configPadrao({ chat: { ...base.chat, avatarUrl: avatar } });
    const setPagina = vi.fn();
    const setAvatarPreview = vi.fn();
    const alvo = await montar(
      createElement(SecaoRecepcao, {
        config,
        setPagina,
        avatarRef: createRef<HTMLInputElement>(),
        avatarPreview: avatar,
        setAvatarPreview,
        upload: vi.fn(),
      }),
    );

    const imagem = alvo.querySelector<HTMLImageElement>('img[alt="Foto atual da recepção"]');
    expect(imagem?.getAttribute("src")).toBe(avatar);

    const remover = Array.from(alvo.querySelectorAll<HTMLButtonElement>("button")).find(
      (botao) => botao.textContent?.trim() === "Remover",
    );
    expect(remover).not.toBeUndefined();
    await act(async () => remover?.click());

    expect(setPagina).toHaveBeenCalledWith("chat", { ...config.chat, avatarUrl: null });
    expect(setAvatarPreview).toHaveBeenCalledWith(null);
  });

  it("abre o seletor de arquivo ao pedir para escolher uma foto", async () => {
    const config = configPadrao();
    const avatarRef = createRef<HTMLInputElement>();
    const alvo = await montar(
      createElement(SecaoRecepcao, {
        config,
        setPagina: vi.fn(),
        avatarRef,
        avatarPreview: null,
        setAvatarPreview: vi.fn(),
        upload: vi.fn(),
      }),
    );
    const input = alvo.querySelector<HTMLInputElement>('input[type="file"]');
    expect(input).not.toBeNull();
    const abrirArquivo = vi.spyOn(input!, "click");
    const escolher = Array.from(alvo.querySelectorAll<HTMLButtonElement>("button")).find(
      (botao) => botao.textContent?.includes("Escolher foto"),
    );
    await act(async () => escolher?.click());
    expect(abrirArquivo).toHaveBeenCalledTimes(1);
  });
});
