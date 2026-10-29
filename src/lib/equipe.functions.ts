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
  aceitoEm: string | null;
};

/** Traduz os erros técnicos das funções do banco para o barbeiro. */
function mensagem(bruta: string): string {
  const m = bruta.toLowerCase();
  if (m.includes("sem permissao")) return "Você não tem permissão para gerenciar a equipe.";
  if (m.includes("conta nao encontrada")) {
    return "Ainda não existe uma conta Flow com esse e-mail. Peça para a pessoa criar a conta e tente de novo.";
  }
  if (m.includes("ja esta ligada")) return "Essa conta já está ligada a um negócio.";
  if (m.includes("somente o dono")) return "Só o proprietário pode alterar esse acesso.";
  if (m.includes("nao e possivel conceder"))
    return "Você não pode conceder uma permissão que não tem.";
  if (m.includes("pelo menos um dono"))
    return "O negócio precisa de pelo menos um proprietário ativo.";
  if (m.includes("proprio acesso")) return "Você não pode alterar o seu próprio acesso por aqui.";
  if (m.includes("membro nao encontrado")) return "Esse acesso não existe mais.";
  return "Não foi possível concluir agora. Tente de novo.";
}

export const listarEquipe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MembroDaEquipe[]> => {
    const tenantId = await tenantIdDoMembro(context);
    const { data, error } = await context.supabase.rpc("equipe_do_tenant", {
      _tenant_id: tenantId,
    });
    if (error) throw new Error(mensagem(error.message));
    return (data ?? []).map((linha: Record<string, unknown>) => ({
      userId: linha["user_id"] as string,
      email: (linha["email"] as string | null) ?? null,
      nome: (linha["nome"] as string | null) ?? null,
      papel: linha["papel"] as string,
      permissoes: (linha["permissoes"] as string[] | null) ?? [],
      ativo: Boolean(linha["ativo"]),
      criadoEm: linha["criado_em"] as string,
      aceitoEm: (linha["aceito_em"] as string | null) ?? null,
    }));
  });

/**
 * Convida alguém pelo e-mail. Se a pessoa ainda não tem conta Flow, o
 * próprio serviço de autenticação envia o convite por e-mail e a conta é
 * criada — depois o vínculo com a barbearia é feito pelas regras do banco.
 */
export const convidarMembro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        email: z.string().trim().email(),
        papel: z.enum(["gerente", "barbeiro", "recepcao"]),
        redirectTo: z.string().url(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const tenantId = await tenantIdDoMembro(context);

    const vincular = () =>
      context.supabase.rpc("convidar_membro", {
        _tenant_id: tenantId,
        _email: data.email,
        _papel: data.papel,
      });

    const primeira = await vincular();
    if (!primeira.error) return { ok: true, enviouEmail: false };
    if (!primeira.error.message.toLowerCase().includes("conta nao encontrada")) {
      throw new Error(mensagem(primeira.error.message));
    }

    // Sem conta ainda: dispara o convite por e-mail e cria o acesso.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const convite = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, {
      redirectTo: data.redirectTo,
    });
    if (convite.error) {
      throw new Error("Não foi possível enviar o convite para esse e-mail. Confira o endereço.");
    }
    const segunda = await vincular();
    if (segunda.error) throw new Error(mensagem(segunda.error.message));
    return { ok: true, enviouEmail: true };
  });

/** O que a pessoa convidada vê ao entrar pela primeira vez. */
export const meuConvite = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("meu_convite");
    if (error) throw new Error("Não foi possível carregar o seu acesso agora.");
    const linha = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | undefined;
    if (!linha) return null;
    return {
      barbearia: (linha["barbearia"] as string | null) ?? "seu negócio",
      papel: linha["papel"] as string,
      permissoes: (linha["permissoes"] as string[] | null) ?? [],
      ativo: Boolean(linha["ativo"]),
      aceitoEm: (linha["aceito_em"] as string | null) ?? null,
    };
  });

export const confirmarMeuAcesso = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase.rpc("confirmar_meu_acesso");
    if (error) throw new Error(mensagem(error.message));
    return { ok: true };
  });

export const salvarAcessoDoMembro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
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
  .validator((input: unknown) => z.object({ userId: z.string().uuid() }).parse(input))
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
  .validator((input: unknown) =>
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

/** A barbearia libera (ou não) o barbeiro para receber pagamento. Checado no banco. */
export const getBarbeiroRecebe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const tenantId = await tenantIdDoMembro(context);
    const { data } = await context.supabase
      .from("configuracoes_financeiras")
      .select("barbeiro_recebe")
      .eq("tenant_id", tenantId)
      .maybeSingle();
    return { ativo: Boolean((data as { barbeiro_recebe?: boolean } | null)?.barbeiro_recebe) };
  });

export const definirBarbeiroRecebe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ ativo: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    const tenantId = await tenantIdDoMembro(context);
    const { error } = await (context.supabase as any).rpc("definir_barbeiro_recebe", {
      _tenant: tenantId,
      _valor: data.ativo,
    });
    if (error) throw new Error("Você não tem permissão para mudar essa regra.");
    return { ok: true };
  });
