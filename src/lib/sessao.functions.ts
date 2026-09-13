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

/**
 * Lê o essencial da sessão em poucas idas ao banco (antes eram até sete).
 * Também cria o perfil na primeira entrada e concede admin quando o e-mail
 * está na lista autorizada.
 */
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

    const db = await admin();
    const [{ data: perfil }, { data: papelAdmin }, { data: vinculo }, { data: autorizado }] =
      await Promise.all([
        db.from("perfis").select("nome, tipo").eq("user_id", context.userId).maybeSingle(),
        db.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
        db
          .from("tenant_usuarios")
          .select("tenant_id, tenants(nome, slug)")
          .eq("user_id", context.userId)
          .limit(1)
          .maybeSingle(),
        email
          ? db.from("emails_admin_autorizados").select("email").ilike("email", email).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

    if (!perfil) {
      await db.from("perfis").insert({ user_id: context.userId, nome: nomeMeta ?? email?.split("@")[0] ?? null });
    }

    let ehAdmin = Boolean(papelAdmin);
    if (autorizado && !ehAdmin) {
      await db.from("user_roles").upsert(
        { user_id: context.userId, role: "admin" },
        { onConflict: "user_id,role", ignoreDuplicates: true },
      );
      ehAdmin = true;
    }

    const nome = perfil?.nome ?? nomeMeta ?? null;

    if (ehAdmin) {
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
    const escolha = (perfil?.tipo ?? "pendente") as string;
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
