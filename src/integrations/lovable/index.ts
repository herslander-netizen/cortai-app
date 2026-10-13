import { supabase } from "../supabase/client";

type OAuthProvider = "google" | "apple";
type SignInOptions = {
  redirect_uri?: string;
  extraParams?: Record<string, string>;
};

/**
 * Compatibilidade temporária com os pontos de entrada da interface antiga.
 * O fluxo OAuth passa a ser provido pelo próprio Supabase, sem a sessão
 * intermediada por Lovable. Os provedores e URLs de retorno precisam estar
 * habilitados na configuração de Auth do projeto Supabase usado no ambiente.
 */
export const lovable = {
  auth: {
    signInWithOAuth: async (provider: OAuthProvider, opts?: SignInOptions) => {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          ...(opts?.redirect_uri ? { redirectTo: opts.redirect_uri } : {}),
          ...(opts?.extraParams ? { queryParams: opts.extraParams } : {}),
        },
      });

      if (error) return { error };

      // Supabase devolve a URL do provedor; encaminhamos o navegador para ela.
      if (data.url && typeof window !== "undefined") {
        window.location.assign(data.url);
        return { redirected: true };
      }

      return { redirected: false };
    },
  },
};
