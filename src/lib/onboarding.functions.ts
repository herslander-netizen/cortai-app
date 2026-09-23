import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { exigirPermissao, tenantIdDoMembro } from "@/lib/tenant";
import { horariosPadrao, type HorarioSugerido } from "@/lib/ia/assistente";
import { FUSOS_DA_BARBEARIA, normalizarFuso } from "@/lib/horarios";

export const ITENS_DO_CHECKLIST = [
  { chave: "configurar", rotulo: "Configure sua barbearia", destino: "/barbeiro/configurar" },
  { chave: "servicos", rotulo: "Cadastre seus serviços", destino: "/barbeiro/servicos" },
  { chave: "publicar", rotulo: "Publique sua fila", destino: "/barbeiro/configurar" },
  { chave: "fila", rotulo: "Conheça o painel da fila", destino: "/barbeiro/fila" },
  { chave: "whatsapp", rotulo: "Conecte o WhatsApp (opcional)", destino: "/barbeiro/integracoes" },
  { chave: "personalizar", rotulo: "Personalize sua experiência", destino: "/barbeiro/marca" },
] as const;

export type ChaveDoChecklist = (typeof ITENS_DO_CHECKLIST)[number]["chave"];

export type ServicoDaBarbearia = {
  id: string;
  nome: string;
  duracaoMin: number;
  precoCentavos: number;
  ativo: boolean;
};

export type ConfiguracaoInicial = {
  tenant: { id: string; nome: string; slug: string; whatsapp: string | null; logoUrl: string | null; fuso: string };
  horarios: HorarioSugerido[];
  servicos: ServicoDaBarbearia[];
  etapa: string;
  itens: Record<string, boolean>;
  tourVisto: boolean;
  concluidoEm: string | null;
};

const horarioSchema = z.object({
  diaSemana: z.number().int().min(0).max(6),
  fechado: z.boolean(),
  abre: z.string().regex(/^\d{2}:\d{2}$/),
  fecha: z.string().regex(/^\d{2}:\d{2}$/),
});

const servicoSchema = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().trim().min(2).max(60),
  duracaoMin: z.number().int().min(5).max(480),
  precoCentavos: z.number().int().min(0).max(10_000_000),
});

export const getConfiguracaoInicial = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ConfiguracaoInicial> => {
    const tenantId = await tenantIdDoMembro(context);
    const db = context.supabase;
    const [tenantRes, horariosRes, servicosRes, onbRes] = await Promise.all([
      db.from("tenants").select("id, nome, slug, whatsapp, logo_url, fuso").eq("id", tenantId).maybeSingle(),
      db.from("horarios_de_funcionamento").select("*").eq("tenant_id", tenantId).order("dia_semana"),
      db.from("servicos").select("*").eq("tenant_id", tenantId).order("ordem").order("nome"),
      db.from("onboarding_do_tenant").select("*").eq("tenant_id", tenantId).maybeSingle(),
    ]);

    const tenant = tenantRes.data;
    if (!tenant) throw new Error("Barbearia não encontrada.");

    const horarios: HorarioSugerido[] = (horariosRes.data ?? []).length
      ? (horariosRes.data ?? []).map((h: Record<string, any>) => ({
          diaSemana: h["dia_semana"] as number,
          fechado: Boolean(h["fechado"]),
          abre: String(h["abre"]).slice(0, 5),
          fecha: String(h["fecha"]).slice(0, 5),
        }))
      : horariosPadrao();

    const servicos: ServicoDaBarbearia[] = (servicosRes.data ?? []).map((s: Record<string, any>) => ({
      id: s["id"] as string,
      nome: s["nome"] as string,
      duracaoMin: s["duracao_min"] as number,
      precoCentavos: s["preco_centavos"] as number,
      ativo: Boolean(s["ativo"]),
    }));

    const onb = onbRes.data as Record<string, any> | null;
    const itens = (onb?.["itens"] ?? {}) as Record<string, boolean>;

    return {
      tenant: {
        id: tenant.id as string,
        nome: tenant.nome as string,
        slug: tenant.slug as string,
        whatsapp: (tenant.whatsapp as string) ?? null,
        logoUrl: (tenant.logo_url as string) ?? null,
        fuso: normalizarFuso(tenant.fuso as string | null),
      },
      horarios,
      servicos,
      etapa: (onb?.["etapa"] as string) ?? "dados",
      itens: {
        ...itens,
        servicos: itens["servicos"] ?? servicos.length > 0,
        configurar: itens["configurar"] ?? Boolean(onb?.["concluido_em"]),
      },
      tourVisto: Boolean(onb?.["tour_visto"]),
      concluidoEm: (onb?.["concluido_em"] as string) ?? null,
    };
  });

async function gravarOnboarding(
  context: { supabase: any; userId: string },
  tenantId: string,
  campos: Record<string, unknown>,
) {
  const { error } = await context.supabase
    .from("onboarding_do_tenant")
    .upsert({ tenant_id: tenantId, ...campos }, { onConflict: "tenant_id" });
  if (error) throw new Error(error.message);
}

export const salvarDadosDaBarbearia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        nome: z.string().trim().min(2).max(80),
        whatsapp: z.string().trim().max(30).optional().default(""),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "alterar_dados_barbearia");
    const whatsapp = data.whatsapp.replace(/\D/g, "");
    const { error } = await context.supabase
      .from("tenants")
      .update({ nome: data.nome, whatsapp: whatsapp || null })
      .eq("id", tenantId);
    if (error) throw new Error(error.message);
    await gravarOnboarding(context, tenantId, { etapa: "horarios" });
    return { ok: true };
  });

export const salvarHorarios = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        horarios: z.array(horarioSchema).min(1).max(7),
        fuso: z.enum(FUSOS_DA_BARBEARIA.map((f) => f.valor) as [string, ...string[]]).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "alterar_dados_barbearia");
    const linhas = data.horarios.map((h) => ({
      tenant_id: tenantId,
      dia_semana: h.diaSemana,
      fechado: h.fechado,
      abre: `${h.abre}:00`,
      fecha: `${h.fecha}:00`,
    }));
    const { error } = await context.supabase
      .from("horarios_de_funcionamento")
      .upsert(linhas, { onConflict: "tenant_id,dia_semana" });
    if (error) throw new Error(error.message);
    if (data.fuso) {
      const { error: erroFuso } = await context.supabase
        .from("tenants")
        .update({ fuso: data.fuso })
        .eq("id", tenantId);
      if (erroFuso) throw new Error(erroFuso.message);
      const { esquecerFusoDoTenant } = await import("@/lib/fuso.server");
      esquecerFusoDoTenant(tenantId);
    }
    await gravarOnboarding(context, tenantId, { etapa: "servicos" });
    return { ok: true };
  });

export const salvarServicos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ servicos: z.array(servicoSchema).min(1).max(40) }).parse(input))
  .handler(async ({ data, context }) => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "alterar_dados_barbearia");
    const db = context.supabase;

    const novos = data.servicos.filter((s) => !s.id);
    const existentes = data.servicos.filter((s) => s.id);

    if (novos.length) {
      const { error } = await db.from("servicos").insert(
        novos.map((s, i) => ({
          tenant_id: tenantId,
          nome: s.nome,
          duracao_min: s.duracaoMin,
          preco_centavos: s.precoCentavos,
          ordem: i,
        })),
      );
      if (error) throw new Error(error.message);
    }
    for (const s of existentes) {
      const { error } = await db
        .from("servicos")
        .update({ nome: s.nome, duracao_min: s.duracaoMin, preco_centavos: s.precoCentavos })
        .eq("id", s.id!)
        .eq("tenant_id", tenantId);
      if (error) throw new Error(error.message);
    }

    const itens = await lerItens(context, tenantId);
    await gravarOnboarding(context, tenantId, { itens: { ...itens, servicos: true } });
    return { ok: true, criados: novos.length, atualizados: existentes.length };
  });

export const removerServico = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "alterar_dados_barbearia");
    const { error } = await context.supabase
      .from("servicos")
      .update({ ativo: false })
      .eq("id", data.id)
      .eq("tenant_id", tenantId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

async function lerItens(context: { supabase: any }, tenantId: string): Promise<Record<string, boolean>> {
  const { data } = await context.supabase
    .from("onboarding_do_tenant")
    .select("itens")
    .eq("tenant_id", tenantId)
    .maybeSingle();
  return (data?.itens ?? {}) as Record<string, boolean>;
}

export const concluirConfiguracao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "alterar_dados_barbearia");
    const itens = await lerItens(context, tenantId);
    await gravarOnboarding(context, tenantId, {
      etapa: "pronto",
      concluido_em: new Date().toISOString(),
      itens: { ...itens, configurar: true, publicar: true },
    });
    return { ok: true };
  });

export const marcarItemDoChecklist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ chave: z.string().trim().min(2).max(30), feito: z.boolean().default(true) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const tenantId = await tenantIdDoMembro(context);
    const permitido = ITENS_DO_CHECKLIST.some((i) => i.chave === data.chave);
    if (!permitido) throw new Error("Item desconhecido.");
    const itens = await lerItens(context, tenantId);
    await gravarOnboarding(context, tenantId, { itens: { ...itens, [data.chave]: data.feito } });
    return { ok: true };
  });

export const marcarTourVisto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const tenantId = await tenantIdDoMembro(context);
    await gravarOnboarding(context, tenantId, { tour_visto: true });
    return { ok: true };
  });
