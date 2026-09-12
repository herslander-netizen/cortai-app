import type { ContextoAutenticado } from "@/lib/tenant";

export type TenantCliente = { id: string; nome: string; rotulo_carteira: string | null };
export type ClienteAtual = { id: string; nome: string; limite_fiado_centavos: number };

/**
 * Resolve (e cria na primeira vez) a ficha de cliente ligada à conta autenticada.
 * Nada aqui depende de id enviado pela tela.
 */
export async function clienteDoUsuario(
  context: ContextoAutenticado,
): Promise<{ db: any; tenant: TenantCliente; cliente: ClienteAtual }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin;

  const { data: existente } = await db
    .from("clientes")
    .select("id, nome, limite_fiado_centavos, tenants(id, nome, rotulo_carteira, ativo)")
    .eq("user_id", context.userId)
    .limit(1)
    .maybeSingle();

  if (existente && (existente as any).tenants) {
    const t = (existente as any).tenants as TenantCliente;
    return {
      db,
      tenant: { id: t.id, nome: t.nome, rotulo_carteira: t.rotulo_carteira },
      cliente: {
        id: existente.id,
        nome: existente.nome,
        limite_fiado_centavos: existente.limite_fiado_centavos,
      },
    };
  }

  const { data: tenant } = await db
    .from("tenants")
    .select("id, nome, rotulo_carteira")
    .eq("ativo", true)
    .order("criado_em", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!tenant) throw new Error("Nenhuma barbearia disponível no momento.");

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

  return { db, tenant, cliente: novo };
}
