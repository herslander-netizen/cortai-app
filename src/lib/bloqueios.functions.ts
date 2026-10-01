import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { tenantIdDoMembro } from "@/lib/tenant";
import { fusoDoTenant } from "@/lib/fuso.server";
import { isoNoFusoDaBarbearia, somarDias } from "@/lib/horarios";

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const DIA = /^\d{4}-\d{2}-\d{2}$/;

export type Bloqueio = {
  id: string;
  profissionalId: string | null;
  inicio: string;
  fim: string;
  motivo: string | null;
};

export const listarBloqueiosDoDia = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ dia: z.string().regex(DIA) }).parse(d))
  .handler(async ({ data, context }): Promise<Bloqueio[]> => {
    const tenantId = await tenantIdDoMembro(context);
    const fuso = await fusoDoTenant(tenantId);
    const ini = isoNoFusoDaBarbearia(data.dia, "00:00", fuso);
    const fim = isoNoFusoDaBarbearia(somarDias(data.dia, 1), "00:00", fuso);
    const { data: linhas, error } = await context.supabase
      .from("bloqueios_de_agenda")
      .select("id, profissional_id, inicio, fim, motivo")
      .eq("tenant_id", tenantId)
      .lt("inicio", fim)
      .gt("fim", ini)
      .order("inicio");
    if (error) throw new Error("Não foi possível carregar os bloqueios.");
    return (linhas ?? []).map((b) => ({
      id: b.id,
      profissionalId: b.profissional_id,
      inicio: b.inicio,
      fim: b.fim,
      motivo: b.motivo,
    }));
  });

export const criarBloqueio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        dia: z.string().regex(DIA),
        de: z.string().regex(HORA),
        ate: z.string().regex(HORA),
        profissionalId: z.string().uuid().nullable(),
        motivo: z.string().trim().max(120).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    if (data.ate <= data.de) throw new Error("O fim precisa ser depois do início.");
    const tenantId = await tenantIdDoMembro(context);
    const fuso = await fusoDoTenant(tenantId);
    if (data.profissionalId) {
      const { data: p } = await context.supabase
        .from("profissionais")
        .select("id")
        .eq("id", data.profissionalId)
        .eq("tenant_id", tenantId)
        .maybeSingle();
      if (!p) throw new Error("Profissional não encontrado neste negócio.");
    }
    const inicio = isoNoFusoDaBarbearia(data.dia, data.de, fuso);
    const fim = isoNoFusoDaBarbearia(data.dia, data.ate, fuso);
    const { error } = await context.supabase.from("bloqueios_de_agenda").insert({
      tenant_id: tenantId,
      profissional_id: data.profissionalId,
      inicio,
      fim,
      motivo: data.motivo || null,
      criado_por: context.userId,
    });
    if (error) throw new Error("Não foi possível bloquear. Tente de novo.");
    let q = context.supabase
      .from("agendamentos")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .in("status", ["agendado", "chegou", "na_cadeira"])
      .lt("inicio", fim)
      .gt("fim", inicio);
    if (data.profissionalId) q = q.eq("profissional_id", data.profissionalId);
    const { count } = await q;
    return { ok: true, atendimentosNoPeriodo: count ?? 0 };
  });

export const removerBloqueio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const tenantId = await tenantIdDoMembro(context);
    const { error } = await context.supabase
      .from("bloqueios_de_agenda")
      .delete()
      .eq("id", data.id)
      .eq("tenant_id", tenantId);
    if (error) throw new Error("Não foi possível liberar o horário.");
    return { ok: true };
  });

export type DiaDaEscala = { diaSemana: number; trabalha: boolean; abre: string; fecha: string };

export const getEscalaDoProfissional = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ profissionalId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const tenantId = await tenantIdDoMembro(context);
    const { data: linhas } = await context.supabase
      .from("escalas_de_profissional")
      .select("dia_semana, trabalha, abre, fecha")
      .eq("tenant_id", tenantId)
      .eq("profissional_id", data.profissionalId);
    return (linhas ?? []).map((l) => ({
      diaSemana: l.dia_semana,
      trabalha: l.trabalha,
      abre: l.abre ? String(l.abre).slice(0, 5) : "",
      fecha: l.fecha ? String(l.fecha).slice(0, 5) : "",
    })) as DiaDaEscala[];
  });

/** Grava a escala inteira; dias ausentes voltam a seguir o expediente do negócio. */
export const salvarEscalaDoProfissional = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        profissionalId: z.string().uuid(),
        dias: z
          .array(
            z.object({
              diaSemana: z.number().int().min(0).max(6),
              trabalha: z.boolean(),
              abre: z.string(),
              fecha: z.string(),
            }),
          )
          .max(7),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const tenantId = await tenantIdDoMembro(context);
    const { data: p } = await context.supabase
      .from("profissionais")
      .select("id")
      .eq("id", data.profissionalId)
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (!p) throw new Error("Profissional não encontrado neste negócio.");
    for (const d of data.dias) {
      if (d.trabalha && (!HORA.test(d.abre) || !HORA.test(d.fecha) || d.fecha <= d.abre)) {
        throw new Error("Confira os horários: o fim precisa ser depois do início.");
      }
    }
    const manter = data.dias.map((d) => d.diaSemana);
    let del = context.supabase
      .from("escalas_de_profissional")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("profissional_id", data.profissionalId);
    if (manter.length) del = del.not("dia_semana", "in", `(${manter.join(",")})`);
    await del;
    if (data.dias.length) {
      const { error } = await context.supabase.from("escalas_de_profissional").upsert(
        data.dias.map((d) => ({
          tenant_id: tenantId,
          profissional_id: data.profissionalId,
          dia_semana: d.diaSemana,
          trabalha: d.trabalha,
          abre: d.trabalha ? d.abre : null,
          fecha: d.trabalha ? d.fecha : null,
          atualizado_em: new Date().toISOString(),
        })),
        { onConflict: "profissional_id,dia_semana" },
      );
      if (error) throw new Error("Não foi possível salvar a escala.");
    }
    return { ok: true };
  });

export const listarEquipeDaEscala = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const tenantId = await tenantIdDoMembro(context);
    const { data } = await context.supabase
      .from("profissionais")
      .select("id, nome")
      .eq("tenant_id", tenantId)
      .eq("ativo", true)
      .order("nome");
    return (data ?? []) as { id: string; nome: string }[];
  });
