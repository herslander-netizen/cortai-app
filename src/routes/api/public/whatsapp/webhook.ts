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
import { createHmac, timingSafeEqual } from "node:crypto";
import { verificarWebhookIndependente, WebhookVerificationError } from "@/lib/webhooks/lovable-signature.server";
import { lerCorpoLimitado } from "@/lib/webhooks/read-limited-body.server";

/** Valida a assinatura oficial da Meta sobre o corpo cru, sem normalizar o JSON. */
export function verificarAssinaturaMeta(
  corpo: string,
  assinatura: string | null,
  appSecret: string | undefined,
): boolean {
  if (!assinatura || !appSecret || !assinatura.startsWith("sha256=")) return false;
  const esperada =
    "sha256=" + createHmac("sha256", appSecret).update(corpo, "utf8").digest("hex");
  const recebidaBytes = Buffer.from(assinatura, "utf8");
  const esperadaBytes = Buffer.from(esperada, "utf8");
  return (
    recebidaBytes.length === esperadaBytes.length &&
    timingSafeEqual(recebidaBytes, esperadaBytes)
  );
}

type MudancaMeta = {
  field?: string;
  value?: {
    metadata?: { phone_number_id?: string; display_phone_number?: string };
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
      button?: { payload?: string; text?: string };
      context?: { id?: string };
      interactive?: { button_reply?: { id?: string; title?: string } };
    }[];
    statuses?: {
      id?: string;
      status?: string;
      recipient_id?: string;
      timestamp?: string;
      errors?: { code?: number; title?: string; message?: string }[];
    }[];
    errors?: { code?: number; title?: string; message?: string }[];
  };
};

const TIPOS_DE_MIDIA = new Set(["audio", "image", "document", "location", "interactive"]);

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/**
 * Barbearia dona do aviso: pelo phone_number_id que a Meta envia em value.metadata.
 * Sem correspondência, o aviso fica registrado com erro e não é processado.
 */
async function conexaoMeta(phoneNumberId: string | null, numeroExibido: string | null) {
  const db = await admin();
  const { rotearConexaoMeta } = await import("@/lib/whatsapp/roteamento-meta");
  const { data } = await db
    .from("conexoes_whatsapp")
    .select("id, tenant_id, sessao_id, meta_phone_number_id, numero, compartilhada")
    .eq("provedor", "meta")
    .order("criado_em", { ascending: true });
  const rota = rotearConexaoMeta((data ?? []) as never, phoneNumberId, numeroExibido);
  if (rota.tipo === "erro") throw new Error(rota.motivo);
  if (rota.aprenderIds.length > 0 && phoneNumberId) {
    // Todas as conexões do mesmo número passam a gravar o id; várias = compartilhada.
    await db
      .from("conexoes_whatsapp")
      .update({
        meta_phone_number_id: phoneNumberId,
        ...(rota.compartilhada ? { compartilhada: true } : {}),
      })
      .in("id", rota.aprenderIds);
  }
  return rota.conexao;
}

async function processarMensagens(mudanca: MudancaMeta): Promise<void> {
  const valor = mudanca.value;
  const mensagens = valor?.messages ?? [];
  if (!valor || mensagens.length === 0) return;

  const conexao = await conexaoMeta(
    valor.metadata?.phone_number_id ?? null,
    valor.metadata?.display_phone_number ?? null,
  );

  const fluxo = await import("@/lib/whatsapp/fluxo.server");
  const { toqueDaMensagem } = await import("@/lib/whatsapp/modelos");
  for (const mensagem of mensagens) {
    const telefone = mensagem.from ?? "";
    if (!telefone) continue;
    // Toque em botão (resposta rápida de modelo ou botão interativo) vira texto:
    // o identificador do botão segue como conteúdo para a regra do lembrete.
    const toque = toqueDaMensagem(mensagem);
    const tipoBruto = toque ? "text" : (mensagem.type ?? "text");
    const tipo = TIPOS_DE_MIDIA.has(tipoBruto)
      ? tipoBruto
      : tipoBruto === "text"
        ? "text"
        : "unknown";
    const contato = valor.contacts?.find((c) => c.wa_id === telefone) ?? valor.contacts?.[0];
    const conteudo =
      toque ??
      (tipo === "text"
        ? (mensagem.text?.body ?? "")
        : (mensagem.image?.caption ?? mensagem.document?.caption ?? ""));
    await fluxo.processarMensagemRecebida({
      sessaoId: conexao.sessao_id,
      mensagemExternaId: mensagem.id ?? null,
      telefone,
      nomeContato: contato?.profile?.name ?? null,
      tipo,
      conteudo,
      midiaUrl: null,
      citadaId: mensagem.context?.id ?? null,
    });
  }
}

async function processarEntregas(mudanca: MudancaMeta): Promise<void> {
  const estados = mudanca.value?.statuses ?? [];
  if (estados.length === 0) return;
  const { aplicarEntrega } = await import("@/lib/whatsapp/entregas.server");
  for (const estado of estados) {
    await aplicarEntrega(estado);
  }
}

async function processar(mudanca: MudancaMeta): Promise<void> {
  if (mudanca.field === "messages" && (mudanca.value?.messages?.length ?? 0) > 0) {
    await processarMensagens(mudanca);
  }
  if (mudanca.field === "messages" && (mudanca.value?.statuses?.length ?? 0) > 0) {
    await processarEntregas(mudanca);
  }
  if (
    mudanca.field === "message_template_status_update" ||
    mudanca.field === "template_category_update"
  ) {
    const { atualizarModeloPeloWebhook } = await import("@/lib/whatsapp/modelos.server");
    await atualizarModeloPeloWebhook(mudanca.field, (mudanca.value ?? {}) as never);
  }
  // Demais tipos (erros da conta, histórico) ficam gravados na caixa
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
    .limit(1);
  for (const pendente of pendentes ?? []) {
    if (pendente.id === excluirId) continue;
    const { data: reivindicado, error: reivindicarErro } = await db.rpc(
      "claim_whatsapp_webhook_event",
      {
        _id: pendente.id,
        _stale_before: new Date(Date.now() - 5 * 60_000).toISOString(),
      },
    );
    if (reivindicarErro) {
      console.error("[whatsapp/meta] falha ao reivindicar webhook pendente", {
        eventoId: pendente.id,
        erro: reivindicarErro.message,
      });
      continue;
    }
    if (!reivindicado) continue;
    try {
      const corpo = pendente.payload as { entry?: { changes?: MudancaMeta[] }[] };
      for (const entrada of corpo.entry ?? []) {
        for (const mudanca of entrada.changes ?? []) {
          await processar(mudanca);
        }
      }
      const { data: concluido, error: concluirErro } = await db
        .from("whatsapp_webhook_events")
        .update({ processed_at: new Date().toISOString(), processing_error: null, processing_started_at: null })
        .eq("id", pendente.id)
        .select("id")
        .maybeSingle();
      if (concluirErro || !concluido) {
        throw new Error("Falha ao registrar conclusão do webhook pendente.");
      }
    } catch (erro) {
      const { error: registrarErro } = await db
        .from("whatsapp_webhook_events")
        .update({
          processing_error: erro instanceof Error ? erro.message : "Falha ao processar.",
          processing_started_at: null,
        })
        .eq("id", pendente.id);
      if (registrarErro) {
        console.error("[whatsapp/meta] falha ao registrar erro do webhook pendente", {
          eventoId: pendente.id,
          erro: registrarErro.message,
        });
      }
    }
  }
}

export const Route = createFileRoute("/api/public/whatsapp/webhook")({
  server: {
    handlers: {
      /** Verificação de URL da Meta (quando a Meta chama direto, sem intermediário). */
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const token = process.env["META_VERIFY_TOKEN"];
        if (
          token &&
          url.searchParams.get("hub.mode") === "subscribe" &&
          url.searchParams.get("hub.verify_token") === token
        ) {
          return new Response(url.searchParams.get("hub.challenge") ?? "", { status: 200 });
        }
        const guard = await import("@/lib/webhook-guard.server");
        return guard.rejeitar(request, "whatsapp/meta", "verify_token invalido", 403);
      },
      POST: async ({ request }) => {
        const guard = await import("@/lib/webhook-guard.server");
        const abuso = await guard.barrarAbusivo(request, "whatsapp/meta");
        if (abuso) return abuso;

        const appSecret = process.env["META_APP_SECRET"];
        const assinaturaMeta = request.headers.get("x-hub-signature-256");
        const segredo = process.env["WHATSAPP_API_KEY"];

        let payload: unknown;
        let entregaId: string | null;
        let evento: string | null;

        if (assinaturaMeta) {
          // Chamada direta da Meta: X-Hub-Signature-256 = HMAC-SHA256(corpo cru, App Secret).
          if (!appSecret)
            return guard.rejeitar(request, "whatsapp/meta", "META_APP_SECRET ausente");
          const lido = await lerCorpoLimitado(request, 4 * 1024 * 1024);
          if ("status" in lido) {
            return guard.rejeitar(
              request,
              "whatsapp/meta",
              lido.status === 413 ? "corpo grande" : "corpo UTF-8 inválido",
              lido.status,
            );
          }
          const corpo = lido.corpo;
          if (!verificarAssinaturaMeta(corpo, assinaturaMeta, appSecret)) {
            return guard.rejeitar(request, "whatsapp/meta", "x-hub-signature-256 invalida");
          }
          try {
            payload = JSON.parse(corpo);
          } catch {
            return new Response("Invalid payload", { status: 400 });
          }
          entregaId = "meta:" + createHmac("sha256", "id").update(corpo).digest("hex");
          evento = "whatsapp.meta";
        } else {
          // Entrega pelo conector do Lovable, assinada com a chave da integração.
          if (!segredo) return guard.rejeitar(request, "whatsapp/meta", "sem assinatura");
          try {
            const verificado = await verificarWebhookIndependente({
              req: request,
              secret: segredo,
              maxBodyBytes: 4 * 1024 * 1024,
            });
            payload = verificado.payload;
          } catch (erro) {
            if (erro instanceof WebhookVerificationError) {
              const status =
                erro.code === "body_too_large" ? 413 :
                erro.code === "missing_signature" || erro.code === "invalid_signature" ? 401 : 400;
              return guard.rejeitar(request, "whatsapp/meta", erro.code, status);
            }
            throw erro;
          }
          entregaId = request.headers.get("x-lovable-delivery");
          evento = request.headers.get("x-lovable-event");
        }

        const limite = await guard.limiteAutenticado(request, "whatsapp/meta");
        if (limite) return limite;
        if (!entregaId || !evento) return new Response("Missing delivery headers", { status: 400 });
        const verificado = { payload };

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
              payload:
                verificado.payload as unknown as import("@/integrations/supabase/types").Json,
            })
            .select("id")
            .single();
          if (error || !gravado) {
            return new Response("Failed to store delivery", { status: 500 });
          }
          eventoId = gravado.id as string;
        }

        const { data: reivindicado, error: reivindicarErro } = await db.rpc(
          "claim_whatsapp_webhook_event",
          {
            _id: eventoId,
            _stale_before: new Date(Date.now() - 5 * 60_000).toISOString(),
          },
        );
        if (reivindicarErro) {
          console.error("[whatsapp/meta] falha ao reivindicar webhook", {
            eventoId,
            erro: reivindicarErro.message,
          });
          return new Response("Webhook claim failed", { status: 500 });
        }
        if (!reivindicado) {
          return Response.json({ ok: true, motivo: "em_processamento" });
        }

        try {
          const corpo = verificado.payload as { entry?: { changes?: MudancaMeta[] }[] };
          for (const entrada of corpo.entry ?? []) {
            for (const mudanca of entrada.changes ?? []) {
              await processar(mudanca);
            }
          }
          const { data: concluido, error: concluirErro } = await db
            .from("whatsapp_webhook_events")
            .update({ processed_at: new Date().toISOString(), processing_error: null })
            .eq("id", eventoId)
            .select("id")
            .maybeSingle();
          if (concluirErro || !concluido) {
            throw new Error("Falha ao registrar conclusão do webhook.");
          }
          // A retomada é trabalho secundário: no Cloudflare, registrar em waitUntil
          // evita que a execução seja interrompida quando a resposta HTTP terminar.
          const retomada = reprocessarPendentes(eventoId).catch((erro) => {
            console.error("[whatsapp/meta] falha ao retomar webhooks pendentes", erro);
          });
          const { emSegundoPlano } = await import("@/lib/segundo-plano.server");
          if (!emSegundoPlano(retomada)) {
            // Em ambientes sem waitUntil, limitar a espera da resposta; o erro é logado acima.
            await Promise.race([
              retomada,
              new Promise((resolve) => setTimeout(resolve, 3000)),
            ]);
          }
          return Response.json({ ok: true });
        } catch (erro) {
          const mensagem = erro instanceof Error ? erro.message : "Falha ao processar.";
          console.error("[whatsapp/meta] falha ao processar webhook", erro);
          await db
            .from("whatsapp_webhook_events")
            .update({ processing_error: mensagem, processing_started_at: null })
            .eq("id", eventoId);
          // Detalhes internos ficam no log/inbox; não são expostos ao remetente.
          return new Response("Webhook processing failed", { status: 500 });
        }
      },
    },
  },
});
