import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

async function adminContext(context: { supabase: any; userId: string }) {
  const { data: allowed } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!allowed) throw new Error("Acesso exclusivo do dono da plataforma.");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function phi(feature: boolean[], paid: boolean[]) {
  if (feature.length < 3) return null;
  let a = 0, b = 0, c = 0, d = 0;
  feature.forEach((on, i) => {
    if (on && paid[i]) a += 1;
    else if (on) b += 1;
    else if (paid[i]) c += 1;
    else d += 1;
  });
  const denominator = Math.sqrt((a + b) * (c + d) * (a + c) * (b + d));
  return denominator ? (a * d - b * c) / denominator : null;
}

export type AdminTenant = {
  id: string; nome: string; plano: string; ciclo: string; desconto: number;
  telefone: string | null; whatsapp: string | null; ativo: boolean;
  ultimoAcesso: string | null; agendamentos: number; regrasAtivas: number;
  risco: boolean; motivosRisco: string[];
};

export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await adminContext(context);
    const [tenantsRes, configRes, historyRes, rulesRes, queueRes, movesRes] = await Promise.all([
      db.from("tenants").select("id, plano, ciclo, desconto_percentual, ativo"),
      db.from("configuracoes_da_plataforma").select("preco_essencial_centavos, preco_pro_centavos, preco_studio_centavos").single(),
      db.from("historico_de_plano").select("tenant_id, plano_de, plano_para"),
      db.from("regras_de_plano").select("tenant_id, tipo, ativo"),
      db.from("fila_de_espera").select("tenant_id"),
      db.from("movimentos").select("origem, carteiras(tenant_id)").eq("origem", "pacote"),
    ]);
    const tenants = tenantsRes.data ?? [];
    const config = configRes.data;
    const prices: Record<string, number> = {
      essencial: config?.preco_essencial_centavos ?? 0,
      pro: config?.preco_pro_centavos ?? 0,
      studio: config?.preco_studio_centavos ?? 0,
    };
    const receita = tenants.filter((t) => t.ativo).reduce((sum, t) => {
      const annualFactor = t.ciclo === "anual" ? 0.8 : 1;
      const couponFactor = 1 - t.desconto_percentual / 100;
      return sum + Math.round((prices[t.plano] ?? 0) * annualFactor * couponFactor);
    }, 0);
    const history = historyRes.data ?? [];
    const conversions = history.filter((h) => h.plano_de === "essencial" && h.plano_para !== "essencial");
    const cancellations = history.filter((h) => h.plano_de !== "essencial" && h.plano_para === "essencial");
    const conversionBase = new Set(history.filter((h) => h.plano_de === "essencial").map((h) => h.tenant_id)).size;
    const cancelBase = conversions.length + cancellations.length;
    const paid = tenants.map((t) => t.ativo && t.plano !== "essencial");
    const activeRules = rulesRes.data ?? [];
    const queueTenants = new Set((queueRes.data ?? []).map((q) => q.tenant_id));
    const packageTenants = new Set((movesRes.data ?? []).map((m: any) => m.carteiras?.tenant_id).filter(Boolean));
    const signals = [
      { label: "Ligou a fidelidade", values: tenants.map((t) => activeRules.some((r) => r.tenant_id === t.id && r.tipo === "fidelidade" && r.ativo)) },
      { label: "Vendeu um pacote", values: tenants.map((t) => packageTenants.has(t.id)) },
      { label: "Usou a fila de espera", values: tenants.map((t) => queueTenants.has(t.id)) },
    ].map((item) => ({ label: item.label, correlation: phi(item.values, paid), sample: item.values.filter(Boolean).length }))
      .sort((a, b) => (b.correlation ?? -2) - (a.correlation ?? -2));
    return {
      receitaCentavos: receita,
      totalBarbearias: tenants.length,
      conversionPct: conversionBase ? Math.round((new Set(conversions.map((h) => h.tenant_id)).size / conversionBase) * 100) : 0,
      conversionHasData: conversionBase > 0,
      cancellationPct: cancelBase ? Math.round((cancellations.length / cancelBase) * 100) : 0,
      cancellationHasData: cancelBase > 0,
      revenueHasData: tenants.length > 0 && Object.values(prices).some((value) => value > 0),
      signals,
    };
  });

export const getAdminTenants = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminTenant[]> => {
    const db = await adminContext(context);
    const [tenantsRes, bookingsRes, rulesRes] = await Promise.all([
      db.from("tenants").select("id, nome, plano, ciclo, desconto_percentual, telefone, whatsapp, ativo, ultimo_acesso_em").order("nome"),
      db.from("agendamentos").select("tenant_id"),
      db.from("regras_de_plano").select("tenant_id, ativo"),
    ]);
    const bookings = bookingsRes.data ?? [];
    const rules = rulesRes.data ?? [];
    const cutoff = Date.now() - 7 * 86400000;
    return (tenantsRes.data ?? []).map((tenant) => {
      const motivos: string[] = [];
      if (!tenant.ultimo_acesso_em) motivos.push("Nunca acessou o painel.");
      else if (new Date(tenant.ultimo_acesso_em).getTime() < cutoff) motivos.push("Sem acesso ao painel há mais de 7 dias.");
      const activeRules = rules.filter((r) => r.tenant_id === tenant.id && r.ativo).length;
      if (!activeRules) motivos.push("Nunca ativou uma regra de plano.");
      return {
        id: tenant.id, nome: tenant.nome, plano: tenant.plano, ciclo: tenant.ciclo,
        desconto: tenant.desconto_percentual, telefone: tenant.telefone, whatsapp: tenant.whatsapp,
        ativo: tenant.ativo, ultimoAcesso: tenant.ultimo_acesso_em,
        agendamentos: bookings.filter((b) => b.tenant_id === tenant.id).length,
        regrasAtivas: activeRules, risco: motivos.length > 0, motivosRisco: motivos,
      };
    });
  });

export const getRetentionContacts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ tenantId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const db = await adminContext(context);
    const { data: rows } = await db.from("contatos_de_retencao").select("id, canal, resultado, observacao, criado_em").eq("tenant_id", data.tenantId).order("criado_em", { ascending: false });
    return rows ?? [];
  });

export const addRetentionContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ tenantId: z.string().uuid(), canal: z.enum(["whatsapp", "telefone"]), resultado: z.enum(["sem_resposta", "conversou", "recuperou", "cancelou"]), observacao: z.string().trim().max(1000).nullable() }).parse(input))
  .handler(async ({ data, context }) => {
    const db = await adminContext(context);
    const { error } = await db.from("contatos_de_retencao").insert({ tenant_id: data.tenantId, canal: data.canal, resultado: data.resultado, observacao: data.observacao, criado_por: context.userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getPlatformConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await adminContext(context);
    const { data } = await db.from("configuracoes_da_plataforma").select("*").single();
    if (!data) throw new Error("Configuração não encontrada.");
    return data;
  });

const configSchema = z.object({
  preco_essencial_centavos: z.number().int().min(0), preco_pro_centavos: z.number().int().min(0), preco_studio_centavos: z.number().int().min(0),
  cor_fundo: z.string().regex(/^#[0-9A-Fa-f]{6}$/), cor_superficie: z.string().regex(/^#[0-9A-Fa-f]{6}$/), cor_primaria: z.string().regex(/^#[0-9A-Fa-f]{6}$/), cor_texto: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  tipografia: z.enum(["Montserrat", "Work Sans", "Sora"]), raio_px: z.number().int().min(0).max(24),
  whatsapp_alvo: z.string().trim().max(30).nullable().optional().transform((v) => {
    const digitos = String(v ?? "").replace(/\D/g, "");
    if (!digitos) return null;
    if (digitos.length < 10 || digitos.length > 15) throw new Error("Número de WhatsApp inválido.");
    return digitos.length <= 11 ? `55${digitos}` : digitos;
  }),
  instagram_cortai: z.string().trim().max(300).nullable().optional().transform((v) => v || null),
  facebook_cortai: z.string().trim().max(300).nullable().optional().transform((v) => v || null),
  tiktok_cortai: z.string().trim().max(300).nullable().optional().transform((v) => v || null),
  youtube_cortai: z.string().trim().max(300).nullable().optional().transform((v) => v || null),
});

export const savePlatformConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth]).validator((input: unknown) => configSchema.parse(input))
  .handler(async ({ data, context }) => {
    const db = await adminContext(context);
    const { error } = await db.from("configuracoes_da_plataforma").update({ ...data, atualizado_por: context.userId }).eq("id", true);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getSuggestions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await adminContext(context);
    const [suggestionsRes, tenantsRes, bookingsRes] = await Promise.all([
      db.from("sugestoes_da_plataforma").select("*").order("criado_em", { ascending: false }),
      db.from("tenants").select("id, nome, plano"), db.from("agendamentos").select("tenant_id"),
    ]);
    const tenants = tenantsRes.data ?? [];
    const bookings = bookingsRes.data ?? [];
    return (suggestionsRes.data ?? []).map((s) => ({ ...s, solicitantes: s.tenants_que_pediram.map((id) => ({ ...tenants.find((t) => t.id === id), id, agendamentos: bookings.filter((b) => b.tenant_id === id).length })) })).sort((a, b) => b.tenants_que_pediram.length - a.tenants_que_pediram.length);
  });

const suggestionSchema = z.object({ pedido: z.string().trim().min(1).max(500), motivo: z.string().trim().min(1).max(1500), canal: z.enum(["whatsapp", "ligacao", "visita", "suporte"]), tenants: z.array(z.string().uuid()), status: z.enum(["em_analise", "no_roteiro", "em_desenvolvimento", "implementada", "recusada"]) });
export const saveSuggestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth]).validator((input: unknown) => suggestionSchema.parse(input))
  .handler(async ({ data, context }) => {
    const db = await adminContext(context);
    const { error } = await db.from("sugestoes_da_plataforma").insert({ pedido: data.pedido, motivo: data.motivo, canal: data.canal, tenants_que_pediram: data.tenants, status: data.status, criado_por: context.userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateSuggestionStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth]).validator((input: unknown) => z.object({ id: z.string().uuid(), status: suggestionSchema.shape.status }).parse(input))
  .handler(async ({ data, context }) => {
    const db = await adminContext(context);
    const { error } = await db.from("sugestoes_da_plataforma").update({ status: data.status, criado_por: context.userId }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getGlobalDesign = createServerFn({ method: "GET" }).handler(async () => {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_ANON_KEY"]!;
  const client = createClient<Database>(process.env["SUPABASE_URL"]!, key, { auth: { persistSession: false }, global: { fetch: (input, init) => { const headers = new Headers(init?.headers); if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization"); headers.set("apikey", key); return fetch(input, { ...init, headers }); } } });
  const { data } = await client.from("design_da_plataforma").select("cor_fundo, cor_superficie, cor_primaria, cor_texto, tipografia, raio_px").eq("id", true).maybeSingle();
  return data;
});

export const getPlatformContact = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.rpc("contato_da_plataforma");
  return data?.[0] ?? null;
});
/* ------------------- CICLO DE VIDA DAS BARBEARIAS (ADMIN) ------------------ */

export const definirStatusDaBarbearia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ tenantId: z.string().uuid(), ativo: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    const db = await adminContext(context);
    const { error } = await db.from("tenants").update({ ativo: data.ativo }).eq("id", data.tenantId);
    if (error) throw new Error(error.message);
    return { ok: true, ativo: data.ativo };
  });

/**
 * Exclusão permanente de uma barbearia: só o dono da plataforma, com senha
 * revalidada no servidor. Apaga na ordem das dependências para não deixar
 * registros órfãos.
 */
export const excluirBarbearia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z.object({ tenantId: z.string().uuid(), senha: z.string().min(1).max(200) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const db = await adminContext(context);
    const { confirmarSenhaDoUsuario } = await import("@/lib/reauth.server");
    await confirmarSenhaDoUsuario(context.claims as Record<string, unknown>, data.senha);

    const tenantId = data.tenantId;
    const { data: tenant } = await db.from("tenants").select("id, nome").eq("id", tenantId).maybeSingle();
    if (!tenant) throw new Error("Barbearia não encontrada.");

    const { data: carteiras } = await db.from("carteiras").select("id").eq("tenant_id", tenantId);
    const carteiraIds = (carteiras ?? []).map((c: { id: string }) => c.id);
    if (carteiraIds.length) await db.from("movimentos").delete().in("carteira_id", carteiraIds);

    const { data: vendas } = await db.from("vendas").select("id").eq("tenant_id", tenantId);
    const vendaIds = (vendas ?? []).map((v: { id: string }) => v.id);
    if (vendaIds.length) await db.from("venda_itens").delete().in("venda_id", vendaIds);

    for (const tabela of [
      "vendas",
      "avaliacoes",
      "fila_de_espera",
      "indicacoes",
      "agendamentos",
      "carteiras",
      "clientes",
      "produtos",
      "servicos",
      "profissionais",
      "regras_de_plano",
      "historico_de_plano",
      "contatos_de_retencao",
      "tenant_branding_versions",
      "tenant_usuarios",
    ] as const) {
      const { error } = await db.from(tabela).delete().eq("tenant_id", tenantId);
      if (error) throw new Error(error.message);
    }

    const { error } = await db.from("tenants").delete().eq("id", tenantId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Matriz de recursos por plano — leitura para o dono da plataforma. */
export const getMatrizDeRecursos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await adminContext(context);
    const { data, error } = await db
      .from("recursos_de_plano")
      .select("id, chave, rotulo, descricao, plano, liberado")
      .order("rotulo")
      .order("plano");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/** Liberar/bloquear um recurso para um plano. */
export const definirRecursoDePlano = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ chave: z.string().min(2).max(60), plano: z.enum(["essencial", "pro", "studio"]), liberado: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const db = await adminContext(context);
    const { error } = await db
      .from("recursos_de_plano")
      .update({ liberado: data.liberado })
      .eq("chave", data.chave)
      .eq("plano", data.plano);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
