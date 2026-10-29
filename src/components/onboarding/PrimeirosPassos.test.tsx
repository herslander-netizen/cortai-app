// @vitest-environment jsdom
import { act, createElement, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PrimeirosPassos } from "./PrimeirosPassos";

const mocks = vi.hoisted(() => ({
  config: null as unknown,
  marcar: vi.fn().mockResolvedValue(undefined),
  invalidateQueries: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: ({ queryKey }: { queryKey: string[] }) => {
    switch (queryKey[0]) {
      case "capacidades":
      case "uso-agenda-online":
        return { data: null };
      case "sessao":
        return { data: { permissoes: ["alterar_dados_barbearia"] } };
      case "configuracao-inicial":
        return { data: mocks.config };
      default:
        return { data: null };
    }
  },
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
}));

vi.mock("@tanstack/react-start", () => ({
  useServerFn: () => mocks.marcar,
}));

vi.mock("@tanstack/react-router", async () => {
  const React = await import("react");
  return {
    Link: ({ to, children, ...props }: { to: string; children: ReactNode; [key: string]: unknown }) =>
      React.createElement("a" as any, { href: to, ...props } as any, children),
  };
});

vi.mock("framer-motion", async () => {
  const React = await import("react");
  const motion = new Proxy(
    {},
    {
      get: (_target, tag: string) =>
        React.forwardRef<HTMLElement, Record<string, unknown>>((props, ref) => {
          const filtered = Object.fromEntries(
            Object.entries(props).filter(([key]) => !["initial", "animate", "exit", "transition", "layout"].includes(key)),
          );
          return React.createElement(tag as any, { ...filtered, ref } as any, props["children"] as ReactNode);
        }),
    },
  );
  return {
    AnimatePresence: ({ children }: { children: ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    motion,
    useReducedMotion: () => false,
  };
});

vi.mock("@/lib/sessao.functions", () => ({ getSessao: vi.fn() }));
vi.mock("@/lib/capacidades.functions", () => ({
  getCapacidades: vi.fn(),
  getUsoDaAgendaOnline: vi.fn(),
}));
vi.mock("@/lib/onboarding.functions", () => ({
  ITENS_DO_CHECKLIST: [
    { chave: "cadastrar_servicos", rotulo: "Cadastre seus serviços", destino: "/barbeiro/servicos" },
    { chave: "cadastrar_profissionais", rotulo: "Cadastre os profissionais", destino: "/barbeiro/profissionais" },
    { chave: "whatsapp", rotulo: "Conecte o WhatsApp", destino: "/barbeiro/cortai" },
    { chave: "compartilhar_link", rotulo: "Compartilhe seu link de agendamento", destino: "/barbeiro/configurar" },
  ],
  getConfiguracaoInicial: vi.fn(),
  marcarItemDoChecklist: vi.fn(),
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement | null = null;
let root: ReturnType<typeof createRoot> | null = null;

async function montar() {
  mocks.config = {
    concluidoEm: "2026-10-24T00:00:00.000Z",
    itens: {
      cadastrar_servicos: false,
      cadastrar_profissionais: false,
      whatsapp: false,
      compartilhar_link: false,
    },
  };
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => root?.render(createElement(PrimeirosPassos)));
  return host;
}

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  root = null;
  host?.remove();
  host = null;
  mocks.config = null;
  mocks.marcar.mockClear();
  mocks.invalidateQueries.mockClear();
});

describe("PrimeirosPassos — detalhes no padrão Figaro", () => {
  it("expande e recolhe a descrição sem perder o link de navegação", async () => {
    const alvo = await montar();
    const seletor = 'button[aria-label="Ver detalhes: Cadastre seus serviços"]';
    const botao = alvo.querySelector<HTMLButtonElement>(seletor);

    expect(botao).not.toBeNull();
    expect(botao?.getAttribute("aria-expanded")).toBe("false");
    expect(alvo.querySelector('a[href="/barbeiro/servicos"]')).not.toBeNull();

    await act(async () => botao?.click());

    const aberto = alvo.querySelector<HTMLButtonElement>(
      'button[aria-label="Ocultar detalhes: Cadastre seus serviços"]',
    );
    expect(aberto?.getAttribute("aria-expanded")).toBe("true");
    expect(alvo.textContent).toContain(
      "Defina os serviços, a duração e os preços para que seus clientes possam escolher o que desejam agendar.",
    );

    await act(async () => aberto?.click());

    expect(
      alvo.querySelector('button[aria-label="Ver detalhes: Cadastre seus serviços"]')?.getAttribute("aria-expanded"),
    ).toBe("false");
  });

  it("mantém cada descrição ligada ao passo correto", async () => {
    const alvo = await montar();

    await act(async () =>
      alvo.querySelector<HTMLButtonElement>(
        'button[aria-label="Ver detalhes: Conecte o WhatsApp"]',
      )?.click(),
    );

    expect(alvo.textContent).toContain(
      "Conecte o WhatsApp para habilitar os canais de mensagens e notificações configurados no Flow.",
    );
    expect(alvo.querySelector('[role="region"][aria-label="Detalhes de Conecte o WhatsApp"]')).not.toBeNull();
  });
});
