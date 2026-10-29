import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { diaDaSemanaDoDia } from "@/lib/horarios";
import { exigirPermissao, tenantIdDoMembro, type ContextoAutenticado } from "@/lib/tenant";

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const DIA = /^\d{4}-\d{2}-\d{2}$/;

function validarData(dia: string) {
  if (!DIA.test(dia) || new Date(`${dia}T12:00:00Z`).toISOString().slice(0, 10) !== dia) {
    throw new Error("Data inválida.");
  }
}

function minutos(hora: string) {
  const [h = 0, m = 0] = hora.split(":").map(Number);
  return h * 60 + m;
}

function hhmm(valor: string | null | undefined) {
  return valor ? String(valor).slice(0, 5) : null;
}

/**
 * Ajusta o intervalo de uma data, sem alterar o horário semanal.
 * Ambos os horários nulos significam "sem intervalo nesta data"; restaurar
 * remove a exceção e volta a usar o padrão semanal.
 */
export const salvarIntervaloDoDia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        dia: z.string().regex(DIA),
        inicio: z.string().regex(HORA).nullable(),
        fim: z.string().regex(HORA).nullable(),
      })
      .superRefine((value, ctx) => {
        if ((value.inicio === null) !== (value.fim === null)) {
          ctx.addIssue({
            code: "custom",
            message: "Informe início e fim do intervalo, ou deixe os dois vazios.",
          });
          return;
        }
        if (value.inicio !== null && value.fim !== null && value.fim <= value.inicio) {
          ctx.addIssue({
            code: "custom",
            message: "O fim do intervalo precisa ser depois do início.",
          });
        }
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    validarData(data.dia);
    const ctx = context as ContextoAutenticado;
    const tenantId = await tenantIdDoMembro(ctx);
    await exigirPermissao(ctx, tenantId, "alterar_dados_barbearia");

    const diaSemana = diaDaSemanaDoDia(data.dia);
    const { data: expediente, error: erroExpediente } = await ctx.supabase
      .from("horarios_de_funcionamento")
      .select("fechado, abre, fecha")
      .eq("tenant_id", tenantId)
      .eq("dia_semana", diaSemana)
      .maybeSingle();
    if (erroExpediente) throw new Error("Não foi possível validar o expediente.");
    if (!expediente || expediente.fechado) {
      throw new Error("Este dia está marcado como fechado. Ajuste o expediente antes de definir um intervalo.");
    }

    if (data.inicio && data.fim) {
      const abre = hhmm(expediente.abre) ?? "09:00";
      const fecha = hhmm(expediente.fecha) ?? "19:00";
      if (fecha <= abre) {
        throw new Error("O intervalo pontual exige um expediente que não atravesse a meia-noite.");
      }
      if (data.inicio <= abre || data.fim >= fecha) {
        throw new Error(`O intervalo precisa ficar dentro do expediente (${abre}–${fecha}).`);
      }
    }

    const agora = new Date().toISOString();
    const { error } = await ctx.supabase.from("excecoes_intervalo_agenda").upsert(
      {
        tenant_id: tenantId,
        dia: data.dia,
        intervalo_inicio: data.inicio ? `${data.inicio}:00` : null,
        intervalo_fim: data.fim ? `${data.fim}:00` : null,
        atualizado_por: ctx.userId,
        atualizado_em: agora,
        criado_por: ctx.userId,
      },
      { onConflict: "tenant_id,dia" },
    );
    if (error) throw new Error("Não foi possível salvar o intervalo deste dia.");
    return { ok: true };
  });

/** Remove a exceção; o intervalo volta a seguir a configuração semanal. */
export const restaurarIntervaloDoDia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z.object({ dia: z.string().regex(DIA) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    validarData(data.dia);
    const ctx = context as ContextoAutenticado;
    const tenantId = await tenantIdDoMembro(ctx);
    await exigirPermissao(ctx, tenantId, "alterar_dados_barbearia");
    const { error } = await ctx.supabase
      .from("excecoes_intervalo_agenda")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("dia", data.dia);
    if (error) throw new Error("Não foi possível restaurar o intervalo semanal.");
    return { ok: true };
  });
