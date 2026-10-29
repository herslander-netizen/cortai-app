/** Resolve a barbearia a partir do vínculo real do usuário — nunca de um id vindo da tela. */
import { escolherVinculo } from "@/lib/vinculo-ativo";

export type ContextoAutenticado = { supabase: any; userId: string };

/**
 * Vínculo da pessoa logada com o negócio em uso: o escolhido em `perfis.tenant_ativo`
 * (se o acesso está ativo), senão o primeiro acesso ativo — a mesma regra de `getSessao`,
 * para a tela e o servidor nunca apontarem para negócios diferentes.
 */
export async function vinculoDoMembro(
  context: ContextoAutenticado,
): Promise<{ tenantId: string; papel: string }> {
  const [{ data: vinculos }, { data: perfil }] = await Promise.all([
    context.supabase
      .from("tenant_usuarios")
      .select("tenant_id, papel, ativo")
      .eq("user_id", context.userId)
      .order("criado_em", { ascending: true }),
    context.supabase
      .from("perfis")
      .select("tenant_ativo")
      .eq("user_id", context.userId)
      .maybeSingle(),
  ]);
  const vinculo = escolherVinculo(
    (vinculos ?? []) as { tenant_id: string; papel: string; ativo: boolean }[],
    (perfil?.tenant_ativo as string | null | undefined) ?? null,
  );
  // Acesso suspenso nunca vale, mesmo que a leitura ainda o devolva.
  if (!vinculo || !vinculo.ativo) throw new Error("Sua conta ainda não está ligada a um negócio.");
  const tenantId = vinculo.tenant_id;
  const { data: tenant } = await context.supabase
    .from("tenants")
    .select("ativo")
    .eq("id", tenantId)
    .maybeSingle();
  if (tenant && tenant.ativo === false) {
    throw new Error("Este negócio está desativado. Fale com o suporte do Flow para reativar.");
  }
  return { tenantId, papel: vinculo.papel };
}

export async function tenantIdDoMembro(context: ContextoAutenticado): Promise<string> {
  return (await vinculoDoMembro(context)).tenantId;
}

/**
 * Autorização real das permissões de equipe: roda no servidor, pelo vínculo
 * ativo do usuário com a barbearia. Esconder botão na tela não basta.
 */
export async function exigirPermissao(
  context: ContextoAutenticado,
  tenantId: string,
  chave: string,
): Promise<void> {
  const { data, error } = await context.supabase.rpc("has_tenant_permission", {
    _tenant_id: tenantId,
    _permission: chave,
  });
  if (error || !data) {
    throw new Error("Você não tem permissão para esta ação. Fale com o responsável pelo negócio.");
  }
}
