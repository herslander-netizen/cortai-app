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

export type ResumoFinanceiroDoCliente = { autorizado: boolean; texto: string };

async function titular(tenantId: string, clienteId: string, telefone: string) {
  const db = await admin();
  const { data } = await db
    .from("clientes")
    .select("id, nome, telefone")
    .eq("tenant_id", tenantId)
    .eq("id", clienteId)
    .is("arquivado_em", null)
    .maybeSingle();
  const confere =
    data?.telefone && String(data.telefone).replace(/\D/g, "") === telefone.replace(/\D/g, "");
  return confere ? data : null;
}

const NAO_IDENTIFICADO_BARBEARIA =
  "Para falar de saldo ou valores, este número precisa estar cadastrado aqui na barbearia. Quer que eu chame alguém da equipe?";
const naoIdentificado = (segmento?: string | null) =>
  !segmento || segmento === "barbearia"
    ? NAO_IDENTIFICADO_BARBEARIA
    : "Para falar de saldo ou valores, este número precisa estar cadastrado aqui. Quer que eu chame alguém da equipe?";
const NAO_AUTORIZADO =
  "Por segurança, só consigo tratar de valores com o titular do cadastro. Posso chamar alguém da equipe para te ajudar?";

/** Saldo em crédito e valores em aberto (fiado) do titular. */
export async function resumoFinanceiroDoCliente(input: {
  tenantId: string;
  clienteId: string | null;
  telefone: string;
  segmento?: string | null;
}): Promise<ResumoFinanceiroDoCliente> {
  const NAO_IDENTIFICADO = naoIdentificado(input.segmento);
  if (!input.clienteId) return { autorizado: false, texto: NAO_IDENTIFICADO };
  const cliente = await titular(input.tenantId, input.clienteId, input.telefone);
  if (!cliente) return { autorizado: false, texto: NAO_AUTORIZADO };

  const db = await admin();
  const [{ data: carteira }, { data: fiados }] = await Promise.all([
    db
      .from("carteiras")
      .select("saldo_centavos, saldo_creditos")
      .eq("tenant_id", input.tenantId)
      .eq("cliente_id", cliente.id)
      .maybeSingle(),
    db
      .from("fiados")
      .select("saldo_centavos")
      .eq("tenant_id", input.tenantId)
      .eq("cliente_id", cliente.id)
      .neq("status", "quitado"),
  ]);

  const linhas: string[] = [];
  if ((carteira?.saldo_centavos ?? 0) > 0) linhas.push(`💳 Crédito disponível: ${reais(carteira!.saldo_centavos)}`);
  if ((carteira?.saldo_creditos ?? 0) > 0) linhas.push(`🎟️ Créditos de serviço: ${carteira!.saldo_creditos}`);
  const emAberto = (fiados ?? []).reduce((soma, f) => soma + (f.saldo_centavos ?? 0), 0);
  if (emAberto > 0) linhas.push(`🧾 Em aberto: ${reais(emAberto)}`);

  if (linhas.length === 0) {
    return {
      autorizado: true,
      texto: `Tudo certo por aqui, ${cliente.nome}: você não tem valores em aberto nem créditos acumulados.`,
    };
  }
  return { autorizado: true, texto: [`Olá, ${cliente.nome}! Seu resumo:`, "", ...linhas].join("\n") };
}

/** Progresso do cartão fidelidade do titular. */
export async function fidelidadeDoCliente(input: {
  tenantId: string;
  clienteId: string | null;
  telefone: string;
  segmento?: string | null;
}): Promise<ResumoFinanceiroDoCliente> {
  const NAO_IDENTIFICADO = naoIdentificado(input.segmento);
  if (!input.clienteId) return { autorizado: false, texto: NAO_IDENTIFICADO };
  const cliente = await titular(input.tenantId, input.clienteId, input.telefone);
  if (!cliente) return { autorizado: false, texto: NAO_AUTORIZADO };

  const db = await admin();
  const { data: carteira } = await db
    .from("carteiras")
    .select("fidelidade_progresso")
    .eq("tenant_id", input.tenantId)
    .eq("cliente_id", cliente.id)
    .maybeSingle();

  const selos = carteira?.fidelidade_progresso ?? 0;
  return {
    autorizado: true,
    texto:
      selos > 0
        ? `${cliente.nome}, você já tem ${selos} ${selos === 1 ? "selo" : "selos"} no cartão fidelidade. 💈`
        : `${cliente.nome}, seu cartão fidelidade ainda não tem selos. O próximo atendimento já começa a contar. 💈`,
  };
}
