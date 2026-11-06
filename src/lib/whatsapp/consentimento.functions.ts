import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { tenantIdDoMembro, exigirPermissao } from "@/lib/tenant";

import {
  registrarConsentimentoWhatsapp,
  revogarConsentimentoWhatsapp,
} from "./consentimento.server";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/**
 * A equipe só registra consentimento quando confirma que já obteve autorização
 * explícita do cliente. O tenant e o telefone sempre são resolvidos no servidor.
 */
export const registrarPreferenciaWhatsappDoCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { clienteId: string; autorizado: boolean }) => {
    if (!data?.clienteId) throw new Error("Cliente inválido.");
    if (typeof data.autorizado !== "boolean") throw new Error("Informe a autorização do cliente.");
    return { clienteId: data.clienteId, autorizado: data.autorizado };
  })
  .handler(async ({ data, context }) => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "editar_clientes");

    const db = await admin();
    const { data: cliente, error } = await db
      .from("clientes")
      .select("id, telefone")
      .eq("id", data.clienteId)
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (error || !cliente?.telefone) throw new Error("Cliente não encontrado ou sem telefone válido.");

    if (data.autorizado) {
      await registrarConsentimentoWhatsapp({
        tenantId,
        clienteId: cliente.id,
        telefone: cliente.telefone,
        fonte: "painel_equipe",
        evidencia: {
          mecanismo: "confirmacao_da_equipe",
          membroId: context.userId,
          registro: "personalizacao_do_cliente",
        },
        textoConsentimento:
          "O cliente autorizou receber pelo WhatsApp avisos de agendamento, fila de espera e relacionamento deste estabelecimento.",
        criadoPor: context.userId,
      });
    } else {
      await revogarConsentimentoWhatsapp({
        tenantId,
        clienteId: cliente.id,
        telefone: cliente.telefone,
        fonte: "painel_equipe",
        evidencia: {
          mecanismo: "revogacao_pelo_painel",
          membroId: context.userId,
          registro: "personalizacao_do_cliente",
        },
        revogadoPor: context.userId,
      });
    }

    return { ok: true };
  });
