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

const OPCOES_SESSAO = {
  queryKey: chaveSessao,
  queryFn: () => getSessao(),
  staleTime: 5 * 60 * 1000,
  gcTime: 30 * 60 * 1000,
  retry: false,
} as const;

/**
 * Marca quando a sessão acabou de ser buscada de propósito (login, troca de
 * perfil). O listener global usa isso para não refazer a mesma consulta.
 */
let ultimaAtualizacao = 0;
export function sessaoRecemAtualizada(janelaMs = 3000) {
  return Date.now() - ultimaAtualizacao < janelaMs;
}

/**
 * Lê a sessão uma única vez e reaproveita pelo cache do React Query.
 * Sem isso cada troca de aba refazia a validação inteira no servidor —
 * era a principal causa de lentidão na navegação, sobretudo no Android.
 */
export function carregarSessao(queryClient: QueryClient): Promise<Sessao> {
  return queryClient.ensureQueryData(OPCOES_SESSAO);
}

/**
 * Busca a sessão de novo e já grava no cache: uma única ida ao servidor.
 * Antes o código removia o cache e chamava `carregarSessao` logo depois, o
 * que disparava duas consultas e deixava a tela parada entre elas.
 */
export async function atualizarSessao(queryClient: QueryClient): Promise<Sessao> {
  const sessao = await queryClient.fetchQuery({ ...OPCOES_SESSAO, staleTime: 0 });
  ultimaAtualizacao = Date.now();
  return sessao;
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

type IrPara = (opcoes: { to: string; replace?: boolean }) => unknown;

/**
 * Sai da conta sem recarregar a página: cancela o que está em voo, limpa o
 * cache e navega pelo próprio router (o reload anterior dava a sensação de
 * travamento em celulares lentos).
 */
export async function sair(queryClient?: QueryClient, irPara?: IrPara) {
  await queryClient?.cancelQueries();
  await supabase.auth.signOut();
  queryClient?.clear();
  ultimaAtualizacao = Date.now();
  if (irPara) {
    await irPara({ to: "/login", replace: true });
    return;
  }
  if (typeof window !== "undefined") window.location.assign("/login");
}
