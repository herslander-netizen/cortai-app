/**
 * Aplica a ação do mapa de erros da Meta a um envio de aviso ao cliente.
 * Usado no erro imediato do envio e no retorno de entrega (webhook).
 * Nunca lança: falha de canal jamais quebra o fluxo principal.
 */
import { acaoDoErroMeta, linkWaMe, type AcaoDoErro } from "./erros-meta";

const ROTULO_DO_TIPO: Record<string, string> = {
  confirmacao_agendamento: "confirmação",
  alteracao_agendamento: "alteração",
  remarcacao: "remarcação",
  cancelamento: "cancelamento",
  cancelamento_agendamento: "cancelamento",
  lembrete_24h: "lembrete",
  lembrete_2h: "lembrete",
  aviso_proximo: "lembrete",
  vaga_lista_espera: "vaga da lista de espera",
  pagamento_confirmado: "pagamento",
  pos_atendimento: "pós-atendimento",
  convite_avaliacao: "avaliação",
  recuperacao_experiencia: "acompanhamento",
  retorno: "retorno",
  mudanca_operacional: "mudança de horário",
};

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function aplicarFalhaDeEnvio(input: {
  envioId: string;
  codigo: number | null;
  httpStatus?: number | null;
  motivo: string;
}): Promise<AcaoDoErro | null> {
  try {
    const db = await admin();
    const { data: envio } = await db
      .from("envios_de_whatsapp")
      .select("id, tenant_id, cliente_id, telefone, tipo, conteudo, tentativas, status")
      .eq("id", input.envioId)
      .maybeSingle();
    if (!envio) return null;

    let acao = acaoDoErroMeta(input.codigo, input.httpStatus);
    if (acao.status === "erro" && acao.maxTentativas && envio.tentativas >= acao.maxTentativas) {
      acao = { ...acao, status: "falhou" };
    }
    const agora = new Date();
    await db
      .from("envios_de_whatsapp")
      .update({
        status: acao.status,
        erro: input.motivo.slice(0, 500),
        erro_codigo: input.codigo,
        falhou_em: acao.status === "erro" ? null : agora.toISOString(),
        proxima_tentativa_em:
          acao.status === "erro"
            ? new Date(agora.getTime() + (acao.esperarMs ?? 0)).toISOString()
            : null,
      })
      .eq("id", envio.id);

    if (envio.cliente_id && (acao.marcarSemWhatsapp || acao.suprimirMarketing)) {
      await db
        .from("clientes")
        .update({
          ...(acao.marcarSemWhatsapp ? { sem_whatsapp_em: agora.toISOString() } : {}),
          ...(acao.suprimirMarketing ? { marketing_suprimido_em: agora.toISOString() } : {}),
        })
        .eq("id", envio.cliente_id);
    }

    // Um alerta aberto por negócio e tipo em 24h: a mesma pendência da conta não vira enxurrada.
    const { data: alertaAberto } = acao.alerta
      ? await db
          .from("alertas_da_plataforma")
          .select("id")
          .eq("origem", "whatsapp")
          .eq("nivel", acao.alerta)
          .eq("tenant_id", envio.tenant_id)
          .is("resolvido_em", null)
          .gte("criado_em", new Date(agora.getTime() - 24 * 3600_000).toISOString())
          .limit(1)
          .maybeSingle()
      : { data: null };
    if (acao.alerta && !alertaAberto) {
      await db.from("alertas_da_plataforma").insert({
        nivel: acao.alerta,
        origem: "whatsapp",
        titulo:
          acao.alerta === "critico"
            ? "Conta oficial do WhatsApp/Meta com problema de elegibilidade/pagamento"
            : "Modelo de mensagem do WhatsApp com problema",
        detalhes: { codigo: input.codigo, motivo: input.motivo.slice(0, 500), envio_id: envio.id },
        tenant_id: envio.tenant_id,
      });
    }

    if (acao.status !== "erro" && acao.avisarNegocio) {
      await avisarNegocioDaFalha(envio);
    }
    return acao;
  } catch (e) {
    console.error(
      "[whatsapp] falha ao registrar erro de envio:",
      e instanceof Error ? e.message : e,
    );
    return null;
  }
}

export async function avisarNegocioDaFalha(envio: {
  id: string;
  tenant_id: string;
  cliente_id: string | null;
  telefone: string;
  tipo: string;
  conteudo: string | null;
}) {
  const db = await admin();
  const marca = `envio:${envio.id}`;
  // Um aviso por envio.
  const { data: ja } = await db
    .from("notificacoes")
    .select("id")
    .eq("tenant_id", envio.tenant_id)
    .eq("tipo", "whatsapp_falhou")
    .like("link", `%#${marca}`)
    .limit(1)
    .maybeSingle();
  if (ja) return;
  const { data: cliente } = envio.cliente_id
    ? await db.from("clientes").select("nome").eq("id", envio.cliente_id).maybeSingle()
    : { data: null };
  const nome = cliente?.nome ?? "o cliente";
  const tipo = ROTULO_DO_TIPO[envio.tipo] ?? "aviso";
  const texto =
    envio.conteudo?.trim() ||
    `Olá, ${nome.split(/\s+/)[0]}! Passando para falar sobre o seu horário.`;
  await db.from("notificacoes").insert({
    tenant_id: envio.tenant_id,
    tipo: "whatsapp_falhou",
    titulo: `Não conseguimos avisar ${nome} · ${tipo}`,
    corpo: "Toque para enviar pelo seu WhatsApp, sem custo.",
    link: `${linkWaMe(envio.telefone, texto)}#${marca}`,
  });
}
