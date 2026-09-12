import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database, Json } from "@/integrations/supabase/types";

const hex = z.string().regex(/^#[0-9A-Fa-f]{6}$/);
const nullableText = z.string().trim().max(500).nullable();

const marcaSchema = z.object({
  nome: z.string().trim().min(2).max(100),
  endereco: nullableText,
  telefone: nullableText,
  instagram: nullableText,
  whatsapp: nullableText,
  facebook: nullableText,
  tema: z.enum(["classica", "dourada", "vibrante", "escura", "quente", "clara", "personalizada"]),
  cor_primaria: hex,
  cor_secundaria: hex,
  cor_accent: hex,
  rotulo_carteira: nullableText,
  texto_boas_vindas: nullableText,
  assinatura_visivel: z.boolean(),
  logo_url: z.string().max(500).nullable(),
});

export type MarcaForm = z.infer<typeof marcaSchema>;

export type MarcaData = MarcaForm & {
  id: string;
  plano: string;
  logo_signed_url: string | null;
};

export type MarcaVersion = {
  id: string;
  versao: number;
  criado_em: string;
  restaurado_de: string | null;
  snapshot: MarcaForm;
};

async function tenantDoDono(
  supabase: SupabaseClient<Database>,
  userId: string,
) {
  const { data: vinculo } = await supabase
    .from("tenant_usuarios")
    .select("tenant_id, papel")
    .eq("user_id", userId)
    .in("papel", ["dono"])
    .limit(1)
    .maybeSingle();

  if (!vinculo) throw new Error("Apenas o dono pode configurar a marca.");
  return vinculo.tenant_id as string;
}

function snapshot(row: Database["public"]["Tables"]["tenants"]["Row"]): MarcaForm {
  return marcaSchema.parse({
    nome: row.nome,
    endereco: row.endereco ?? null,
    telefone: row.telefone ?? null,
    instagram: row.instagram ?? null,
    whatsapp: row.whatsapp ?? null,
    facebook: row.facebook ?? null,
    tema: row.tema,
    cor_primaria: row.cor_primaria,
    cor_secundaria: row.cor_secundaria ?? "#1C1B19",
    cor_accent: row.cor_accent ?? "#8FA882",
    rotulo_carteira: row.rotulo_carteira ?? null,
    texto_boas_vindas: row.texto_boas_vindas ?? null,
    assinatura_visivel: row.assinatura_visivel,
    logo_url: row.logo_url ?? null,
  });
}

async function signedLogo(supabase: any, path: string | null) {
  if (!path) return null;
  const { data } = await supabase.storage.from("tenant-logos").createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

export const getMarca = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ marca: MarcaData; versoes: MarcaVersion[] }> => {
    const tenantId = await tenantDoDono(context.supabase, context.userId);
    const [{ data: tenant }, { data: versoes }] = await Promise.all([
      context.supabase.from("tenants").select("*").eq("id", tenantId).single(),
      context.supabase
        .from("tenant_branding_versions")
        .select("id, versao, criado_em, restaurado_de, snapshot")
        .eq("tenant_id", tenantId)
        .order("versao", { ascending: false })
        .limit(12),
    ]);
    if (!tenant) throw new Error("Barbearia não encontrada.");
    const atual = snapshot(tenant);
    return {
      marca: {
        id: tenant.id,
        plano: tenant.plano,
        ...atual,
        logo_signed_url: await signedLogo(context.supabase, atual.logo_url),
      },
      versoes: (versoes ?? []).map((item) => ({
        ...item,
        snapshot: marcaSchema.parse(item.snapshot),
      })),
    };
  });

export const salvarMarca = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => marcaSchema.parse(input))
  .handler(async ({ data, context }) => {
    const tenantId = await tenantDoDono(context.supabase, context.userId);
    const { data: atual } = await context.supabase.from("tenants").select("*").eq("id", tenantId).single();
    if (!atual) throw new Error("Barbearia não encontrada.");

    const assinatura = atual.plano === "essencial" ? true : data.assinatura_visivel;
    const { data: ultima } = await context.supabase
      .from("tenant_branding_versions")
      .select("versao")
      .eq("tenant_id", tenantId)
      .order("versao", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { error: historyError } = await context.supabase.from("tenant_branding_versions").insert({
      tenant_id: tenantId,
      versao: (ultima?.versao ?? 0) + 1,
      snapshot: snapshot(atual) as unknown as Json,
      criado_por: context.userId,
    });
    if (historyError) throw new Error(historyError.message);

    const { error } = await context.supabase
      .from("tenants")
      .update({ ...data, assinatura_visivel: assinatura })
      .eq("id", tenantId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const restaurarMarca = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ versaoId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const tenantId = await tenantDoDono(context.supabase, context.userId);
    const [{ data: atual }, { data: versao }] = await Promise.all([
      context.supabase.from("tenants").select("*").eq("id", tenantId).single(),
      context.supabase
        .from("tenant_branding_versions")
        .select("id, snapshot")
        .eq("id", data.versaoId)
        .eq("tenant_id", tenantId)
        .single(),
    ]);
    if (!atual || !versao) throw new Error("Versão não encontrada.");

    const { data: ultima } = await context.supabase
      .from("tenant_branding_versions")
      .select("versao")
      .eq("tenant_id", tenantId)
      .order("versao", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { error: historyError } = await context.supabase.from("tenant_branding_versions").insert({
      tenant_id: tenantId,
      versao: (ultima?.versao ?? 0) + 1,
      snapshot: snapshot(atual) as unknown as Json,
      restaurado_de: versao.id,
      criado_por: context.userId,
    });
    if (historyError) throw new Error(historyError.message);

    const restaurada = marcaSchema.parse(versao.snapshot);
    const { error } = await context.supabase
      .from("tenants")
      .update({
        ...restaurada,
        assinatura_visivel: atual.plano === "essencial" ? true : restaurada.assinatura_visivel,
      })
      .eq("id", tenantId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getMarcaCliente = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("tenants")
    .select("nome, logo_url, cor_primaria, cor_secundaria, cor_accent, texto_boas_vindas, rotulo_carteira, assinatura_visivel")
    .order("criado_em", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return {
    ...data,
    logo_signed_url: await signedLogo(supabaseAdmin, data.logo_url),
  };
});