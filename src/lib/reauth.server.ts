import { createClient } from "@supabase/supabase-js";

/**
 * Revalida a senha da conta autenticada antes de uma exclusão permanente.
 * A senha só existe dentro desta função: não é gravada, logada nem devolvida.
 */
export async function confirmarSenhaDoUsuario(claims: Record<string, unknown>, senha: string): Promise<void> {
  const email = typeof claims["email"] === "string" ? (claims["email"] as string) : null;
  const sub = typeof claims["sub"] === "string" ? (claims["sub"] as string) : null;
  const appMeta = (claims["app_metadata"] ?? {}) as Record<string, unknown>;
  const providers = Array.isArray(appMeta["providers"])
    ? (appMeta["providers"] as unknown[]).filter((p): p is string => typeof p === "string")
    : typeof appMeta["provider"] === "string"
      ? [appMeta["provider"] as string]
      : [];

  if (!email || !sub) {
    throw new Error("Não foi possível confirmar sua identidade. Entre novamente e tente de novo.");
  }
  if (providers.length > 0 && !providers.includes("email")) {
    throw new Error(
      "Sua conta entra por provedor externo e não tem senha no CortAI. Entre novamente pela sua conta para excluir definitivamente.",
    );
  }
  if (!senha) throw new Error("Senha incorreta. Tente novamente.");

  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Não foi possível confirmar sua identidade agora.");

  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });

  const { data, error } = await client.auth.signInWithPassword({ email, password: senha });
  if (error || !data.user || data.user.id !== sub) {
    throw new Error("Senha incorreta. Tente novamente.");
  }
  try {
    await client.auth.signOut();
  } catch {
    /* sessão temporária, nada a limpar */
  }
}
