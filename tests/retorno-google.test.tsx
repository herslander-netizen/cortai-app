// @vitest-environment jsdom
import { act, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { Route } from "../src/routes/entrar.retorno";

const { navegar, lerPapel } = vi.hoisted(() => ({
  navegar: vi.fn(),
  lerPapel: vi.fn(async () => ({
    papel: "cliente",
    contextos: { cliente: true, negocio: false },
    contextoEscolhido: true,
  })),
}));

vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  useNavigate: () => navegar,
}));

vi.mock("@/lib/sessao.functions", () => ({ getSessao: lerPapel }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      getSession: async () => ({ data: { session: { user: { id: "cliente" } } } }),
    },
  },
}));

it("conclui o retorno uma vez quando o React reinicia o efeito com a leitura da sessão pendente", async () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  const busca = vi.spyOn(Route, "useSearch").mockReturnValue({});
  const Pagina = Route.options.component!;
  await Pagina.preload?.();
  const root = createRoot(document.createElement("div"));
  try {
    await act(async () => {
      root.render(
        <StrictMode>
          <Pagina />
        </StrictMode>,
      );
    });
    expect(navegar).toHaveBeenCalledExactlyOnceWith({ to: "/app", replace: true });
    expect(lerPapel).toHaveBeenCalledTimes(1);
  } finally {
    act(() => root.unmount());
    busca.mockRestore();
  }
});
