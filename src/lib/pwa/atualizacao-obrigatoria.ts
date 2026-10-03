/**
 * Regras da atualização obrigatória. Puras, para teste; a tela fica em
 * components/pwa/AtualizacaoObrigatoria.tsx.
 */
import type { SituacaoDaVersao } from "@/lib/versao";

/** Áreas que podem ser bloqueadas: equipe, admin e app do cliente instalado. */
const AREAS_BLOQUEAVEIS = ["/barbeiro", "/painel", "/admin", "/app"];

export const INTERVALO_DE_CHECAGEM_MS = 30 * 60 * 1000;
export const ESPERA_FECHAR_MS = 400;

export function rotaBloqueavel(caminho: string) {
  return AREAS_BLOQUEAVEIS.some((p) => caminho === p || caminho.startsWith(`${p}/`));
}

/** Bloqueia só com versão abaixo da mínima, em área bloqueável e fora do Modo Foco. */
export function deveBloquear(opcoes: {
  situacao: SituacaoDaVersao | null;
  caminho: string;
  modoFoco: boolean;
}) {
  return opcoes.situacao === "obrigatoria" && !opcoes.modoFoco && rotaBloqueavel(opcoes.caminho);
}

/** Ativa o service worker novo, limpa caches antigos do app e recarrega. */
export async function aplicarAtualizacao(recarregar: () => void = () => window.location.reload()) {
  const resposta = await fetch(`/versao.json?t=${Date.now()}`, { cache: "no-store" });
  if (!resposta.ok) throw new Error("sem conexão");
  if ("serviceWorker" in navigator) {
    const registro = await navigator.serviceWorker.getRegistration();
    if (registro) {
      await registro.update().catch(() => undefined);
      registro.waiting?.postMessage({ tipo: "cortai-ativar" });
    }
  }
  if (typeof caches !== "undefined") {
    const nomes = await caches.keys();
    await Promise.all(nomes.filter((n) => n.startsWith("cortai-")).map((n) => caches.delete(n)));
  }
  recarregar();
}

/** Tenta fechar a janela; devolve true se ela continuou aberta. */
export async function tentarFechar(janela: Window = window, espera = ESPERA_FECHAR_MS) {
  try {
    janela.close();
  } catch {
    /* segue para o bloqueio */
  }
  await new Promise((r) => setTimeout(r, espera));
  return !janela.closed;
}
