import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { exigirPermissao, tenantIdDoMembro } from "@/lib/tenant";
import { LIMITE_DA_MENSAGEM_POS, limparMensagemPos } from "./mensagem-pos-agendamento";

/** Lê a mensagem; sem a migração 0061 aplicada devolve vazio (nunca quebra a tela). */
export const getMensagemPosAgendamento = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ mensagem: string }> => {
    const tenantId = await tenantIdDoMembro(context);
    const { data, error } = await context.supabase
      .from("tenants")
      .select("mensagem_pos_agendamento")
      .eq("id", tenantId)
      .maybeSingle();
    if (error) return { mensagem: "" };
    return { mensagem: data?.mensagem_pos_agendamento ?? "" };
  });

export const salvarMensagemPosAgendamento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z.object({ mensagem: z.string().max(LIMITE_DA_MENSAGEM_POS + 200) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "alterar_dados_barbearia");
    const { error } = await context.supabase
      .from("tenants")
      .update({ mensagem_pos_agendamento: limparMensagemPos(data.mensagem) })
      .eq("id", tenantId);
    if (error) throw new Error("Não foi possível salvar agora.");
    return { ok: true };
  });
