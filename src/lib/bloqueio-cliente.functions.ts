import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { exigirPermissao, tenantIdDoMembro } from "@/lib/tenant";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function esquemaAusente(mensagem: string): boolean {
  return /agendamento_bloqueado|schema cache|column .* does not exist|could not find the .* column/i.test(
    mensagem,
  );
}

export const getBloqueioAgendamentoCliente = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ clienteId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const tenantId = await tenantIdDoMembro(context);
    const db = await admin();
    const { data: cliente, error } = await db
      .from("clientes")
      .select("id, agendamento_bloqueado, agendamento_bloqueado_em, agendamento_bloqueio_motivo")
      .eq("id", data.clienteId)
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (error && esquemaAusente(error.message)) {
      return {
        disponivel: false as const,
        bloqueado: false,
        bloqueadoEm: null,
        motivo: null,
      };
    }
    if (error) throw new Error("Não foi possível consultar o bloqueio do cliente.");
    if (!cliente) throw new Error("Cliente não encontrado neste negócio.");

    return {
      disponivel: true as const,
      bloqueado: Boolean(cliente.agendamento_bloqueado),
      bloqueadoEm: cliente.agendamento_bloqueado_em,
      motivo: cliente.agendamento_bloqueio_motivo,
    };
  });

export const definirBloqueioAgendamentoCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        clienteId: z.string().uuid(),
        bloqueado: z.boolean(),
        motivo: z.string().trim().max(300).nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "editar_clientes");
    const db = await admin();
    const { data: cliente, error } = await db
      .from("clientes")
      .update({
        agendamento_bloqueado: data.bloqueado,
        agendamento_bloqueado_em: data.bloqueado ? new Date().toISOString() : null,
        agendamento_bloqueado_por: data.bloqueado ? context.userId : null,
        agendamento_bloqueio_motivo: data.bloqueado ? data.motivo?.trim() || null : null,
      })
      .eq("id", data.clienteId)
      .eq("tenant_id", tenantId)
      .select("id")
      .maybeSingle();

    if (error && esquemaAusente(error.message)) {
      throw new Error("O bloqueio específico ainda depende da migração do banco.");
    }
    if (error) throw new Error("Não foi possível salvar o bloqueio do cliente.");
    if (!cliente) throw new Error("Cliente não encontrado neste negócio.");
    return { ok: true, bloqueado: data.bloqueado };
  });
