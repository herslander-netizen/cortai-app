/**
 * Suporte da plataforma: edição assistida de UMA barbearia pelo dono/suporte
 * do Flow. Não é "entrar na conta": nenhuma sessão do cliente é criada, nada
 * de senha é exposto, e toda alteração fica registrada em auditoria_de_suporte.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CAMPOS_PUBLICOS = [
  "nome",
  "descricao",
  "endereco",
  "telefone",
  "whatsapp",
  "instagram",
  "facebook",
  "texto_boas_vindas",
  "rotulo_carteira",
  "logo_url",
  "capa_url",
  "cor_primaria",
  "cor_secundaria",
  "cor_accent",
  "tema",
  "modo",
  "loja_ativa",
  "plano",
] as const;

type CampoPublico = (typeof CAMPOS_PUBLICOS)[number];

async function comoSuporte(context: { supabase: any; userId: string }) {
  const [{ data: admin }, { data: suporte }] = await Promise.all([
    context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
    context.supabase.rpc("has_role", { _user_id: context.userId, _role: "suporte" }),
  ]);
  if (!admin && !suporte) throw new Error("Acesso exclusivo da equipe do Flow.");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const email = (context as { claims?: { email?: string } }).claims?.email ?? null;
  return { db: supabaseAdmin, email };
}

export type BarbeariaSuporte = {
  id: string;
  slug: string;
  plano: string;
  campos: Record<string, string | number | boolean | null>;
  servicos: {
    id: string;
    nome: string;
    duracao_min: number;
    preco_centavos: number;
    ativo: boolean;
  }[];
  profissionais: { id: string; nome: string; ativo: boolean }[];
  produtos: {
    id: string;
    nome: string;
    disponivel_venda: boolean;
    destaque: boolean;
    ativo: boolean;
  }[];
  auditoria: {
    id: string;
    acao: string;
    alvo: string;
    ator_email: string | null;
    alteracoes: string;
    criado_em: string;
  }[];
};

/** Ficha completa da barbearia para a tela de suporte. */
export const getBarbeariaParaSuporte = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ tenantId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<BarbeariaSuporte> => {
    const { db } = await comoSuporte(context);
    const [tenantRes, servicosRes, profRes, prodRes, auditoriaRes] = await Promise.all([
      db.from("tenants").select("*").eq("id", data.tenantId).maybeSingle(),
      db
        .from("servicos")
        .select("id, nome, duracao_min, preco_centavos, ativo")
        .eq("tenant_id", data.tenantId)
        .order("ordem"),
      db
        .from("profissionais")
        .select("id, nome, ativo")
        .eq("tenant_id", data.tenantId)
        .order("nome"),
      db
        .from("produtos")
        .select("id, nome, disponivel_venda, destaque, ativo")
        .eq("tenant_id", data.tenantId)
        .order("nome"),
      db
        .from("auditoria_de_suporte")
        .select("id, acao, alvo, ator_email, alteracoes, criado_em")
        .eq("tenant_id", data.tenantId)
        .order("criado_em", { ascending: false })
        .limit(30),
    ]);
    const tenant = tenantRes.data;
    if (!tenant) throw new Error("Negócio não encontrado.");
    const campos: Record<string, string | number | boolean | null> = {};
    for (const campo of CAMPOS_PUBLICOS) {
      const valor = (tenant as Record<string, unknown>)[campo];
      campos[campo] =
        typeof valor === "string" || typeof valor === "number" || typeof valor === "boolean"
          ? valor
          : null;
    }
    return {
      id: tenant.id,
      slug: tenant.slug,
      plano: tenant.plano,
      campos,
      servicos: servicosRes.data ?? [],
      profissionais: profRes.data ?? [],
      produtos: prodRes.data ?? [],
      auditoria: (auditoriaRes.data ?? []).map((r: any) => ({
        id: r.id,
        acao: r.acao,
        alvo: r.alvo,
        ator_email: r.ator_email,
        alteracoes: JSON.stringify(r.alteracoes ?? {}),
        criado_em: r.criado_em,
      })),
    };
  });

const camposSchema = z.object({
  nome: z.string().trim().min(2).max(120).optional(),
  descricao: z.string().trim().max(600).nullable().optional(),
  endereco: z.string().trim().max(200).nullable().optional(),
  telefone: z.string().trim().max(30).nullable().optional(),
  whatsapp: z.string().trim().max(30).nullable().optional(),
  instagram: z.string().trim().max(120).nullable().optional(),
  facebook: z.string().trim().max(120).nullable().optional(),
  texto_boas_vindas: z.string().trim().max(240).nullable().optional(),
  rotulo_carteira: z.string().trim().max(40).nullable().optional(),
  logo_url: z.string().trim().max(500).nullable().optional(),
  capa_url: z.string().trim().max(500).nullable().optional(),
  cor_primaria: z.string().trim().max(30).optional(),
  cor_secundaria: z.string().trim().max(30).nullable().optional(),
  cor_accent: z.string().trim().max(30).nullable().optional(),
  tema: z.string().trim().max(30).optional(),
  modo: z.string().trim().max(30).optional(),
  loja_ativa: z.boolean().optional(),
  plano: z.enum(["essencial", "pro", "conecta", "studio"]).optional(),
});

/**
 * Salva apenas os campos alterados e grava a auditoria (quem, quando, o quê).
 * A barbearia continua trabalhando: não há bloqueio nem sessão interrompida.
 */
export const salvarBarbeariaComoSuporte = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        tenantId: z.string().uuid(),
        motivo: z.string().trim().min(3).max(200),
        campos: camposSchema,
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { db, email } = await comoSuporte(context);
    const { data: atual } = await db
      .from("tenants")
      .select("*")
      .eq("id", data.tenantId)
      .maybeSingle();
    if (!atual) throw new Error("Negócio não encontrado.");

    const mudancas: Record<string, { de: unknown; para: unknown }> = {};
    const patch: Record<string, unknown> = {};
    for (const [chave, valor] of Object.entries(data.campos)) {
      if (valor === undefined) continue;
      const anterior = (atual as Record<string, unknown>)[chave] ?? null;
      const novo = valor === "" ? null : valor;
      if (anterior === novo) continue;
      patch[chave] = novo;
      mudancas[chave] = { de: anterior, para: novo };
    }
    if (!Object.keys(patch).length) return { ok: true, alteracoes: 0 };

    const { error } = await db
      .from("tenants")
      .update(patch as never)
      .eq("id", data.tenantId);
    if (error) throw new Error(error.message);

    await db.from("auditoria_de_suporte").insert({
      tenant_id: data.tenantId,
      ator_user_id: context.userId,
      ator_email: email,
      acao: "editou_dados_da_barbearia",
      alvo: data.motivo,
      alteracoes: JSON.parse(JSON.stringify(mudancas)),
    });
    return { ok: true, alteracoes: Object.keys(patch).length };
  });

/** Liga/desliga um serviço, profissional ou produto como suporte. */
export const alternarItemComoSuporte = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        tenantId: z.string().uuid(),
        tabela: z.enum(["servicos", "profissionais", "produtos"]),
        id: z.string().uuid(),
        campo: z.enum(["ativo", "disponivel_venda", "destaque"]),
        valor: z.boolean(),
        motivo: z.string().trim().min(3).max(200),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { db, email } = await comoSuporte(context);
    const { error } = await db
      .from(data.tabela)
      .update({ [data.campo]: data.valor } as never)
      .eq("id", data.id)
      .eq("tenant_id", data.tenantId);
    if (error) throw new Error(error.message);
    await db.from("auditoria_de_suporte").insert({
      tenant_id: data.tenantId,
      ator_user_id: context.userId,
      ator_email: email,
      acao: `alterou_${data.tabela}`,
      alvo: data.motivo,
      alteracoes: { id: data.id, campo: data.campo, para: data.valor } as Record<
        string,
        string | boolean
      >,
    });
    return { ok: true };
  });

export type CampoDeSuporte = CampoPublico;
