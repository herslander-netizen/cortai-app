import { QueryClient } from "@tanstack/react-query";
import { createRouter, useRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { TelaDeCarregamento } from "./components/layout/Carregando";

/** Nunca deixa a navegação parecer congelada quando a guarda falha. */
function ErroDeNavegacao({ error }: { error: Error }) {
  const router = useRouter();
  return (
    <div className="grid min-h-screen place-items-center bg-ink px-8">
      <div className="w-full max-w-[320px] text-center">
        <h1 className="text-lg font-bold text-paper">Não conseguimos abrir esta tela</h1>
        <p className="mt-2 text-sm text-mute">
          {error.message.toLowerCase().includes("unauthorized")
            ? "Sua sessão expirou. Entre novamente para continuar."
            : "A conexão falhou no meio do caminho. Tente de novo."}
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <button type="button" className="btn-primary" onClick={() => router.invalidate()}>
            Tentar de novo
          </button>
          <a href="/login" className="btn-secondary">
            Entrar
          </a>
        </div>
      </div>
    </div>
  );
}

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Celulares em rede lenta sofriam com refetch a cada foco/montagem.
        staleTime: 60_000,
        gcTime: 10 * 60_000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        retry: 1,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 30_000,
    // Guardas que consultam o servidor não podem deixar a tela em branco.
    defaultPendingComponent: () => <TelaDeCarregamento />,
    defaultPendingMs: 250,
    defaultPendingMinMs: 300,
    defaultErrorComponent: ErroDeNavegacao,
  });

  return router;
};
