import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { exigirPermissao, tenantIdDoMembro } from "@/lib/tenant";
import { diaDaSemanaDoDia, hojeNoFuso, normalizarFuso } from "@/lib/horarios";

const horarioSchema = z.string().regex(/^\d{2}:\d{2}$/);
const dataSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const minutos = (valor: string) => {
  const [h = 0, m = 0] = valor.split(":").map(Number);
  return h * 60 + m;
};

async function verificarDataEExpediente(context: { supabase: any; userId: string }, tenantId: string, dia: string) {
  const { data: negocio } = await context.supabase
    .from("tenants")
    .select("fuso")
    .eq("id", tenantId)
    .maybeSingle();
  const fuso = normalizarFuso(negocio?.fuso);
  if (dia < hojeNoFuso(fuso)) throw new Error("Só é possível ajustar o intervalo de hoje ou de um dia futuro.");
  const { data: horario, error } = await context.supabase
    .from("horarios_de_funcionamento")
    .select("fechado, abre, fecha")
    .eq("tenant_id", tenantId)
    .eq("dia_semana", diaDaSemanaDoDia(dia))
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!horario || horario.fechado) throw new Error("Não há expediente configurado para esta data.");
  return horario as { fechado: boolean; abre: string; fecha: string };
}

export const salvarIntervaloAgendaDia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({
    dia: dataSchema,
    inicio: horarioSchema,
    fim: horarioSchema,
  }).parse(input))
  .handler(async ({ data, context }) => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "alterar_dados_barbearia");
    const horario = await verificarDataEExpediente(context, tenantId, data.dia);
    const abre = minutos(String(horario.abre).slice(0, 5));
    let fecha = minutos(String(horario.fecha).slice(0, 5));
    if (fecha <= abre) fecha += 1440;
    const inicio = minutos(data.inicio);
    let fim = minutos(data.fim);
    const inicioRelativo = inicio < abre ? inicio + 1440 : inicio;
    if (fim < abre) fim += 1440;
    if (fim <= inicioRelativo) fim += 1440;
    if (inicioRelativo < abre || fim > fecha || fim <= inicioRelativo) {
      throw new Error("O intervalo precisa ficar dentro do expediente e terminar depois do início.");
    }
    const { error } = await context.supabase
      .from("intervalos_agenda_dia")
      .upsert({
        tenant_id: tenantId,
        dia: data.dia,
        intervalo_inicio: data.inicio,
        intervalo_fim: data.fim,
        criado_por: context.userId,
        atualizado_em: new Date().toISOString(),
      }, { onConflict: "tenant_id,dia" });
    if (error) throw new Error(error.message);
    return { ok: true, inicio: data.inicio, fim: data.fim };
  });

export const restaurarIntervaloAgendaDia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ dia: dataSchema }).parse(input))
  .handler(async ({ data, context }) => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "alterar_dados_barbearia");
    await verificarDataEExpediente(context, tenantId, data.dia);
    const { error } = await context.supabase
      .from("intervalos_agenda_dia")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("dia", data.dia);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
