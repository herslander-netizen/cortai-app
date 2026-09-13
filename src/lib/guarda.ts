import { redirect } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";
import { getSessao, type Papel, type Sessao } from "@/lib/sessao.functions";

export type Destino = "/admin" | "/barbeiro" | "/app" | "/comecar";

export function destinoDoPapel(sessao: Sessao): Destino {
  if (sessao.papel === "admin") return "/admin";
  if (sessao.papel === "barbeiro") return sessao.tenantId ? "/barbeiro" : "/comecar";
  if (sessao.papel === "cliente") return "/app";
  return "/comecar";
}

/** Bloqueia a rota quando não há sessão real ou quando o papel não é o esperado. */
export async function exigirPapel(papel: Exclude<Papel, "pendente">): Promise<Sessao> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw redirect({
      to: "/login",
      search: {
        proximo:
          typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}` : "",
      },
    });
  }
  let sessao: Sessao;
  try {
    sessao = await getSessao();
  } catch {
    await supabase.auth.signOut();
    throw redirect({ to: "/login", search: { proximo: "" } });
  }
  const destino = destinoDoPapel(sessao);
  if (sessao.papel !== papel || (papel === "barbeiro" && !sessao.tenantId)) {
    throw redirect({ to: destino });
  }
  return sessao;
}

export async function sair() {
  await supabase.auth.signOut();
  if (typeof window !== "undefined") window.location.assign("/");
}
