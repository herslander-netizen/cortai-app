import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { EsqueletoDaRota } from "./components/layout/Esqueleto";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Prefetch ao encostar/tocar: a próxima tela já começa a carregar antes do clique.
    defaultPreload: "intent",
    defaultPreloadDelay: 30,
    defaultPreloadStaleTime: 0,
    defaultPendingComponent: EsqueletoDaRota,
    defaultPendingMs: 100,
    defaultPendingMinMs: 250,
  });

  return router;
};
