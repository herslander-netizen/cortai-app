import type { SupabaseClient } from "@supabase/supabase-js";

import { BUCKET_FOTOS, ehLinkExterno } from "@/lib/fotos-do-negocio";

/** Assina o link de uma foto guardada como caminho; link `https://` antigo passa direto. */
export async function assinarFoto(
  db: SupabaseClient<any>,
  valor: string | null | undefined,
): Promise<string | null> {
  if (!valor) return null;
  if (ehLinkExterno(valor)) return valor;
  const { data } = await db.storage.from(BUCKET_FOTOS).createSignedUrl(valor, 60 * 60);
  return data?.signedUrl ?? null;
}

/** Mesmo que `assinarFoto` para uma lista, mantendo a ordem e descartando o que não assinou. */
export async function assinarFotos(
  db: SupabaseClient<any>,
  valores: readonly string[],
): Promise<string[]> {
  const links = await Promise.all(valores.map((v) => assinarFoto(db, v)));
  return links.filter((l): l is string => Boolean(l));
}
