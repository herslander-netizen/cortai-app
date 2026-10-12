// @vitest-environment jsdom
import { act, createElement, createRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { MarcaForm } from "@/lib/marca.functions";
import { configPadrao } from "@/lib/pagina-config";
import { SecaoLink } from "./SecaoLink";
import { SecaoRecepcao } from "./SecaoRecepcao";

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

function montar(elemento: React.ReactNode) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root!.render(elemento));
  return host;
}

const form: MarcaForm = {
  nome: "Negócio",
  endereco: null,
  telefone: null,
  instagram: null,
  whatsapp: null,
  facebook: null,
  tema: "cortai",
  cor_primaria: "#000000",
  cor_secundaria: "#111111",
  cor_accent: "#222222",
  rotulo_carteira: null,
  texto_boas_vindas: null,
  descricao: null,
  capa_url: null,
  fotos: [],
  assinatura_visivel: true,
  logo_url: null,
};

describe("controles do editor da página pública", () => {
  it("associa o rótulo do link somente ao campo de endereço", () => {
    const host = montar(
      createElement(SecaoLink, {
        slug: "meu-negocio",
        setSlug: vi.fn(),
        slugInicial: "meu-negocio",
        busy: false,
        salvarSlug: vi.fn(),
        form,
        setMarca: vi.fn(),
      }),
    );
    const rotulo = Array.from(host.querySelectorAll("label")).find((item) =>
      item.textContent?.includes("Endereço personalizado"),
    );
    const campo = host.querySelector<HTMLInputElement>("input[id]");

    expect(rotulo?.htmlFor).toBe(campo?.id);
    expect(rotulo?.querySelector("button")).toBeNull();
    expect(host.querySelector("label button")).toBeNull();
  });

  it("nomeia o botão da foto e expõe a cor de destaque selecionada", () => {
    const config = configPadrao();
    config.chat.corDestaque = "azul";
    const host = montar(
      createElement(SecaoRecepcao, {
        config,
        setPagina: vi.fn(),
        avatarRef: createRef<HTMLInputElement>(),
        avatarPreview: null,
        setAvatarPreview: vi.fn(),
        upload: vi.fn(),
      }),
    );
    const botaoFoto = host.querySelector('button[aria-label="Alterar foto da recepção"]');
    const botaoAzul = Array.from(host.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "azul",
    );

    expect(botaoFoto).not.toBeNull();
    expect(botaoAzul?.getAttribute("aria-pressed")).toBe("true");
  });
});
