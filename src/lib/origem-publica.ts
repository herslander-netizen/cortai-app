/**
 * Origem pública do ambiente (achado N3 de 16/10): links de compartilhar, prévias de link,
 * imagens sociais e links das mensagens apontam para o ambiente em que o app roda.
 * Servidor: `CORTAI_PUBLIC_BASE_URL`; navegador: `VITE_CORTAI_PUBLIC_URL` (fixado no build).
 * Sem nenhuma das duas, vale a produção (`https://cortai.dev`), como antes.
 * Metatags canônicas de SEO e o guarda do WhatsApp continuam com o domínio de produção.
 */
export const ORIGEM_DE_PRODUCAO = "https://cortai.dev";

function normalizar(valor: unknown): string | null {
  if (typeof valor !== "string" || !valor.trim()) return null;
  try {
    const url = new URL(valor.trim());
    if (url.protocol !== "https:" && url.hostname !== "localhost") return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function origemPublica(): string {
  const doServidor =
    typeof process !== "undefined" ? process.env?.["CORTAI_PUBLIC_BASE_URL"] : undefined;
  return (
    normalizar(doServidor) ??
    normalizar(import.meta.env?.["VITE_CORTAI_PUBLIC_URL"]) ??
    ORIGEM_DE_PRODUCAO
  );
}

/** `caminho` começa com "/". */
export function urlPublica(caminho: string): string {
  return `${origemPublica()}${caminho}`;
}

/** Host para mostrar na tela (ex.: "cortai.dev"). */
export function hostPublico(): string {
  return new URL(origemPublica()).host;
}
