// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PreferenciasDoCliente } from "./PreferenciasDoCliente";

const mocks = vi.hoisted(() => ({
  data: null as unknown,
  mutate: vi.fn(),
  queryClient: {
    getQueryData: vi.fn(),
    setQueryData: vi.fn(),
  },
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: mocks.data }),
  useMutation: () => ({ mutate: mocks.mutate }),
  useQueryClient: () => mocks.queryClient,
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/lib/avisos", () => ({ aviso: { erro: vi.fn() } }));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

type Preferencias = {
  whatsapp_ativo: boolean;
  push_ativo: boolean;
  frequencia: "padrao" | "frequente" | "minima";
  silencio_inicio: string | null;
  silencio_fim: string | null;
};

const padrao: Preferencias = {
  whatsapp_ativo: true,
  push_ativo: true,
  frequencia: "padrao",
  silencio_inicio: null,
  silencio_fim: null,
};

let host: HTMLDivElement | null = null;
let root: ReturnType<typeof createRoot> | null = null;

async function montar(pref: Preferencias) {
  mocks.data = {
    clientes: [{ id: "cliente-teste", tenant_id: "negocio-teste" }],
    pref,
  };
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => root?.render(createElement(PreferenciasDoCliente)));
  return host;
}

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  root = null;
  host?.remove();
  host = null;
  mocks.data = null;
  mocks.mutate.mockClear();
});

describe("PreferenciasDoCliente — animação V3", () => {
  it("mostra frequência e silêncio quando pelo menos um canal está ativo", async () => {
    const alvo = await montar({ ...padrao, whatsapp_ativo: false, push_ativo: true });

    expect(alvo.querySelector('input[aria-label="Início do silêncio"]')).not.toBeNull();
    expect(alvo.querySelector('input[aria-label="Fim do silêncio"]')).not.toBeNull();
    expect(alvo.textContent).toContain("Quando avisar");
    expect(alvo.querySelector(".overflow-hidden")).not.toBeNull();
  });

  it("não mostra as opções de horário quando ambos os canais estão desativados", async () => {
    const alvo = await montar({ ...padrao, whatsapp_ativo: false, push_ativo: false });

    expect(alvo.querySelector('input[aria-label="Início do silêncio"]')).toBeNull();
    expect(alvo.querySelector('input[aria-label="Fim do silêncio"]')).toBeNull();
    expect(alvo.textContent).not.toContain("Quando avisar");
  });

  it("preserva o restante das preferências ao alternar um canal", async () => {
    const alvo = await montar(padrao);
    const whatsapp = Array.from(
      alvo.querySelectorAll<HTMLButtonElement>('button[role="switch"]'),
    ).find((botao) => botao.textContent?.trim() === "WhatsApp");
    expect(whatsapp).not.toBeUndefined();

    await act(async () => whatsapp?.click());

    expect(mocks.mutate).toHaveBeenCalledWith({
      ...padrao,
      whatsapp_ativo: false,
    });
  });
});
