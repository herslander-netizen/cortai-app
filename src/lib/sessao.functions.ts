import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PERMISSOES } from "@/lib/permissoes";
import { IDENTIDADES, type Identidade } from "@/lib/aparencia";
import { SEGMENTOS_CONFIG, segmentoValido, type Segmento } from "@/lib/segmentos";
import { configPadrao, TEMAS } from "@/lib/pagina-config";
import { decidirContextos } from "@/lib/contextos";
import { mesmoEmail } from "@/lib/comparacao-exata";
import { escolherVinculo } from "@/lib/vinculo-ativo";

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
  tenantLogoUrl: string | null;
  tenantPaginaPublicada: boolean;
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
  /** Contextos da mesma conta: cliente e/ou negócio. Uma conta por e-mail. */
  contextos: { cliente: boolean; negocio: boolean };
  /** A pessoa já escolheu em qual contexto quer estar. */
  contextoEscolhido: boolean;
  /**
   * Conta com papel de admin da plataforma. Pode estar no painel do ADM (papel "admin") ou,
   * se escolheu o contexto "negocio" e tem vínculo ativo, no painel do negócio — e voltar.
   */
  adminDaPlataforma?: boolean;
};

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Cria o perfil na primeira entrada e concede admin se o e-mail estiver autorizado. */
async function garantirPerfil(userId: string, email: string | null, nome: string | null) {
  const db = await admin();
  const { data: perfil } = await db
    .from("perfis")
    .select("tipo, nome")
    .eq("user_id", userId)
    .maybeSingle();
  if (!perfil) {
    await db.from("perfis").insert({ user_id: userId, nome: nome ?? email?.split("@")[0] ?? null });
  }
  if (email) {
    // Comparação exata: o e-mail de quem entra nunca vira padrão de busca (`_`/`%` seriam curingas).
    const { data: autorizados } = await db
      .from("emails_admin_autorizados")
      .select("email")
      .limit(500);
    const autorizado = (autorizados ?? []).some((linha) => mesmoEmail(linha.email, email));
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

    const [{ data: papelAdmin }, { data: vinculos }, { data: perfil }, { count: fichas }] =
      await Promise.all([
        db.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
        db
          .from("tenant_usuarios")
          .select(
            "tenant_id, papel, permissoes, ativo, tenants(nome, slug, logo_url, identidade_app, fuso, segmento, modo)",
          )
          .eq("user_id", context.userId)
          .order("criado_em", { ascending: true }),
        db
          .from("perfis")
          .select("nome, tipo, tenant_ativo, contexto_ativo")
          .eq("user_id", context.userId)
          .maybeSingle(),
        db
          .from("clientes")
          .select("id", { count: "exact", head: true })
          .eq("user_id", context.userId),
      ]);

    // Uma conta pode ter vínculo com mais de uma barbearia: usa a escolhida, com o
    // primeiro vínculo ativo como padrão seguro — a mesma regra do servidor (`vinculoDoMembro`).
    const lista = vinculos ?? [];
    const vinculo = escolherVinculo(lista, perfil?.tenant_ativo);

    const escolha = (perfil?.tipo ?? tipo) as string;
    const contextos = decidirContextos({
      temVinculoAtivo: Boolean(vinculo?.ativo),
      tipoDoPerfil: escolha,
      fichasDeCliente: fichas ?? 0,
      contextoAtivo: perfil?.contexto_ativo ?? null,
    });
    const contextoAtivo = perfil?.contexto_ativo ?? null;
    const contextoEscolhido = contextoAtivo !== null;

    const nome = perfil?.nome ?? nomeMeta ?? null;
    const base = {
      userId: context.userId,
      email,
      nome,
      tenantId: null,
      tenantNome: null,
      tenantSlug: null,
      tenantLogoUrl: null,
      tenantPaginaPublicada: false,
      tenantFuso: null,
      identidadeApp: "moderno" as Identidade,
      segmento: "barbearia" as Segmento,
      tenantModo: "escuro" as const,
      papelNaEquipe: null,
      permissoes: [] as string[],
      acessoSuspenso: false,
      contextos,
      contextoEscolhido,
      adminDaPlataforma: Boolean(papelAdmin),
    };

    // Admin da plataforma entra no ADM, a não ser que tenha escolhido o painel do negócio
    // (contexto "negocio" com vínculo ativo) ou a área de cliente na tela /escolher. As funções
    // do servidor continuam conferindo vínculo e permissões em cada ação.
    const escolheuOutraArea =
      (contextoAtivo === "negocio" && vinculo?.ativo) || contextoAtivo === "cliente";
    if (papelAdmin && !escolheuOutraArea) {
      return { ...base, papel: "admin" as const };
    }
    // Conta com os dois contextos que escolheu "cliente": entra como cliente,
    // sem perder o negócio (troca sem sair da conta).
    if (contextos.negocio && contextos.cliente && contextoAtivo === "cliente") {
      return { ...base, papel: "cliente" as const };
    }
    if (vinculo && vinculo.ativo) {
      const t = vinculo.tenants as unknown as {
        nome: string;
        slug: string;
        logo_url: string | null;
        identidade_app: string;
        fuso: string | null;
        segmento: string;
        modo: string;
      } | null;
      const tenantLogoUrl = t?.logo_url
        ? ((await db.storage.from("tenant-logos").createSignedUrl(t.logo_url, 60 * 60)).data
            ?.signedUrl ?? null)
        : null;
      const { data: paginaPublica } = await db
        .from("tenant_page_configs")
        .select("published_config")
        .eq("tenant_id", vinculo.tenant_id)
        .maybeSingle();
      const tenantPaginaPublicada = Boolean(
        paginaPublica?.published_config &&
        Object.keys(paginaPublica.published_config as Record<string, unknown>).length,
      );
      const permissoes =
        vinculo.papel === "dono"
          ? PERMISSOES_DE_DONO
          : ((vinculo.permissoes as string[] | null) ?? []);
      return {
        ...base,
        papel: "barbeiro" as const,
        tenantId: vinculo.tenant_id,
        tenantNome: t?.nome ?? null,
        tenantSlug: t?.slug ?? null,
        tenantLogoUrl,
        tenantPaginaPublicada,
        tenantFuso: t?.fuso ?? null,
        identidadeApp: IDENTIDADES.includes(t?.identidade_app as Identidade)
          ? (t?.identidade_app as Identidade)
          : "moderno",
        segmento: segmentoValido(t?.segmento),
        tenantModo: t?.modo === "claro" || t?.modo === "sistema" ? t.modo : "escuro",
        papelNaEquipe: vinculo.papel,
        permissoes,
      };
    }
    if (vinculo && !vinculo.ativo) {
      // Acesso desativado por quem gerencia a equipe: continua logado, mas sem barbearia.
      if (contextos.cliente && contextoAtivo === "cliente") {
        return { ...base, papel: "cliente" as const, papelNaEquipe: vinculo.papel };
      }
      return {
        ...base,
        papel: "pendente" as const,
        papelNaEquipe: vinculo.papel,
        acessoSuspenso: true,
      };
    }
    const papel: Papel = contextos.cliente
      ? "cliente"
      : escolha === "barbeiro"
        ? "barbeiro"
        : "pendente";
    return { ...base, papel };
  });

/**
 * Troca de contexto sem sair da conta. "cliente" sempre pode ser ativado na
 * mesma conta (sem criar outra); "negocio" exige um vínculo ativo — o e-mail
 * nunca concede acesso administrativo sozinho.
 */
export const escolherContexto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z.object({ contexto: z.enum(["cliente", "negocio", "admin"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const db = await admin();
    // Voltar ao painel do ADM: só para quem tem o papel de admin (conferido no servidor).
    // Contexto vazio = padrão do admin.
    if (data.contexto === "admin") {
      const { data: ehAdmin } = await db.rpc("has_role", {
        _user_id: context.userId,
        _role: "admin",
      });
      if (ehAdmin !== true) throw new Error("Esta conta não tem acesso ao painel do ADM.");
      const { error } = await db
        .from("perfis")
        .update({ contexto_ativo: null })
        .eq("user_id", context.userId);
      if (error) throw new Error("Não foi possível trocar de painel agora.");
      return { ok: true };
    }
    if (data.contexto === "negocio") {
      const { data: vinculo } = await db
        .from("tenant_usuarios")
        .select("tenant_id")
        .eq("user_id", context.userId)
        .eq("ativo", true)
        .limit(1)
        .maybeSingle();
      if (!vinculo) throw new Error("Esta conta ainda não tem um negócio.");
    }
    const { data: perfil } = await db
      .from("perfis")
      .select("tipo")
      .eq("user_id", context.userId)
      .maybeSingle();
    const { error } = await db.from("perfis").upsert(
      {
        user_id: context.userId,
        contexto_ativo: data.contexto,
        // Ativar "cliente" pela primeira vez numa conta pendente registra o contexto.
        ...(data.contexto === "cliente" && (!perfil?.tipo || perfil.tipo === "pendente")
          ? { tipo: "cliente" }
          : {}),
      },
      { onConflict: "user_id" },
    );
    if (error) throw new Error("Não foi possível trocar de perfil agora.");
    return { ok: true };
  });

export const salvarIdentidadeApp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z.object({ identidade: z.enum(IDENTIDADES), tenantId: z.string().uuid() }).parse(input),
  )
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
    if (!vinculo) throw new Error("Apenas o dono pode alterar a identidade do negócio.");
    const { error } = await context.supabase
      .from("tenants")
      .update({ identidade_app: data.identidade })
      .eq("id", data.tenantId);
    if (error) throw new Error("Não foi possível salvar a identidade agora.");
    return { ok: true };
  });

export const definirTipoDePerfil = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({ tipo: z.enum(["cliente", "barbeiro"]), nome: z.string().trim().max(80).optional() })
      .parse(input),
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
  .validator((input: unknown) =>
    z
      .object({
        nome: z.string().trim().min(2).max(80),
        segmento: z.enum([
          "barbearia",
          "salao",
          "cabeleireiro",
          "esmalteria",
          "sobrancelha_cilios",
          "estetica",
          "outro",
        ]),
        documento: z
          .string()
          .trim()
          .refine(
            (v) => [11, 14].includes(v.replace(/\D/g, "").length),
            "Informe um CPF ou CNPJ válido.",
          ),
        telefone: z
          .string()
          .trim()
          .refine((v) => v.replace(/\D/g, "").length >= 10, "Informe um telefone com DDD."),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const diagnostico = (etapa: string, error: { code?: string; message?: string; details?: string; hint?: string } | null | undefined) => {
      // Nunca registrar CPF, telefone, token, nome do usuário ou chaves de ambiente.
      console.error("[criarBarbearia] Falha no fluxo", {
        etapa,
        userId: context.userId,
        code: error?.code ?? null,
        message: error?.message ?? null,
        details: error?.details ?? null,
        hint: error?.hint ?? null,
        supabaseUrlConfigurada: Boolean(process.env["SUPABASE_URL"]),
        serviceRoleConfigurada: Boolean(process.env["SUPABASE_SERVICE_ROLE_KEY"]),
        supabaseHost: (() => {
          try { return new URL(process.env["SUPABASE_URL"] ?? "").host; } catch { return null; }
        })(),
      });
    };
    let db: Awaited<ReturnType<typeof admin>>;
    try {
      db = await admin();
    } catch (error) {
      diagnostico("inicializar_cliente_admin", error instanceof Error ? { message: error.message } : null);
      throw new Error("Não foi possível conectar ao serviço de cadastro. Tente novamente.");
    }
    const { data: vinculo, error: erroConsultaVinculo } = await db
      .from("tenant_usuarios")
      .select("tenant_id")
      .eq("user_id", context.userId)
      .limit(1)
      .maybeSingle();
    if (erroConsultaVinculo) {
      diagnostico("consultar_vinculo_existente", erroConsultaVinculo);
      throw new Error("Não foi possível verificar seu negócio agora.");
    }
    if (vinculo) throw new Error("Sua conta já está ligada a um negócio.");
    const definicao = SEGMENTOS_CONFIG[data.segmento];
    const baseSlug =
      data.nome
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "negocio";
    const { data: slugExistente } = await db
      .from("tenants")
      .select("id")
      .eq("slug", baseSlug)
      .maybeSingle();
    const slug = slugExistente ? `${baseSlug}-${crypto.randomUUID().slice(0, 4)}` : baseSlug;
    const { data: tenant, error } = await db
      .from("tenants")
      .insert({
        nome: data.nome,
        slug,
        segmento: data.segmento,
        identidade_app: definicao.identidade,
        modo: definicao.modoPadrao,
        chips_ficha: definicao.chipsFicha,
        telefone: data.telefone.replace(/\D/g, ""),
        whatsapp: data.telefone.replace(/\D/g, ""),
      })
      .select("id")
      .single();
    if (error || !tenant) {
      // Diagnóstico no servidor: não expor detalhes do banco na interface.
      diagnostico("inserir_tenant", error);
      console.error("[criarBarbearia] Resultado da inserção", { returnedTenant: Boolean(tenant) });
      throw new Error("Não foi possível criar seu negócio agora.");
    }
    const tenantId = tenant.id;
    const { iniciarTesteGratis } = await import("@/lib/teste-gratis.server");
    const teste = await iniciarTesteGratis(tenantId, {
      documento: data.documento,
      telefone: data.telefone,
    }).catch(() => ({ emTeste: false, motivo: undefined }));
    const pagina = configPadrao({
      ...(definicao.temaPagina === "rose-creme"
        ? { tema: "rose-creme", cores: TEMAS["rose-creme"].cores, fonteTitulo: "serif" }
        : {}),
      experiencia: definicao.experienciaPadrao,
      versao: 2,
    });
    const { error: erroVinculo } = await db
      .from("tenant_usuarios")
      .insert({ tenant_id: tenantId, user_id: context.userId, papel: "dono" });
    if (erroVinculo) {
      diagnostico("vincular_dono", erroVinculo);
      await db.from("tenants").delete().eq("id", tenantId);
      throw new Error("Não foi possível liberar o acesso ao seu negócio.");
    }
    const { error: erroPagina } = await db
      .from("tenant_page_configs")
      .upsert(
        { tenant_id: tenantId, draft_config: { pagina }, published_config: { pagina } },
        { onConflict: "tenant_id" },
      );
    if (erroPagina) {
      diagnostico("salvar_configuracao_pagina", erroPagina);
      await db.from("tenant_usuarios").delete().eq("tenant_id", tenantId).eq("user_id", context.userId);
      await db.from("tenants").delete().eq("id", tenantId);
      throw new Error("Não foi possível preparar a página do negócio.");
    }
    const { error: erroPerfil } = await db
      .from("perfis")
      .upsert(
        { user_id: context.userId, tipo: "barbeiro", contexto_ativo: "negocio" },
        { onConflict: "user_id" },
      );
    if (erroPerfil) {
      diagnostico("atualizar_perfil", erroPerfil);
      await db.from("tenant_page_configs").delete().eq("tenant_id", tenantId);
      await db.from("tenant_usuarios").delete().eq("tenant_id", tenantId).eq("user_id", context.userId);
      await db.from("tenants").delete().eq("id", tenantId);
      throw new Error("O negócio foi iniciado, mas não foi possível configurar seu acesso. Tente novamente.");
    }
    return {
      tenantId: tenantId as string,
      identidade: definicao.identidade,
      modo: definicao.modoPadrao,
      emTeste: teste.emTeste,
      avisoDoTeste: teste.motivo ?? null,
    };
  });
