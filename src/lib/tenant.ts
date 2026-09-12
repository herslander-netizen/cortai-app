/** Resolve a barbearia a partir do vínculo real do usuário — nunca de um id vindo da tela. */
export type ContextoAutenticado = { supabase: any; userId: string };

export async function tenantIdDoMembro(context: ContextoAutenticado): Promise<string> {
  const { data } = await context.supabase
    .from("tenant_usuarios")
    .select("tenant_id")
    .eq("user_id", context.userId)
    .limit(1)
    .maybeSingle();
  if (!data) throw new Error("Sua conta ainda não está ligada a uma barbearia.");
  return data.tenant_id as string;
}
