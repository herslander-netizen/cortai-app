import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PERMISSOES } from "@/lib/permissoes";
import { IDENTIDADES, type Identidade } from "@/lib/aparencia";
import { SEGMENTOS_CONFIG, segmentoValido, type Segmento } from "@/lib/segmentos";
import { configPadrao, TEMAS } from "@/lib/pagina-config";

const PERMISSOES_DE_DONO = Object.keys(PERMISSOES);

export type Papel = "admin" | "barbeiro" | "cliente" | "pendente";

export type Sessao = {
  userId: string;
  email: string | null;
  nome: string | null;
  papel: Papel;
  tenantId: string | null;
  tenantNome: string | null;
  tenantSlug: string | null;
  /** Fuso da barbearia; todas as telas formatam horários nele. */
  tenantFuso: string | null;
  identidadeApp: Identidade;
  segmento: Segmento;
  tenantModo: "claro" | "escuro" | "sistema";
  /** Papel dentro da barbearia: dono, gerente, barbeiro ou recepcao. */
  papelNaEquipe: string | null;
  /** Permissões efetivas na barbearia (a checagem real acontece no servidor). */
  permissoes: string[];
  /** Vínculo existe, mas o acesso foi desativado por quem gerencia a equipe. */
  acessoSuspenso: boolean;
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

    const [{ data: papelAdmin }, { data: vinculos }, { data: perfil }] = await Promise.all([
      db.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
      db
        .from("tenant_usuarios")
        .select("tenant_id, papel, permissoes, ativo, tenants(nome, slug, identidade_app, fuso, segmento, modo)")
        .eq("user_id", context.userId),
      db.from("perfis").select("nome, tipo, tenant_ativo").eq("user_id", context.userId).maybeSingle(),
    ]);

    // Uma conta pode ter vínculo com mais de uma barbearia: usa a escolhida, com o
    // primeiro vínculo ativo como padrão seguro.
    const lista = vinculos ?? [];
    const escolhida = perfil?.tenant_ativo
      ? lista.find((v) => v.tenant_id === perfil.tenant_ativo && v.ativo)
      : undefined;
    const vinculo = escolhida ?? lista.find((v) => v.ativo) ?? lista[0] ?? null;

    const nome = perfil?.nome ?? nomeMeta ?? null;
    const base = {
      userId: context.userId,
      email,
      nome,
      tenantId: null,
      tenantNome: null,
      tenantSlug: null,
      tenantFuso: null,
      identidadeApp: "moderno" as Identidade,
      segmento: "barbearia" as Segmento,
      tenantModo: "escuro" as const,
      papelNaEquipe: null,
      permissoes: [] as string[],
      acessoSuspenso: false,
    };

    if (papelAdmin) {
      return { ...base, papel: "admin" as const };
    }
    if (vinculo && vinculo.ativo) {
      const t = vinculo.tenants as unknown as { nome: string; slug: string; identidade_app: string; fuso: string | null; segmento: string; modo: string } | null;
      const permissoes =
        vinculo.papel === "dono" ? PERMISSOES_DE_DONO : ((vinculo.permissoes as string[] | null) ?? []);
      return {
        ...base,
        papel: "barbeiro" as const,
        tenantId: vinculo.tenant_id,
        tenantNome: t?.nome ?? null,
        tenantSlug: t?.slug ?? null,
        tenantFuso: t?.fuso ?? null,
        identidadeApp: IDENTIDADES.includes(t?.identidade_app as Identidade) ? t?.identidade_app as Identidade : "moderno",
        segmento: segmentoValido(t?.segmento),
        tenantModo: t?.modo === "claro" || t?.modo === "sistema" ? t.modo : "escuro",
        papelNaEquipe: vinculo.papel,
        permissoes,
      };
    }
    if (vinculo && !vinculo.ativo) {
      // Acesso desativado por quem gerencia a equipe: continua logado, mas sem barbearia.
      return { ...base, papel: "pendente" as const, papelNaEquipe: vinculo.papel, acessoSuspenso: true };
    }
    const escolha = (perfil?.tipo ?? tipo) as string;
    const papel: Papel = escolha === "cliente" ? "cliente" : escolha === "barbeiro" ? "barbeiro" : "pendente";
    return { ...base, papel };
  });

export const salvarIdentidadeApp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ identidade: z.enum(IDENTIDADES), tenantId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: vinculo } = await context.supabase
      .from("tenant_usuarios")
      .select("tenant_id, papel, ativo")
      .eq("user_id", context.userId)
      .eq("papel", "dono")
      .eq("ativo", true)
      .eq("tenant_id", data.tenantId)
      .limit(1)
      .maybeSingle();
    if (!vinculo) throw new Error("Apenas o dono pode alterar a identidade da barbearia.");
    const { error } = await context.supabase
      .from("tenants")
      .update({ identidade_app: data.identidade })
      .eq("id", data.tenantId);
    if (error) throw new Error("Não foi possível salvar a identidade agora.");
    return { ok: true };
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
  .inputValidator((input: unknown) => z.object({ nome: z.string().trim().min(2).max(80), segmento: z.enum(["barbearia", "salao", "cabeleireiro", "esmalteria", "sobrancelha_cilios", "estetica", "outro"]) }).parse(input))
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { data: vinculo } = await db.from("tenant_usuarios").select("tenant_id").eq("user_id", context.userId).limit(1).maybeSingle();
    if (vinculo) throw new Error("Sua conta já está ligada a um negócio.");
    const definicao = SEGMENTOS_CONFIG[data.segmento];
    const baseSlug = data.nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "negocio";
    const { data: slugExistente } = await db.from("tenants").select("id").eq("slug", baseSlug).maybeSingle();
    const slug = slugExistente ? `${baseSlug}-${crypto.randomUUID().slice(0, 4)}` : baseSlug;
    const { data: tenant, error } = await db.from("tenants").insert({ nome: data.nome, slug, segmento: data.segmento, identidade_app: definicao.identidade, modo: definicao.modoPadrao }).select("id").single();
    if (error || !tenant) throw new Error("Não foi possível criar seu negócio agora.");
    const tenantId = tenant.id;
    const pagina = configPadrao(definicao.temaPagina === "rose-creme" ? { tema: "rose-creme", cores: TEMAS["rose-creme"].cores, fonteTitulo: "serif" } : undefined);
    const { error: erroVinculo } = await db.from("tenant_usuarios").insert({ tenant_id: tenantId, user_id: context.userId, papel: "dono" });
    if (erroVinculo) throw new Error("Não foi possível liberar o acesso ao seu negócio.");
    await db.from("tenant_page_configs").upsert({ tenant_id: tenantId, draft_config: { pagina }, published_config: { pagina } }, { onConflict: "tenant_id" });
    await db.from("perfis").upsert({ user_id: context.userId, tipo: "barbeiro" }, { onConflict: "user_id" });
    return { tenantId: tenantId as string, identidade: definicao.identidade, modo: definicao.modoPadrao };
  });
