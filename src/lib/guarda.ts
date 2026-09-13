import type { QueryClient } from "@tanstack/react-query";
import { redirect } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";
import { getSessao, type Papel, type Sessao } from "@/lib/sessao.functions";

export type Destino = "/admin" | "/barbeiro" | "/app" | "/comecar";

export const chaveSessao = ["sessao"] as const;

export function destinoDoPapel(sessao: Sessao): Destino {
  if (sessao.papel === "admin") return "/admin";
  if (sessao.papel === "barbeiro") return sessao.tenantId ? "/barbeiro" : "/comecar";
  if (sessao.papel === "cliente") return "/app";
  return "/comecar";
}

/**
 * Lê a sessão uma única vez e reaproveita pelo cache do React Query.
 * Sem isso cada troca de aba refazia a validação inteira no servidor —
 * era a principal causa de lentidão na navegação, sobretudo no Android.
 */
export function carregarSessao(queryClient: QueryClient): Promise<Sessao> {
  return queryClient.ensureQueryData({
    queryKey: chaveSessao,
    queryFn: () => getSessao(),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: false,
  });
}

function paraLogin(): never {
  throw redirect({
    to: "/login",
    search: {
      proximo:
        typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}` : "",
    },
  });
}

/** Bloqueia a rota quando não há sessão real ou quando o papel não é o esperado. */
export async function exigirPapel(
  papel: Exclude<Papel, "pendente">,
  queryClient: QueryClient,
): Promise<Sessao> {
  let sessao: Sessao;
  try {
    sessao = await carregarSessao(queryClient);
  } catch (erro) {
    if (erro && typeof erro === "object" && "to" in erro) throw erro;
    queryClient.removeQueries({ queryKey: chaveSessao });
    paraLogin();
  }
  const destino = destinoDoPapel(sessao);
  if (sessao.papel !== papel || (papel === "barbeiro" && !sessao.tenantId)) {
    throw redirect({ to: destino });
  }
  return sessao;
}

export async function sair(queryClient?: QueryClient) {
  queryClient?.clear();
  await supabase.auth.signOut();
  if (typeof window !== "undefined") window.location.assign("/");
}
