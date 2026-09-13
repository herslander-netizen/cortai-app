import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { confirmarSenhaDoUsuario } from "@/lib/reauth.server";
import { PERMISSOES, type PapelEquipe, type Permissao } from "@/lib/permissoes";
import { tenantIdDoMembro } from "@/lib/tenant";

const papelSchema = z.enum(["dono", "gerente", "barbeiro", "recepcao"]);
const permissaoSchema = z.enum(PERMISSOES);

async function contextoEquipe(context: any, permissao?: Permissao) {
  const tenantId = await tenantIdDoMembro(context);
  const { data: vinculo } = await context.supabase.from("tenant_usuarios")
    .select("papel, permissoes").eq("tenant_id", tenantId).eq("user_id", context.userId).maybeSingle();
  if (!vinculo) throw new Error("Acesso à barbearia não encontrado.");
  const permissoes = vinculo.papel === "dono" ? [...PERMISSOES] : (vinculo.permissoes ?? []) as Permissao[];
  if (permissao && !permissoes.includes(permissao)) throw new Error("Você não tem permissão para esta ação.");
  return { tenantId, papel: vinculo.papel as PapelEquipe, permissoes };
}

export const getMinhasPermissoes = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth])
  .handler(async ({ context }) => contextoEquipe(context));

export const getEquipe = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const acesso = await contextoEquipe(context, "gerenciar_permissoes");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: membros }, usuarios] = await Promise.all([
      supabaseAdmin.from("tenant_usuarios").select("id,user_id,papel,permissoes,criado_em").eq("tenant_id", acesso.tenantId).order("criado_em"),
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ]);
    const porId = new Map((usuarios.data.users ?? []).map((u) => [u.id, u.email ?? "Conta sem e-mail"]));
    return { ...acesso, membros: (membros ?? []).map((m) => ({ ...m, email: porId.get(m.user_id) ?? "Conta vinculada" })) };
  });

export const salvarMembroEquipe = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ email: z.string().email(), papel: papelSchema, permissoes: z.array(permissaoSchema), senha: z.string().min(1) }).parse(input))
  .handler(async ({ data, context }) => {
    const acesso = await contextoEquipe(context, "gerenciar_permissoes");
    await confirmarSenhaDoUsuario(context.claims as Record<string, unknown>, data.senha);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const usuarios = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const usuario = usuarios.data.users.find((u) => u.email?.toLowerCase() === data.email.toLowerCase());
    if (!usuario) throw new Error("Essa pessoa precisa criar uma conta no Cortaí antes de entrar na equipe.");
    const { data: outro } = await supabaseAdmin.from("tenant_usuarios").select("tenant_id").eq("user_id", usuario.id).neq("tenant_id", acesso.tenantId).maybeSingle();
    if (outro) throw new Error("Essa conta já pertence a outra barbearia.");
    const permissoes = data.papel === "dono" ? [...PERMISSOES] : data.permissoes;
    const { error } = await supabaseAdmin.from("tenant_usuarios").upsert({ tenant_id: acesso.tenantId, user_id: usuario.id, papel: data.papel, permissoes }, { onConflict: "tenant_id,user_id" });
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("auditoria_da_barbearia").insert({ tenant_id: acesso.tenantId, ator_user_id: context.userId, acao: "alterou_membro_equipe", alvo: usuario.id, detalhes: { papel: data.papel, permissoes } });
    return { ok: true };
  });

export const removerMembroEquipe = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ vinculoId: z.string().uuid(), senha: z.string().min(1) }).parse(input))
  .handler(async ({ data, context }) => {
    const acesso = await contextoEquipe(context, "gerenciar_permissoes");
    await confirmarSenhaDoUsuario(context.claims as Record<string, unknown>, data.senha);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: alvo } = await supabaseAdmin.from("tenant_usuarios").select("id,user_id,papel").eq("id", data.vinculoId).eq("tenant_id", acesso.tenantId).maybeSingle();
    if (!alvo) throw new Error("Membro não encontrado.");
    if (alvo.user_id === context.userId) throw new Error("Você não pode remover o próprio acesso.");
    if (alvo.papel === "dono") {
      const { count } = await supabaseAdmin.from("tenant_usuarios").select("id", { count: "exact", head: true }).eq("tenant_id", acesso.tenantId).eq("papel", "dono");
      if ((count ?? 0) <= 1) throw new Error("A barbearia precisa manter pelo menos um dono.");
    }
    await supabaseAdmin.from("tenant_usuarios").delete().eq("id", alvo.id).eq("tenant_id", acesso.tenantId);
    await supabaseAdmin.from("auditoria_da_barbearia").insert({ tenant_id: acesso.tenantId, ator_user_id: context.userId, acao: "removeu_membro_equipe", alvo: alvo.user_id, detalhes: {} });
    return { ok: true };
  });

export const getAuditoriaBarbearia = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const acesso = await contextoEquipe(context, "gerenciar_permissoes");
    const { data, error } = await context.supabase.from("auditoria_da_barbearia").select("id,acao,alvo,detalhes,criado_em,ator_user_id").eq("tenant_id", acesso.tenantId).order("criado_em", { ascending: false }).limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });