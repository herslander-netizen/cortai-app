import { redirect } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";
import { getSessao, type Papel, type Sessao } from "@/lib/sessao.functions";

import { efeitoDoEventoDeAutenticacao } from "@/lib/auth-eventos";
import { precisaEscolherContexto } from "@/lib/contextos";
import { registrar } from "@/lib/diagnostico/telemetria";

export type Destino = "/admin" | "/barbeiro" | "/app" | "/comecar" | "/escolher";

/** Logo após entrar: conta com cliente + negócio vê o seletor; com um só, entra direto. */
export function destinoAposEntrar(sessao: Sessao): Destino {
  return precisaEscolherContexto(sessao, true) ? "/escolher" : destinoDoPapel(sessao);
}

export function destinoDoPapel(sessao: Sessao): Destino {
  if (precisaEscolherContexto(sessao)) return "/escolher";
  if (sessao.papel === "admin") return "/admin";
  if (sessao.papel === "barbeiro") return sessao.tenantId ? "/barbeiro" : "/comecar";
  if (sessao.papel === "cliente") return "/app";
  return "/comecar";
}

/**
 * Só devolve o destino pedido no login quando ele é um caminho interno
 * dentro da área permitida para o papel da pessoa. Caso contrário, null.
 */
export function destinoSolicitadoPermitido(
  proximo: string | undefined,
  destino: Destino,
): string | null {
  if (!proximo || !proximo.startsWith("/") || proximo.startsWith("//")) return null;
  const caminho = proximo.split("?")[0] ?? "";
  // Autorização de assistentes externos (MCP): volta à tela de consentimento.
  if (caminho === "/oauth/consentimento") return proximo;
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

/** Última sessão carregada com sucesso: segura a navegação se a próxima leitura falhar por instabilidade. */
let ultimaSessaoBoa: { userId: string; sessao: Sessao } | null = null;

export function sessaoDeReserva(userId: string): Sessao | null {
  return ultimaSessaoBoa?.userId === userId ? ultimaSessaoBoa.sessao : null;
}

if (typeof window !== "undefined") {
  let contaConhecida: string | null | undefined = undefined;
  supabase.auth.onAuthStateChange((evento, sessaoAuth) => {
    const conta = sessaoAuth?.user?.id ?? null;
    const efeito = efeitoDoEventoDeAutenticacao(evento, contaConhecida, conta);
    registrar("auth-guarda", { ev: evento, efeito });
    contaConhecida = conta;
    if (efeito !== "nada") esquecerSessao();
    if (efeito === "conta") ultimaSessaoBoa = null;
  });
}

export async function sessaoDoUsuario(userId: string): Promise<Sessao> {
  const agora = Date.now();
  if (
    cacheDaSessao &&
    cacheDaSessao.userId === userId &&
    agora - cacheDaSessao.em < VALIDADE_DA_SESSAO_MS
  ) {
    return cacheDaSessao.promessa;
  }
  // Cache vencido, mas já há uma sessão boa desta conta: navega com ela agora e renova por trás. Esperar a rede
  // aqui deixava a troca de tela parada (e o casco aparecendo) toda vez que o cache expirava. A proteção de
  // verdade continua em cada função do servidor.
  const anterior = ultimaSessaoBoa?.userId === userId ? ultimaSessaoBoa.sessao : null;
  const promessa = getSessao();
  cacheDaSessao = { userId, em: agora, promessa };
  if (anterior) {
    promessa
      .then((sessao) => {
        ultimaSessaoBoa = { userId, sessao };
      })
      .catch(() => esquecerSessao());
    return anterior;
  }
  try {
    const sessao = await promessa;
    ultimaSessaoBoa = { userId, sessao };
    return sessao;
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
    registrar("guarda-sem-usuario", { papel }, true);
    throw redirect({
      to: "/login",
      search: {
        proximo:
          typeof window !== "undefined"
            ? `${window.location.pathname}${window.location.search}`
            : "",
      },
    });
  }
  let sessao: Sessao;
  try {
    sessao = await sessaoDoUsuario(usuario.id);
  } catch (erro) {
    // Instabilidade passageira: segue com a última sessão boa da mesma conta, sem mandar ao login
    // (o desvio pelo login descartava o toque e devolvia à tela anterior).
    const reserva = sessaoDeReserva(usuario.id);
    registrar(
      "guarda-falha",
      {
        papel,
        reserva: reserva ? 1 : 0,
        msg: erro instanceof Error ? erro.message.slice(0, 120) : "?",
      },
      true,
    );
    if (reserva) return reserva;
    // Falha ao carregar o perfil não prova que a sessão é inválida.
    // Preserve os tokens e permita nova tentativa na tela de login.
    esquecerSessao();
    throw redirect({
      to: "/login",
      search: {
        proximo:
          typeof window !== "undefined"
            ? `${window.location.pathname}${window.location.search}`
            : "",
        erro: "perfil",
      },
    });
  }
  const destino = destinoDoPapel(sessao);
  if (sessao.papel !== papel || (papel === "barbeiro" && !sessao.tenantId)) {
    registrar(
      "guarda-desvio",
      { papel, tem: sessao.papel, destino, tenant: sessao.tenantId ? 1 : 0 },
      true,
    );
    throw redirect({ to: destino });
  }
  return sessao;
}

/** Resolve em até `ms`; nunca rejeita (passos de saída são melhor esforço). */
function comPrazo(tarefa: Promise<unknown>, ms: number): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    tarefa.then(
      () => {
        clearTimeout(timer);
        resolve();
      },
      () => {
        clearTimeout(timer);
        resolve();
      },
    );
  });
}

/**
 * Encerra a sessão sem nunca travar: `signOut()` pode ficar pendente para
 * sempre (renovação de token expirado sem rede, ou trava interna de sessão
 * ocupada). Se não concluir no prazo, apaga a sessão local à força para que
 * nenhuma tela a reencontre e devolva a pessoa para dentro do painel.
 */
function apagarSessaoLocal() {
  if (typeof window === "undefined") return;
  try {
    const auth = supabase.auth as unknown as {
      storageKey?: string;
      storage?: { removeItem: (k: string) => unknown };
    };
    const chaves = new Set<string>();
    if (auth.storageKey) chaves.add(auth.storageKey);
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith("sb-") && k.includes("-auth-token")) chaves.add(k);
    }
    for (const k of chaves) {
      window.localStorage.removeItem(k);
      void Promise.resolve(auth.storage?.removeItem(k)).catch(() => undefined);
    }
  } catch {
    /* armazenamento indisponível: segue para a tela de entrada */
  }
}

/** Apaga a sessão do aparelho na hora; o encerramento formal segue em segundo plano. */
async function encerrarSessaoComSeguranca() {
  esquecerSessao();
  const formal = comPrazo(supabase.auth.signOut({ scope: "local" }), 1000);
  apagarSessaoLocal();
  void formal;
}

let saindoDaConta = false;

export async function sair() {
  // Toques repetidos em "Sair" não disparam saídas concorrentes.
  if (saindoDaConta) return;
  saindoDaConta = true;
  // Push em segundo plano (melhor esforço), sem segurar a saída.
  void comPrazo(
    import("@/lib/push/aparelho").then(({ removerPushDesteAparelho }) =>
      removerPushDesteAparelho(),
    ),
    800,
  );
  try {
    await encerrarSessaoComSeguranca();
  } finally {
    // `replace`: o Voltar não reabre a tela protegida.
    if (typeof window !== "undefined") {
      window.location.replace("/login");
      // Se a navegação for bloqueada (iframe/mobile), destrava o botão.
      window.setTimeout(() => {
        saindoDaConta = false;
      }, 1500);
    } else {
      saindoDaConta = false;
    }
  }
}
