import type { ContextoAutenticado } from "@/lib/tenant";

export type TenantCliente = {
  id: string;
  nome: string;
  rotulo_carteira: string | null;
  slug?: string;
};
export type ClienteAtual = { id: string; nome: string; limite_fiado_centavos: number };

export type ContextoBarbearia = { slug?: string | null | undefined };

export const SEM_BARBEARIA = "Escolha uma barbearia para continuar.";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Resolve a barbearia pelo slug, garantindo que ela existe e está ativa. */
async function tenantPorSlug(db: any, slug: string): Promise<TenantCliente> {
  const { data } = await db
    .from("tenants")
    .select("id, nome, slug, rotulo_carteira")
    .eq("slug", slug)
    .eq("ativo", true)
    .maybeSingle();
  if (!data) throw new Error("Negócio não encontrado ou indisponível.");
  return data as TenantCliente;
}

/** Fichas do usuário em barbearias ativas, mais recente primeiro. */
export async function fichasDoUsuario(context: ContextoAutenticado) {
  const db = await admin();
  const { data } = await db
    .from("clientes")
    .select(
      "id, nome, limite_fiado_centavos, criado_em, tenants!inner(id, nome, slug, rotulo_carteira, ativo)",
    )
    .eq("user_id", context.userId)
    .eq("tenants.ativo", true)
    .order("criado_em", { ascending: false });
  const linhas = (data ?? []) as any[];
  return {
    db,
    fichas: linhas.map((linha) => ({
      cliente: {
        id: linha.id,
        nome: linha.nome,
        limite_fiado_centavos: linha.limite_fiado_centavos,
      } as ClienteAtual,
      tenant: {
        id: linha.tenants.id,
        nome: linha.tenants.nome,
        slug: linha.tenants.slug,
        rotulo_carteira: linha.tenants.rotulo_carteira,
      } as TenantCliente,
    })),
  };
}

/**
 * Resolve a ficha do cliente dentro do contexto de barbearia informado.
 * Com slug: usa (e cria na primeira vez) a ficha NAQUELA barbearia.
 * Sem slug: usa apenas uma ficha que já exista — nunca escolhe uma barbearia por conta própria.
 */
export async function clienteDoUsuarioOpcional(
  context: ContextoAutenticado,
  ctx?: ContextoBarbearia,
): Promise<{ db: any; tenant: TenantCliente; cliente: ClienteAtual } | null> {
  const slug = ctx?.slug?.trim() || null;
  const { db, fichas } = await fichasDoUsuario(context);

  if (slug) {
    const tenant = await tenantPorSlug(db, slug);
    const existente = fichas.find((f) => f.tenant.id === tenant.id);
    if (existente) return { db, tenant, cliente: existente.cliente };

    const { data: perfil } = await db
      .from("perfis")
      .select("nome, telefone")
      .eq("user_id", context.userId)
      .maybeSingle();

    const { data: novo, error } = await db
      .from("clientes")
      .insert({
        tenant_id: tenant.id,
        nome: perfil?.nome ?? "Cliente",
        telefone: perfil?.telefone ?? "",
        user_id: context.userId,
        origem: "app",
      })
      .select("id, nome, limite_fiado_centavos")
      .single();
    if (error) throw new Error(error.message);
    return { db, tenant, cliente: novo as ClienteAtual };
  }

  // Sem uma escolha explícita, só é seguro continuar quando existe exatamente
  // uma ficha. Com várias, a interface deve pedir que a pessoa escolha.
  if (fichas.length !== 1) return null;
  const unica = fichas[0];
  if (!unica) return null;
  return { db, tenant: unica.tenant, cliente: unica.cliente };
}

export async function clienteDoUsuario(
  context: ContextoAutenticado,
  ctx?: ContextoBarbearia,
): Promise<{ db: any; tenant: TenantCliente; cliente: ClienteAtual }> {
  const resolvido = await clienteDoUsuarioOpcional(context, ctx);
  if (!resolvido) throw new Error(SEM_BARBEARIA);
  return resolvido;
}
