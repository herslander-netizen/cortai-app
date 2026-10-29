import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { exigirPermissao, tenantIdDoMembro, type ContextoAutenticado } from "@/lib/tenant";

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const DIA = /^\d{4}-\d{2}-\d{2}$/;

function validarData(dia: string) {
  if (!DIA.test(dia)) throw new Error("Data inválida.");
  const data = new Date(`${dia}T12:00:00Z`);
  if (Number.isNaN(data.getTime()) || data.toISOString().slice(0, 10) !== dia) {
    throw new Error("Data inválida.");
  }
}

const entrada = z
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
        message: "O fim do intervalo precisa ser posterior ao início.",
      });
    }
  });

type EntradaIntervalo = z.infer<typeof entrada>;

async function executarIntervalo(
  context: unknown,
  data: EntradaIntervalo,
  acao: "salvar" | "restaurar",
) {
  validarData(data.dia);
  const ctx = context as ContextoAutenticado;
  const tenantId = await tenantIdDoMembro(ctx);
  await exigirPermissao(ctx, tenantId, "alterar_dados_barbearia");

  const { data: resultado, error } = await ctx.supabase.rpc("salvar_intervalo_agenda_dia", {
    _tenant_id: tenantId,
    _dia: data.dia,
    _acao: acao,
    _intervalo_inicio: acao === "restaurar" ? null : data.inicio,
    _intervalo_fim: acao === "restaurar" ? null : data.fim,
  });
  if (error) throw new Error(error.message || "Não foi possível salvar o intervalo deste dia.");
  return resultado;
}

/**
 * Ajusta o intervalo de uma data sem alterar o padrão semanal.
 * A gravação, a validação de conflitos e os locks são atômicos no banco.
 */
export const salvarIntervaloDoDia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => entrada.parse(input))
  .handler(async ({ data, context }) => executarIntervalo(context, data, "salvar"));

/** Remove a exceção e volta a usar o intervalo semanal, com a mesma validação transacional. */
export const restaurarIntervaloDoDia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ dia: z.string().regex(DIA) }).parse(input))
  .handler(async ({ data, context }) =>
    executarIntervalo(context, { dia: data.dia, inicio: null, fim: null }, "restaurar"),
  );
