import { supabase } from "@/integrations/supabase/client";

export type ProvedorDeLogin = "google" | "apple";

/**
 * Login com Google ou Apple pelo próprio Supabase Auth. Os provedores e as URLs de retorno
 * precisam estar habilitados na configuração de Auth do projeto Supabase.
 */
export async function entrarComProvedor(
  provedor: ProvedorDeLogin,
  opcoes: { retorno?: string; parametros?: Record<string, string> } = {},
): Promise<{ error?: unknown; redirected?: boolean }> {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: provedor,
    options: {
      ...(opcoes.retorno ? { redirectTo: opcoes.retorno } : {}),
      ...(opcoes.parametros ? { queryParams: opcoes.parametros } : {}),
    },
  });
  if (error) return { error };
  // O Supabase devolve a URL do provedor; o navegador segue para ela.
  if (data.url && typeof window !== "undefined") {
    window.location.assign(data.url);
    return { redirected: true };
  }
  return { redirected: false };
}
