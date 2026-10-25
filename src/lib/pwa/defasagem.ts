/**
 * Publicação nova enquanto a tela está aberta ("deploy skew").
 *
 * Cada publicação troca os nomes dos arquivos de cada tela. Quem já estava com o app aberto tenta abrir uma
 * tela cujo arquivo antigo sumiu: o servidor devolve uma página HTML no lugar do código, a tela não carrega
 * e o aplicativo precisa recarregar sozinho (branco por alguns segundos, sobretudo no celular).
 *
 * Aqui o app descobre a troca antes do toque: compara a identidade do código que está rodando com a do
 * `build-id.json` publicado. Se mudou, o próximo toque de navegação vira uma navegação normal do navegador,
 * direto ao destino, em vez de uma tela que não carrega.
 */
export const INTERVALO_DA_CHECAGEM_MS = 45_000;

export const buildEmExecucao = (): string | null =>
  typeof __BUILD_ID__ === "string" && __BUILD_ID__ ? __BUILD_ID__ : null;

/** Só compara quando as duas identidades existem; em desenvolvimento (sem identidade) nunca há defasagem. */
export function estaDefasado(emExecucao: string | null, publicado: string | null): boolean {
  return Boolean(emExecucao && publicado && emExecucao !== publicado);
}

export async function buscarBuildPublicado(buscar: typeof fetch = fetch): Promise<string | null> {
  const controle = new AbortController();
  const prazo = setTimeout(() => controle.abort(), 4_000);
  try {
    const resposta = await buscar(`/build-id.json?t=${Date.now()}`, {
      cache: "no-store",
      signal: controle.signal,
    });
    if (!resposta.ok || !/json/i.test(resposta.headers.get("content-type") ?? "")) return null;
    const corpo = (await resposta.json()) as { id?: unknown };
    return typeof corpo.id === "string" ? corpo.id : null;
  } catch {
    return null;
  } finally {
    clearTimeout(prazo);
  }
}

let defasado = false;
export const appDefasado = () => defasado;

/** Confere agora; guarda o resultado para o próximo toque de navegação. */
export async function conferirDefasagem(): Promise<boolean> {
  const atual = buildEmExecucao();
  if (!atual) return false;
  defasado = estaDefasado(atual, await buscarBuildPublicado());
  return defasado;
}

let instalada = false;
/** Confere ao abrir, ao voltar ao app e de tempos em tempos (só com a tela visível). */
export function vigiarDefasagem() {
  if (instalada || typeof window === "undefined" || !buildEmExecucao()) return;
  instalada = true;
  void conferirDefasagem();
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void conferirDefasagem();
  });
  // Antes do toque: pelo menos 15 s entre conferências, para a resposta chegar antes do clique seguinte.
  let ultimaConferencia = Date.now();
  document.addEventListener(
    "pointerdown",
    () => {
      if (Date.now() - ultimaConferencia < 15_000) return;
      ultimaConferencia = Date.now();
      void conferirDefasagem();
    },
    { passive: true },
  );
  window.setInterval(() => {
    if (document.visibilityState === "visible") void conferirDefasagem();
  }, INTERVALO_DA_CHECAGEM_MS);
}
