import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";

/** Resolve o endereço atual ou um endereço histórico para o mesmo negócio. */
export async function resolverTenantPorSlug(db: SupabaseClient<Database>, slug: string) {
  const { data, error } = await db.rpc("resolver_tenant_por_slug", {
    _slug: slug.trim().toLowerCase(),
  });
  if (error) throw new Error(error.message);
  return data?.[0] ?? null;
}
