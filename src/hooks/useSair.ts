import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

import { sair } from "@/lib/guarda";

/**
 * Sair da conta sempre pelo router: sem recarregar a página e sem deixar
 * consultas antigas dispararem 401 na saída.
 */
export function useSair() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return () =>
    sair(queryClient, ({ to, replace }) =>
      navigate({ to: to as never, replace: replace ?? false }),
    );
}
