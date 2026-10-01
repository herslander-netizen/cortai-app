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

/**
 * Só devolve o destino pedido no login quando ele é um caminho interno
 * dentro da área permitida para o papel da pessoa. Caso contrário, null.
 */
export function destinoSolicitadoPermitido(proximo: string | undefined, destino: Destino): string | null {
  if (!proximo || !proximo.startsWith("/") || proximo.startsWith("//")) return null;
  const caminho = proximo.split("?")[0] ?? "";
  // Autorização de assistentes externos (MCP): volta à tela de consentimento.
  if (caminho === "/.lovable/oauth/consent") return proximo;
  if (caminho === destino || caminho.startsWith(`${destino}/`)) return proximo;
  return null;
}

/**
 * Cache curto da sessão no navegador.
 * A proteção continua acontecendo no servidor em cada função; aqui evitamos
 * repetir a mesma consulta a cada toque de navegação, que era o que deixava a
 * troca de telas lenta. Qualquer mudança de login limpa o cache na hora.
 */
const VALIDADE_DA_SESSAO_MS = 5 * 60 * 1000;
let cacheDaSessao: { userId: string; em: number; promessa: Promise<Sessao> } | null = null;

export function esquecerSessao() {
  cacheDaSessao = null;
}

if (typeof window !== "undefined") {
  supabase.auth.onAuthStateChange((evento) => {
    if (evento !== "TOKEN_REFRESHED") esquecerSessao();
  });
}

export async function sessaoDoUsuario(userId: string): Promise<Sessao> {
  const agora = Date.now();
  if (cacheDaSessao && cacheDaSessao.userId === userId && agora - cacheDaSessao.em < VALIDADE_DA_SESSAO_MS) {
    return cacheDaSessao.promessa;
  }
  const promessa = getSessao();
  cacheDaSessao = { userId, em: agora, promessa };
  try {
    return await promessa;
  } catch (erro) {
    esquecerSessao();
    throw erro;
  }
}

/** Usuário autenticado lido da sessão local (sem ida à rede quando o token é válido). */
async function usuarioAtual(): Promise<{ id: string } | null> {
  const { data } = await supabase.auth.getSession();
  const usuario = data.session?.user;
  return usuario ? { id: usuario.id } : null;
}

/** Bloqueia a rota quando não há sessão real ou quando o papel não é o esperado. */
export async function exigirPapel(papel: Exclude<Papel, "pendente">): Promise<Sessao> {
  const usuario = await usuarioAtual();
  if (!usuario) {
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
    sessao = await sessaoDoUsuario(usuario.id);
  } catch {
    esquecerSessao();
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
  esquecerSessao();
  await supabase.auth.signOut();
  if (typeof window !== "undefined") window.location.assign("/");
}
