type ClienteDeSlug = {
  rpc: (nome: "resolver_tenant_por_slug", args: { _slug: string }) => Promise<{
    data: { tenant_id: string; slug_atual: string }[] | null;
    error: { message: string } | null;
  }>;
};

/** Resolve o endereço atual ou um endereço histórico para o mesmo negócio. */
export async function resolverTenantPorSlug(db: ClienteDeSlug, slug: string) {
  const { data, error } = await db.rpc("resolver_tenant_por_slug", {
    _slug: slug.trim().toLowerCase(),
  });
  if (error) throw new Error(error.message);
  return data?.[0] ?? null;
}