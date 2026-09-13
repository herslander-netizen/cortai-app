import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { tenantIdDoMembro } from "@/lib/tenant";

export type MembroDaEquipe = {
  userId: string;
  email: string | null;
  nome: string | null;
  papel: string;
  permissoes: string[];
  ativo: boolean;
  criadoEm: string;
};

/** Traduz os erros técnicos das funções do banco para o barbeiro. */
function mensagem(bruta: string): string {
  const m = bruta.toLowerCase();
  if (m.includes("sem permissao")) return "Você não tem permissão para gerenciar a equipe.";
  if (m.includes("conta nao encontrada")) {
    return "Ainda não existe uma conta Cortaí com esse e-mail. Peça para a pessoa criar a conta e tente de novo.";
  }
  if (m.includes("ja esta ligada")) return "Essa conta já está ligada a uma barbearia.";
  if (m.includes("somente o dono")) return "Só o proprietário pode alterar esse acesso.";
  if (m.includes("nao e possivel conceder")) return "Você não pode conceder uma permissão que não tem.";
  if (m.includes("pelo menos um dono")) return "A barbearia precisa de pelo menos um proprietário ativo.";
  if (m.includes("proprio acesso")) return "Você não pode alterar o seu próprio acesso por aqui.";
  if (m.includes("membro nao encontrado")) return "Esse acesso não existe mais.";
  return "Não foi possível concluir agora. Tente de novo.";
}

export const listarEquipe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MembroDaEquipe[]> => {
    const tenantId = await tenantIdDoMembro(context);
    const { data, error } = await context.supabase.rpc("equipe_do_tenant", { _tenant_id: tenantId });
    if (error) throw new Error(mensagem(error.message));
    return (data ?? []).map((linha: Record<string, unknown>) => ({
      userId: linha["user_id"] as string,
      email: (linha["email"] as string | null) ?? null,
      nome: (linha["nome"] as string | null) ?? null,
      papel: linha["papel"] as string,
      permissoes: (linha["permissoes"] as string[] | null) ?? [],
      ativo: Boolean(linha["ativo"]),
      criadoEm: linha["criado_em"] as string,
    }));
  });

export const convidarMembro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        email: z.string().trim().email(),
        papel: z.enum(["gerente", "barbeiro", "recepcao"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const tenantId = await tenantIdDoMembro(context);
    const { error } = await context.supabase.rpc("convidar_membro", {
      _tenant_id: tenantId,
      _email: data.email,
      _papel: data.papel,
    });
    if (error) throw new Error(mensagem(error.message));
    return { ok: true };
  });

export const salvarAcessoDoMembro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        userId: z.string().uuid(),
        papel: z.enum(["dono", "gerente", "barbeiro", "recepcao"]),
        permissoes: z.array(z.string()).max(40),
        ativo: z.boolean(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const tenantId = await tenantIdDoMembro(context);
    const { error } = await context.supabase.rpc("definir_acesso_membro", {
      _tenant_id: tenantId,
      _user_id: data.userId,
      _papel: data.papel,
      _permissoes: data.permissoes,
      _ativo: data.ativo,
    });
    if (error) throw new Error(mensagem(error.message));
    return { ok: true };
  });

export const removerMembro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const tenantId = await tenantIdDoMembro(context);
    const { error } = await context.supabase.rpc("remover_membro", {
      _tenant_id: tenantId,
      _user_id: data.userId,
    });
    if (error) throw new Error(mensagem(error.message));
    return { ok: true };
  });

/**
 * Dispara a recuperação de acesso do funcionário pelo próprio mecanismo de
 * autenticação. O gestor nunca vê nem define a senha de outra pessoa.
 */
export const enviarRecuperacaoParaMembro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ userId: z.string().uuid(), redirectTo: z.string().url() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const tenantId = await tenantIdDoMembro(context);
    const { data: podeGerenciar } = await context.supabase.rpc("has_tenant_permission", {
      _tenant_id: tenantId,
      _permission: "gerenciar_permissoes",
    });
    if (!podeGerenciar) throw new Error("Você não tem permissão para gerenciar a equipe.");

    const { data: equipe, error: erroEquipe } = await context.supabase.rpc("equipe_do_tenant", {
      _tenant_id: tenantId,
    });
    if (erroEquipe) throw new Error(mensagem(erroEquipe.message));
    const membro = (equipe ?? []).find(
      (linha: Record<string, unknown>) => linha["user_id"] === data.userId,
    ) as { email?: string | null } | undefined;
    if (!membro?.email) throw new Error("Essa pessoa não tem e-mail cadastrado.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.auth.resetPasswordForEmail(membro.email, { redirectTo: data.redirectTo });
    await context.supabase.rpc("registrar_auditoria_barbearia", {
      _tenant_id: tenantId,
      _acao: "equipe.recuperacao_enviada",
      _alvo: data.userId,
      _detalhes: {},
    });
    return { ok: true };
  });
