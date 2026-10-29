/**
 * Quem está falando com a Flow IA pelo PAINEL: papel, profissional ligado e permissões
 * efetivas, resolvidos no servidor pelo vínculo real (nunca por dado vindo da tela).
 * As permissões vêm de `has_tenant_permission` — a mesma fonte que as telas usam, já
 * com o teto do papel e a regra de recebimento do barbeiro.
 */
import type { ContextoAutenticado } from "@/lib/tenant";
import { permissoesUsadasNoPainel } from "./acoes.server";
import { papelDoPainel, type PapelDoPainel } from "./papel-do-painel";

export type AcessoDoPainel = {
  papel: PapelDoPainel;
  profissionalId: string | null;
  permissoes: string[];
};

export async function acessoDoPainel(
  context: ContextoAutenticado,
  tenantId: string,
  papelNaEquipe: string,
): Promise<AcessoDoPainel> {
  const papel = papelDoPainel(papelNaEquipe);
  const [permitidas, profissional] = await Promise.all([
    Promise.all(
      permissoesUsadasNoPainel().map(async (chave) => {
        const { data, error } = await context.supabase.rpc("has_tenant_permission", {
          _tenant_id: tenantId,
          _permission: chave,
        });
        return !error && data === true ? chave : null;
      }),
    ),
    papel === "profissional"
      ? context.supabase
          .from("profissionais")
          .select("id")
          .eq("tenant_id", tenantId)
          .eq("user_id", context.userId)
          .eq("ativo", true)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  return {
    papel,
    profissionalId: (profissional.data?.id as string | undefined) ?? null,
    permissoes: permitidas.filter((p): p is string => p !== null),
  };
}
