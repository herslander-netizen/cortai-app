import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type Papel = "admin" | "barbeiro" | "cliente" | "pendente";

export type Sessao = {
  userId: string;
  email: string | null;
  nome: string | null;
  papel: Papel;
  tenantId: string | null;
  tenantNome: string | null;
  tenantSlug: string | null;
};

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Cria o perfil na primeira entrada e concede admin se o e-mail estiver autorizado. */
async function garantirPerfil(userId: string, email: string | null, nome: string | null) {
  const db = await admin();
  const { data: perfil } = await db.from("perfis").select("tipo, nome").eq("user_id", userId).maybeSingle();
  if (!perfil) {
    await db.from("perfis").insert({ user_id: userId, nome: nome ?? email?.split("@")[0] ?? null });
  }
  if (email) {
    const { data: autorizado } = await db
      .from("emails_admin_autorizados")
      .select("email")
      .ilike("email", email)
      .maybeSingle();
    if (autorizado) {
      const { data: jaTem } = await db
        .from("user_roles")
        .select("id")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();
      if (!jaTem) await db.from("user_roles").insert({ user_id: userId, role: "admin" });
    }
  }
  return perfil?.tipo ?? "pendente";
}

export const getSessao = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Sessao> => {
    const claims = context.claims as Record<string, unknown>;
    const email = typeof claims["email"] === "string" ? (claims["email"] as string) : null;
    const metadata = (claims["user_metadata"] ?? {}) as Record<string, unknown>;
    const nomeMeta =
      typeof metadata["nome"] === "string"
        ? (metadata["nome"] as string)
        : typeof metadata["full_name"] === "string"
          ? (metadata["full_name"] as string)
          : null;

    const tipo = await garantirPerfil(context.userId, email, nomeMeta);
    const db = await admin();

    const [{ data: papelAdmin }, { data: vinculo }, { data: perfil }] = await Promise.all([
      db.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
      db
        .from("tenant_usuarios")
        .select("tenant_id, tenants(nome, slug)")
        .eq("user_id", context.userId)
        .limit(1)
        .maybeSingle(),
      db.from("perfis").select("nome, tipo").eq("user_id", context.userId).maybeSingle(),
    ]);

    const nome = perfil?.nome ?? nomeMeta ?? null;

    if (papelAdmin) {
      return { userId: context.userId, email, nome, papel: "admin", tenantId: null, tenantNome: null, tenantSlug: null };
    }
    if (vinculo) {
      const t = vinculo.tenants as unknown as { nome: string; slug: string } | null;
      return {
        userId: context.userId,
        email,
        nome,
        papel: "barbeiro",
        tenantId: vinculo.tenant_id,
        tenantNome: t?.nome ?? null,
        tenantSlug: t?.slug ?? null,
      };
    }
    const escolha = (perfil?.tipo ?? tipo) as string;
    const papel: Papel = escolha === "cliente" ? "cliente" : escolha === "barbeiro" ? "barbeiro" : "pendente";
    return { userId: context.userId, email, nome, papel, tenantId: null, tenantNome: null, tenantSlug: null };
  });

export const definirTipoDePerfil = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ tipo: z.enum(["cliente", "barbeiro"]), nome: z.string().trim().max(80).optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { error } = await db
      .from("perfis")
      .upsert(
        { user_id: context.userId, tipo: data.tipo, ...(data.nome ? { nome: data.nome } : {}) },
        { onConflict: "user_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const criarBarbearia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ nome: z.string().trim().min(2).max(80) }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: tenantId, error } = await context.supabase.rpc("criar_barbearia", { _nome: data.nome });
    if (error) {
      throw new Error(
        error.message.includes("ja vinculado")
          ? "Sua conta já está ligada a uma barbearia."
          : "Não foi possível criar a barbearia agora.",
      );
    }
    const db = await admin();
    await db.from("perfis").upsert({ user_id: context.userId, tipo: "barbeiro" }, { onConflict: "user_id" });
    return { tenantId: tenantId as unknown as string };
  });
