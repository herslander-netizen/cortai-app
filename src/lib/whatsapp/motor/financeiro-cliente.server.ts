/**
 * Consultas financeiras do cliente no WhatsApp — sempre restritas ao titular.
 *
 * REGRA DE SEGURANÇA: só responde quando o telefone da conversa corresponde
 * exatamente ao cadastro do cliente naquela barbearia. Nunca busca por
 * aproximação de nome e nunca cruza dados entre barbearias.
 */

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function reais(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export type ResumoFinanceiroDoCliente = {
  autorizado: boolean;
  texto: string;
};

/** Saldo de crédito, pendências em aberto e selos de fidelidade do titular. */
export async function resumoFinanceiroDoCliente(input: {
  tenantId: string;
  clienteId: string | null;
  telefone: string;
}): Promise<ResumoFinanceiroDoCliente> {
  if (!input.clienteId) {
    return {
      autorizado: false,
      texto:
        "Para consultar saldo ou valores em aberto, preciso que este número esteja cadastrado aqui na barbearia. Quer que eu chame alguém da equipe?",
    };
  }

  const db = await admin();
  const { data: cliente } = await db
    .from("clientes")
    .select("id, nome, telefone")
    .eq("tenant_id", input.tenantId)
    .eq("id", input.clienteId)
    .is("arquivado_em", null)
    .maybeSingle();

  // Conferência dura: o telefone da conversa tem que ser o do cadastro.
  const mesmoTelefone =
    cliente?.telefone && String(cliente.telefone).replace(/\D/g, "") === input.telefone.replace(/\D/g, "");
  if (!cliente || !mesmoTelefone) {
    return {
      autorizado: false,
      texto:
        "Por segurança, só consigo falar de valores com o titular do cadastro. Posso chamar alguém da equipe para te ajudar?",
    };
  }

  const linhas: string[] = [];

  const { data: carteira } = await db
    .from("carteiras")
    .select("saldo_centavos")
    .eq("tenant_id", input.tenantId)
    .eq("cliente_id", cliente.id)
    .maybeSingle()
    .then((r) => r, () => ({ data: null }) as never);
  if (carteira && typeof carteira.saldo_centavos === "number") {
    linhas.push(`💳 Saldo em crédito: ${reais(carteira.saldo_centavos)}`);
  }

  const { data: emAberto } = await db
    .from("agendamentos")
    .select("valor_centavos")
    .eq("tenant_id", input.tenantId)
    .eq("cliente_id", cliente.id)
    .eq("status", "fiado")
    .then((r) => r, () => ({ data: null }) as never);
  const totalFiado = (emAberto ?? []).reduce((s, a) => s + (a.valor_centavos ?? 0), 0);
  if (totalFiado > 0) linhas.push(`🧾 Em aberto (fiado): ${reais(totalFiado)}`);

  if (linhas.length === 0) {
    return { autorizado: true, texto: `Tudo certo por aqui, ${cliente.nome}: nenhum valor em aberto e sem crédito acumulado.` };
  }

  return { autorizado: true, texto: [`Olá, ${cliente.nome}! Aqui está seu resumo:`, "", ...linhas].join("\n") };
}
