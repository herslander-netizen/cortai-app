import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { exigirPermissao, tenantIdDoMembro } from "@/lib/tenant";
import { fusoDoTenant } from "@/lib/fuso.server";
import { hojeNoFuso } from "@/lib/horarios";
import { horarioEspecialValido } from "@/lib/horarios-especiais";

const DIA = /^\d{4}-\d{2}-\d{2}$/;
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

export type HorarioEspecialDaAgenda = {
  id: string;
  dia: string;
  profissionalId: string | null;
  abre: string;
  fecha: string;
};

export const listarHorariosEspeciaisDoDia = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ dia: z.string().regex(DIA) }).parse(d))
  .handler(async ({ data, context }): Promise<HorarioEspecialDaAgenda[]> => {
    const tenantId = await tenantIdDoMembro(context);
    // A tabela nasce na migração 0054; os tipos Supabase gerados ainda não a incluem.
    const db = context.supabase as any;
    const { data: linhas, error } = await db
      .from("horarios_especiais")
      .select("id, dia, profissional_id, abre, fecha")
      .eq("tenant_id", tenantId)
      .eq("dia", data.dia)
      .order("profissional_id", { ascending: true });
    if (error) throw new Error("Não foi possível carregar os horários especiais.");
    return ((linhas ?? []) as { id: string; dia: string; profissional_id: string | null; abre: string; fecha: string }[]).map((linha) => ({
      id: linha.id,
      dia: String(linha.dia).slice(0, 10),
      profissionalId: linha.profissional_id,
      abre: String(linha.abre).slice(0, 5),
      fecha: String(linha.fecha).slice(0, 5),
    }));
  });

export const salvarHorarioEspecial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z.object({
      dia: z.string().regex(DIA),
      profissionalId: z.string().uuid().nullable(),
      abre: z.string().regex(HORA),
      fecha: z.string().regex(HORA),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "alterar_dados_barbearia");
    // A tabela nasce na migração 0054; os tipos Supabase gerados ainda não a incluem.
    const db = context.supabase as any;
    const fuso = await fusoDoTenant(tenantId);
    if (data.dia < hojeNoFuso(fuso)) {
      throw new Error("Só é possível configurar hoje ou uma data futura.");
    }
    if (!horarioEspecialValido(data.abre, data.fecha)) {
      throw new Error("O fechamento precisa ser depois da abertura, no mesmo dia.");
    }
    if (data.profissionalId) {
      const { data: profissional, error } = await db
        .from("profissionais")
        .select("id")
        .eq("id", data.profissionalId)
        .eq("tenant_id", tenantId)
        .eq("ativo", true)
        .maybeSingle();
      if (error || !profissional) throw new Error("Profissional não encontrado neste negócio.");
    }
    const { error } = await db
      .from("horarios_especiais")
      .upsert({
        tenant_id: tenantId,
        dia: data.dia,
        profissional_id: data.profissionalId,
        abre: data.abre,
        fecha: data.fecha,
        criado_por: context.userId,
        atualizado_em: new Date().toISOString(),
      }, { onConflict: "tenant_id,dia,alvo_id" });
    if (error) throw new Error("Não foi possível salvar o horário especial.");
    return { ok: true };
  });

export const removerHorarioEspecial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "alterar_dados_barbearia");
    // A tabela nasce na migração 0054; os tipos Supabase gerados ainda não a incluem.
    const db = context.supabase as any;
    const { error } = await db
      .from("horarios_especiais")
      .delete()
      .eq("id", data.id)
      .eq("tenant_id", tenantId);
    if (error) throw new Error("Não foi possível remover o horário especial.");
    return { ok: true };
  });
