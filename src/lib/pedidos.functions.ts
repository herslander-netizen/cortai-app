import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { tenantIdDoMembro } from "@/lib/tenant";

async function exigir(context: any, permissao: string) {
  const tenantId = await tenantIdDoMembro(context);
  const { data: permitido } = await context.supabase.rpc("has_tenant_permission", { _tenant_id: tenantId, _permission: permissao });
  if (!permitido) throw new Error("Você não tem permissão para esta ação.");
  return tenantId;
}

export const getPedidosPagamento = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const tenantId = await exigir(context, "confirmar_pagamento");
    const { data, error } = await context.supabase.from("agendamentos")
      .select("id,inicio,status,forma_pagamento,valor_centavos,pagamento_confirmado_em,clientes(nome),servicos(nome),profissionais(nome)")
      .eq("tenant_id", tenantId).not("status", "in", "(cancelado,falta)").order("inicio", { ascending: false }).limit(60);
    if (error) throw new Error(error.message);
    return (data ?? []).map((item) => ({ id: item.id, inicio: item.inicio, status: item.status, formaPagamento: item.forma_pagamento, valorCentavos: item.valor_centavos, pagoEm: item.pagamento_confirmado_em, cliente: item.clientes?.nome ?? "Cliente", servico: item.servicos?.nome ?? "Serviço", profissional: item.profissionais?.nome ?? "—" }));
  });

export const confirmarPagamento = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ agendamentoId: z.string().uuid(), formaPagamento: z.enum(["pix", "dinheiro", "cartao", "fiado", "credito"]) }).parse(input))
  .handler(async ({ data, context }) => {
    await exigir(context, "confirmar_pagamento");
    const { data: resultado, error } = await context.supabase.rpc("confirmar_pagamento_agendamento", { _agendamento_id: data.agendamentoId, _forma_pagamento: data.formaPagamento });
    if (error) throw new Error(error.message);
    return resultado;
  });