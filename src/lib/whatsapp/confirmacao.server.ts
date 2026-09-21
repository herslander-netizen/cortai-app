/**
 * Confirmação de agendamento pelo WhatsApp — 100% determinística.
 *
 * Sem IA: a mensagem é um template preenchido com dados reais do banco, sempre
 * da barbearia dona do agendamento. Nada aqui bloqueia o agendamento: qualquer
 * falha vira registro em `envios_de_whatsapp` com status `erro`, para
 * diagnóstico e reenvio posterior.
 *
 * Arquitetura preparada para outros tipos (lembrete, cancelamento, remarcação):
 * basta chamar `registrarEnvio` com outro `tipo`.
 */
import { FUSO_BARBEARIA } from "@/lib/horarios";

import { conversaDoTelefone, configuracaoDoTenant, enviarPelaBarbearia } from "./fluxo.server";

export type TipoDeEnvio = "confirmacao_agendamento";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function digitos(valor: string) {
  return valor.replace(/\D/g, "");
}

function dataBr(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: FUSO_BARBEARIA,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso));
}

function horaBr(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: FUSO_BARBEARIA,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function reais(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export type DadosDaConfirmacao = {
  cliente: string;
  barbearia: string;
  servico: string | null;
  profissional: string | null;
  inicio: string;
  valorCentavos: number;
  linkPagamento: string | null;
};

/** Template fixo da confirmação. Nenhum modelo de IA participa disto. */
export function montarMensagemDeConfirmacao(d: DadosDaConfirmacao): string {
  const linhas = [
    "✂️ Agendamento confirmado!",
    "",
    `Olá, ${d.cliente.split(" ")[0]}! Seu horário está confirmado.`,
    "",
    `💈 ${d.barbearia}`,
  ];
  if (d.servico) linhas.push(`✂️ ${d.servico}`);
  if (d.profissional) linhas.push(`👤 Profissional: ${d.profissional}`);
  linhas.push(`📅 ${dataBr(d.inicio)}`);
  linhas.push(`🕐 ${horaBr(d.inicio)}`);
  if (d.valorCentavos > 0) linhas.push(`💰 ${reais(d.valorCentavos)}`);
  if (d.linkPagamento) {
    linhas.push("", "💳 Pagamento antecipado", `Pagar agora: ${d.linkPagamento}`);
  }
  linhas.push("", "Estamos te esperando! ✂️");
  return linhas.join("\n");
}

type Resultado = { enviado: boolean; motivo?: string };

/**
 * Envia (uma única vez) a confirmação de um agendamento. Nunca lança: o
 * agendamento já está salvo e não pode ser afetado por falha de WhatsApp.
 */
export async function enviarConfirmacaoDeAgendamento(agendamentoId: string): Promise<Resultado> {
  try {
    return await executar(agendamentoId);
  } catch (e) {
    const motivo = e instanceof Error ? e.message : "Falha inesperada no envio.";
    try {
      const db = await admin();
      await db
        .from("envios_de_whatsapp")
        .update({ status: "erro", erro: motivo.slice(0, 500) })
        .eq("agendamento_id", agendamentoId)
        .eq("tipo", "confirmacao_agendamento");
    } catch {
      /* diagnóstico já perdido; o agendamento continua íntegro */
    }
    return { enviado: false, motivo };
  }
}

async function executar(agendamentoId: string): Promise<Resultado> {
  const db = await admin();

  const { data: ag } = await db
    .from("agendamentos")
    .select(
      "id, tenant_id, cliente_id, inicio, status, valor_centavos, clientes(nome, telefone), servicos(nome), profissionais(nome)",
    )
    .eq("id", agendamentoId)
    .maybeSingle();
  if (!ag) return { enviado: false, motivo: "Agendamento não encontrado." };
  if (["cancelado", "falta", "estornado"].includes(String(ag.status))) {
    return { enviado: false, motivo: "Agendamento não está ativo." };
  }

  const cliente = (ag as any).clientes as { nome: string; telefone: string | null } | null;
  const telefone = digitos(String(cliente?.telefone ?? ""));
  if (!telefone) return { enviado: false, motivo: "Cliente sem WhatsApp cadastrado." };

  const config = await configuracaoDoTenant(ag.tenant_id);
  if (!config.confirmacaoAutomatica) return { enviado: false, motivo: "Confirmação automática desligada." };

  // Idempotência: um único registro por agendamento + tipo.
  const { data: existente } = await db
    .from("envios_de_whatsapp")
    .select("id, status, tentativas")
    .eq("agendamento_id", agendamentoId)
    .eq("tipo", "confirmacao_agendamento")
    .maybeSingle();
  if (existente && (existente.status === "enviado" || existente.status === "enviando")) {
    return { enviado: false, motivo: "Confirmação já processada." };
  }

  let registroId = existente?.id ?? null;
  if (!registroId) {
    const { data: criado, error } = await db
      .from("envios_de_whatsapp")
      .insert({
        tenant_id: ag.tenant_id,
        agendamento_id: ag.id,
        cliente_id: ag.cliente_id,
        telefone,
        tipo: "confirmacao_agendamento",
        status: "enviando",
        tentativas: 1,
      })
      .select("id")
      .single();
    if (error) return { enviado: false, motivo: "Confirmação já processada." };
    registroId = criado.id;
  } else {
    await db
      .from("envios_de_whatsapp")
      .update({ status: "enviando", tentativas: (existente?.tentativas ?? 0) + 1, erro: null })
      .eq("id", registroId);
  }

  const marcarErro = async (motivo: string) => {
    await db
      .from("envios_de_whatsapp")
      .update({ status: "erro", erro: motivo.slice(0, 500) })
      .eq("id", registroId!);
    return { enviado: false, motivo };
  };

  const { data: conexao } = await db
    .from("conexoes_whatsapp")
    .select("id, sessao_id, status")
    .eq("tenant_id", ag.tenant_id)
    .maybeSingle();
  if (!conexao || conexao.status !== "conectado") {
    return marcarErro("WhatsApp da barbearia não está conectado.");
  }

  const { data: tenant } = await db.from("tenants").select("nome").eq("id", ag.tenant_id).maybeSingle();

  const texto = montarMensagemDeConfirmacao({
    cliente: cliente?.nome ?? "cliente",
    barbearia: tenant?.nome ?? "Barbearia",
    servico: ((ag as any).servicos?.nome as string | undefined) ?? null,
    profissional: ((ag as any).profissionais?.nome as string | undefined) ?? null,
    inicio: ag.inicio,
    valorCentavos: ag.valor_centavos ?? 0,
    linkPagamento: config.pagamentoAntecipado && config.linkPagamento ? config.linkPagamento : null,
  });

  const conversa = await conversaDoTelefone({
    tenantId: ag.tenant_id,
    conexaoId: conexao.id,
    telefone,
    nomeContato: cliente?.nome ?? null,
  });

  try {
    await enviarPelaBarbearia({
      tenantId: ag.tenant_id,
      conversaId: conversa.id,
      conexaoId: conexao.id,
      sessaoId: conexao.sessao_id,
      telefone,
      texto,
      porIa: false,
    });
  } catch (e) {
    return marcarErro(e instanceof Error ? e.message : "Falha ao enviar pelo WhatsApp.");
  }

  await db
    .from("envios_de_whatsapp")
    .update({ status: "enviado", conteudo: texto, erro: null, enviado_em: new Date().toISOString() })
    .eq("id", registroId);

  return { enviado: true };
}
