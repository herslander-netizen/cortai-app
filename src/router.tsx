import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { EsqueletoGenerico } from "./components/layout/Esqueleto";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      // Dados recém-buscados valem por 30 s: voltar a uma tela não refaz a consulta à toa.
      queries: { staleTime: 30_000, gcTime: 10 * 60_000, retry: 1 },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Prefetch ao encostar/tocar: a próxima tela já começa a carregar antes do clique.
    defaultPreload: "intent",
    defaultPreloadDelay: 30,
    defaultPreloadStaleTime: 0,
    defaultPendingComponent: EsqueletoGenerico,
    defaultPendingMs: 150,
    defaultPendingMinMs: 100,
  });

  return router;
};
