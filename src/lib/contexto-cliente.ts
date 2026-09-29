import { useEffect, useState } from "react";

export const CHAVE_CONTEXTO_CLIENTE = "cortai-contexto-cliente-v1";

export function slugValido(valor: unknown): string | null {
  return typeof valor === "string" && /^[a-z0-9-]{1,100}$/.test(valor) ? valor : null;
}

export function salvarContextoCliente(slug: string) {
  const valido = slugValido(slug);
  if (valido) window.localStorage.setItem(CHAVE_CONTEXTO_CLIENTE, valido);
}

export function useContextoCliente(slugExplicito?: string) {
  const explicito = slugValido(slugExplicito);
  const [slug, setSlug] = useState<string | null>(explicito);

  useEffect(() => {
    if (explicito) {
      salvarContextoCliente(explicito);
      setSlug(explicito);
      return;
    }
    setSlug(slugValido(window.localStorage.getItem(CHAVE_CONTEXTO_CLIENTE)));
  }, [explicito]);

  return slug;
}
