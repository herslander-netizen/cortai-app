import { createClient } from "@supabase/supabase-js";

import { tenantIdDoMembro } from "@/lib/tenant";

type AuthContext = { getToken(): string | null; getUserId(): string | null };

type RuntimeGlobals = typeof globalThis & {
  process?: { env?: Record<string, string | undefined> };
};

function env(names: readonly string[]): string | undefined {
  const runtime = globalThis as RuntimeGlobals;
  for (const name of names) {
    const v = runtime.process?.env?.[name]?.trim();
    if (v) return v;
  }
  return undefined;
}

/** Cliente que age como o usuário conectado: RLS e multi-tenant valem normalmente. */
export function supabaseForUser(auth: AuthContext) {
  const token = auth.getToken();
  if (!token) throw new Error("Conexão sem usuário autenticado.");
  const url = env(["SUPABASE_URL", "VITE_SUPABASE_URL"]) ?? import.meta.env["VITE_SUPABASE_URL"];
  const key =
    env(["SUPABASE_PUBLISHABLE_KEY", "VITE_SUPABASE_PUBLISHABLE_KEY"]) ??
    import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Configuração do backend ausente.");
  return createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Descobre o negócio pelo vínculo real do usuário, nunca por parâmetro. */
export async function tenantDoUsuario(auth: AuthContext) {
  const db = supabaseForUser(auth);
  const tenantId = await tenantIdDoMembro({ supabase: db, userId: auth.getUserId() ?? "" }).catch(() => {
    throw new Error("Sua conta ainda não está ligada a um negócio no Cortaí.");
  });
  return { db, tenantId };
}
