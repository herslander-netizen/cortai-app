/**
 * Entrada oficial dos avisos do WhatsApp Business (Meta) para o Cortaí.
 *
 * O Lovable encaminha para cá cada mudança que a Meta envia para o número
 * conectado (mensagens de clientes, confirmações de entrega, erros).
 *
 * Segurança e confiabilidade:
 * - toda entrega tem a assinatura conferida antes de qualquer processamento;
 * - cada entrega é gravada primeiro em `whatsapp_webhook_events` (caixa de
 *   entrada durável); a mesma entrega nunca é processada duas vezes;
 * - a barbearia dona da conversa vem SEMPRE da conexão registrada no banco,
 *   nunca do conteúdo do aviso;
 * - falha de processamento responde 5xx para que a entrega seja reenviada.
 */
import { createFileRoute } from "@tanstack/react-router";
import { verifyWebhookRequest, WebhookError } from "@lovable.dev/webhooks-js";

type MudancaMeta = {
  field?: string;
  value?: {
    contacts?: { profile?: { name?: string }; wa_id?: string }[];
    messages?: {
      id?: string;
      from?: string;
      type?: string;
      text?: { body?: string };
      audio?: { id?: string };
      image?: { id?: string; caption?: string };
      document?: { id?: string; caption?: string };
      location?: { latitude?: number; longitude?: number };
    }[];
    statuses?: {
      id?: string;
      status?: string;
      recipient_id?: string;
      errors?: { code?: number; title?: string; message?: string }[];
    }[];
    errors?: { code?: number; title?: string; message?: string }[];
  };
};

const TIPOS_DE_MIDIA = new Set(["audio", "image", "document", "location", "interactive"]);

/** Ordem de avanço do estado de entrega: um aviso antigo nunca regride. */
const ORDEM_ENTREGA: Record<string, number> = { enviada: 1, entregue: 2, lida: 3, falhou: 9 };

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** A conta oficial atende uma barbearia por vez: a dona da conexão "meta". */
async function conexaoMeta() {
  const db = await admin();
  const { data } = await db
    .from("conexoes_whatsapp")
    .select("id, tenant_id, sessao_id, status")
    .eq("provedor", "meta")
    .order("criado_em", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

async function processarMensagens(mudanca: MudancaMeta): Promise<void> {
  const valor = mudanca.value;
  const mensagens = valor?.messages ?? [];
  if (!valor || mensagens.length === 0) return;

  const conexao = await conexaoMeta();
  if (!conexao) throw new Error("Nenhuma barbearia com a conta oficial de WhatsApp ativada.");

  const fluxo = await import("@/lib/whatsapp/fluxo.server");
  for (const mensagem of mensagens) {
    const telefone = mensagem.from ?? "";
    if (!telefone) continue;
    const tipoBruto = mensagem.type ?? "text";
    const tipo = TIPOS_DE_MIDIA.has(tipoBruto) ? tipoBruto : tipoBruto === "text" ? "text" : "unknown";
    const contato = valor.contacts?.find((c) => c.wa_id === telefone) ?? valor.contacts?.[0];
    const conteudo =
      tipo === "text"
        ? (mensagem.text?.body ?? "")
        : (mensagem.image?.caption ?? mensagem.document?.caption ?? "");
    await fluxo.processarMensagemRecebida({
      sessaoId: conexao.sessao_id,
      mensagemExternaId: mensagem.id ?? null,
      telefone,
      nomeContato: contato?.profile?.name ?? null,
      tipo,
      conteudo,
      midiaUrl: null,
    });
  }
}

async function processarEntregas(mudanca: MudancaMeta): Promise<void> {
  const estados = mudanca.value?.statuses ?? [];
  if (estados.length === 0) return;
  const db = await admin();
  for (const estado of estados) {
    if (!estado.id || !estado.status) continue;
    const novo =
      estado.status === "sent"
        ? "enviada"
        : estado.status === "delivered"
          ? "entregue"
          : estado.status === "read"
            ? "lida"
            : estado.status === "failed"
              ? "falhou"
              : null;
    if (!novo) continue;
    const erro =
      estado.status === "failed"
        ? (estado.errors?.map((e) => e.message ?? e.title ?? String(e.code)).join("; ") ?? "Falha na entrega.")
        : null;
    // Só avança: um "enviada" atrasado não sobrescreve "entregue"/"lida".
    const { data: atual } = await db
      .from("mensagens_whatsapp")
      .select("id, status")
      .eq("mensagem_externa_id", estado.id)
      .maybeSingle();
    if (!atual) continue; // pode chegar antes do registro do envio; fica na caixa de entrada
    if ((ORDEM_ENTREGA[atual.status] ?? 0) >= (ORDEM_ENTREGA[novo] ?? 0)) continue;
    await db
      .from("mensagens_whatsapp")
      .update({ status: novo, ...(erro ? { erro } : {}) })
      .eq("id", atual.id);
  }
}

async function processar(mudanca: MudancaMeta): Promise<void> {
  if (mudanca.field === "messages" && (mudanca.value?.messages?.length ?? 0) > 0) {
    await processarMensagens(mudanca);
  }
  if (mudanca.field === "messages" && (mudanca.value?.statuses?.length ?? 0) > 0) {
    await processarEntregas(mudanca);
  }
  // Demais tipos (erros da conta, modelos, histórico) ficam gravados na caixa
  // de entrada para consulta, sem descartar o conteúdo.
}

/**
 * Retomada: a cada nova entrega, reprocessa algumas pendentes antigas.
 * Assim, quando as re tentativas automáticas acabam, o tráfego seguinte
 * destrava o que ficou para trás — sem depender de tarefa agendada.
 */
async function reprocessarPendentes(excluirId: string): Promise<void> {
  const db = await admin();
  const limite = new Date(Date.now() - 60_000).toISOString();
  const { data: pendentes } = await db
    .from("whatsapp_webhook_events")
    .select("id, payload")
    .is("processed_at", null)
    .lt("received_at", limite)
    .order("received_at", { ascending: true })
    .limit(5);
  for (const pendente of pendentes ?? []) {
    if (pendente.id === excluirId) continue;
    try {
      const corpo = pendente.payload as { entry?: { changes?: MudancaMeta[] }[] };
      for (const entrada of corpo.entry ?? []) {
        for (const mudanca of entrada.changes ?? []) {
          await processar(mudanca);
        }
      }
      await db
        .from("whatsapp_webhook_events")
        .update({ processed_at: new Date().toISOString(), processing_error: null })
        .eq("id", pendente.id);
    } catch (erro) {
      await db
        .from("whatsapp_webhook_events")
        .update({ processing_error: erro instanceof Error ? erro.message : "Falha ao processar." })
        .eq("id", pendente.id);
    }
  }
}

export const Route = createFileRoute("/api/public/whatsapp/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const segredo = process.env["WHATSAPP_API_KEY"];
        if (!segredo) return new Response("Integration not enabled", { status: 503 });

        let verificado;
        try {
          verificado = await verifyWebhookRequest({
            req: request,
            secret: segredo,
            maxBodyBytes: 4 * 1024 * 1024,
          });
        } catch (erro) {
          if (erro instanceof WebhookError) {
            const status = erro.code === "invalid_signature" ? 401 : 400;
            return new Response(erro.message, { status });
          }
          throw erro;
        }

        const entregaId = request.headers.get("x-lovable-delivery");
        const evento = request.headers.get("x-lovable-event");
        if (!entregaId || !evento) return new Response("Missing delivery headers", { status: 400 });

        const db = await admin();
        const { data: existente } = await db
          .from("whatsapp_webhook_events")
          .select("id, processed_at")
          .eq("delivery_id", entregaId)
          .maybeSingle();
        if (existente?.processed_at) return Response.json({ ok: true, motivo: "duplicada" });

        let eventoId = existente?.id as string | undefined;
        if (!eventoId) {
          const { data: gravado, error } = await db
            .from("whatsapp_webhook_events")
            .insert({
              delivery_id: entregaId,
              event: evento,
              payload: verificado.payload as unknown as import("@/integrations/supabase/types").Json,
            })
            .select("id")
            .single();
          if (error || !gravado) {
            return new Response("Failed to store delivery", { status: 500 });
          }
          eventoId = gravado.id as string;
        }

        try {
          await reprocessarPendentes(eventoId);
          const corpo = verificado.payload as { entry?: { changes?: MudancaMeta[] }[] };
          for (const entrada of corpo.entry ?? []) {
            for (const mudanca of entrada.changes ?? []) {
              await processar(mudanca);
            }
          }
          await db
            .from("whatsapp_webhook_events")
            .update({ processed_at: new Date().toISOString(), processing_error: null })
            .eq("id", eventoId);
          return Response.json({ ok: true });
        } catch (erro) {
          const mensagem = erro instanceof Error ? erro.message : "Falha ao processar.";
          await db
            .from("whatsapp_webhook_events")
            .update({ processing_error: mensagem })
            .eq("id", eventoId);
          return new Response(mensagem, { status: 500 });
        }
      },
    },
  },
});
