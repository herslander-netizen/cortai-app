/**
 * Recuperação de falha de importação dinâmica (chunk antigo após nova publicação).
 * Recarrega no máximo uma vez a cada 30 s (trava em sessionStorage) — sem loop.
 * Nunca toca em localStorage, sessão ou preferências; só apaga caches "cortai-assets-*".
 */
import { lazy, type ComponentType } from "react";

const CHAVE = "cortai:recuperacao-chunk";
export const JANELA_MS = 30_000;

const PADROES =
  /failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed|loading chunk [\w-]+ failed|chunkloaderror|loading css chunk|unable to preload css/i;

export function ehErroDeChunk(erro: unknown): boolean {
  if (!erro) return false;
  const e = erro as { name?: string; message?: string };
  return (
    e.name === "ChunkLoadError" || PADROES.test(`${e.name ?? ""} ${e.message ?? String(erro)}`)
  );
}

export type TipoDeErro =
  "chunk" | "autenticacao" | "permissao" | "rede" | "servidor" | "desconhecido";

export function classificarErro(erro: unknown): TipoDeErro {
  if (ehErroDeChunk(erro)) return "chunk";
  const e = erro as { status?: number; message?: string } | null;
  const status = typeof e?.status === "number" ? e.status : undefined;
  const msg = erro instanceof Error ? erro.message : String(erro ?? "");
  if (
    status === 401 ||
    /unauthorized|não autenticad|sessão expirada|jwt expired|status.?401/i.test(msg)
  )
    return "autenticacao";
  if (status === 403 || /sem permiss[aã]o|não tem permiss[aã]o|forbidden|status.?403/i.test(msg))
    return "permissao";
  if (
    (status && status >= 500) ||
    /status.?5\d\d|internal server error|bad gateway|service unavailable/i.test(msg)
  )
    return "servidor";
  if (
    (typeof navigator !== "undefined" && navigator.onLine === false) ||
    /failed to fetch|networkerror|network request failed|load failed|err_internet/i.test(msg)
  )
    return "rede";
  return "desconhecido";
}

/** Pode recarregar agora? (não houve recuperação nos últimos 30 s) */
export function podeRecuperar(
  agora = Date.now(),
  armazenamento: Pick<Storage, "getItem"> = sessionStorage,
) {
  try {
    const ultimo = Number(armazenamento.getItem(CHAVE) ?? 0);
    return !ultimo || agora - ultimo > JANELA_MS;
  } catch {
    return true;
  }
}

/** Cobre a tela enquanto o app recarrega, para não parecer travado ou em branco. */
function mostrarAtualizando(
  titulo = "Atualizando o Flow…",
  texto = "Uma versão nova acabou de sair. Só um instante.",
) {
  if (typeof document === "undefined" || document.getElementById("cortai-atualizando")) return;
  const camada = document.createElement("div");
  camada.id = "cortai-atualizando";
  camada.setAttribute("role", "status");
  camada.style.cssText =
    "position:fixed;inset:0;z-index:2147483647;display:grid;place-content:center;gap:12px;text-align:center;padding:24px;font:600 16px system-ui,sans-serif;background:var(--color-background,#0b1220);color:var(--color-foreground,#fff)";
  const principal = document.createElement("span");
  principal.textContent = titulo;
  const apoio = document.createElement("span");
  apoio.textContent = texto;
  apoio.style.cssText = "font-weight:400;font-size:14px;opacity:.7";
  camada.append(principal, apoio);
  document.body.appendChild(camada);
}

const CHAVE_DA_TELA = "cortai:recuperacao-tela";

/**
 * Recarrega a página quando a tela ficou vazia e não voltou sozinha (vigia de tela). Usa a mesma janela de
 * 30 s da recuperação de arquivos, com trava própria: no máximo uma recarga por janela, nunca em ciclo.
 */
export function recarregarTelaVazia(agora = Date.now()): boolean {
  if (typeof window === "undefined") return false;
  try {
    const ultimo = Number(sessionStorage.getItem(CHAVE_DA_TELA) ?? 0);
    if (ultimo && agora - ultimo <= JANELA_MS) return false;
    sessionStorage.setItem(CHAVE_DA_TELA, String(agora));
  } catch {
    /* sem armazenamento: segue uma vez */
  }
  mostrarAtualizando("Abrindo a tela de novo…", "Ela não carregou direito. Só um instante.");
  window.location.reload();
  return true;
}

/** Atualiza o SW, apaga só caches de assets e recarrega. `forcar` ignora a trava (clique do usuário). */
export function recuperarDeChunk(forcar = false): boolean {
  if (typeof window === "undefined") return false;
  if (!forcar && !podeRecuperar()) return false;
  try {
    sessionStorage.setItem(CHAVE, String(Date.now()));
  } catch {
    /* segue */
  }
  mostrarAtualizando();
  void (async () => {
    try {
      const reg = await navigator.serviceWorker?.getRegistration();
      await reg?.update().catch(() => undefined);
      reg?.waiting?.postMessage({ tipo: "cortai-ativar" });
    } catch {
      /* sem SW */
    }
    try {
      if (typeof caches !== "undefined") {
        const nomes = await caches.keys();
        await Promise.all(
          nomes.filter((n) => n.startsWith("cortai-assets-")).map((n) => caches.delete(n)),
        );
      }
    } catch {
      /* segue */
    }
    window.location.reload();
  })();
  return true;
}

let instalado = false;
/** Ouve o evento do Vite para falhas de preload de módulo. */
export function instalarRecuperacaoDeChunk() {
  if (instalado || typeof window === "undefined") return;
  instalado = true;
  window.addEventListener("vite:preloadError", (ev) => {
    if (recuperarDeChunk()) ev.preventDefault();
  });
}

/** React.lazy que recarrega uma vez quando o chunk sumiu; senão repassa o erro ao RouteError. */
export function lazyComRecuperacao<T extends ComponentType<any>>(
  fabrica: () => Promise<{ default: T }>,
) {
  return lazy(() =>
    fabrica().catch((erro: unknown) => {
      if (ehErroDeChunk(erro) && recuperarDeChunk()) return new Promise<{ default: T }>(() => {});
      throw erro;
    }),
  );
}
