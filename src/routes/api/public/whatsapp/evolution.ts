/**
 * Entrada dos avisos da Evolution API para o Flow.
 *
 * Segurança:
 * - toda instância exige `EVOLUTION_WEBHOOK_SECRET` (ou `WHATSAPP_WEBHOOK_SECRET`),
 *   conferido em tempo constante no cabeçalho `x-webhook-secret` ou `apikey` (nunca na URL); sem segredo
 *   configurado, o webhook recusa tudo (503);
 * - a barbearia vem SEMPRE da sessão registrada (nome da instância), nunca de
 *   um tenant_id enviado pelo chamador;
 * - mensagens enviadas pela própria barbearia (fromMe) não são respondidas; se não foram enviadas pelo Flow,
 *   pausam o bot e a Flow IA naquela conversa (alguém da equipe respondeu pelo celular).
 */
import { createFileRoute } from "@tanstack/react-router";

import { autorizarWebhook } from "@/lib/whatsapp/segredo-webhook";

function textoDaMensagem(mensagem: Record<string, unknown> | undefined) {
  if (!mensagem) return { tipo: "unknown" as const, texto: "" };
  if (typeof mensagem["conversation"] === "string") {
    return { tipo: "text" as const, texto: mensagem["conversation"] };
  }
  const estendida = mensagem["extendedTextMessage"] as Record<string, unknown> | undefined;
  if (estendida && typeof estendida["text"] === "string") {
    return { tipo: "text" as const, texto: estendida["text"] };
  }
  if (mensagem["audioMessage"]) return { tipo: "audio" as const, texto: "" };
  if (mensagem["imageMessage"]) return { tipo: "image" as const, texto: "" };
  if (mensagem["documentMessage"]) return { tipo: "document" as const, texto: "" };
  if (mensagem["locationMessage"]) return { tipo: "location" as const, texto: "" };
  return { tipo: "unknown" as const, texto: "" };
}

export const Route = createFileRoute("/api/public/whatsapp/evolution")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { segredoDoWebhookDeWhatsapp } = await import("@/lib/whatsapp/gateway.server");
        const segredo = segredoDoWebhookDeWhatsapp();
        const guard = await import("@/lib/webhook-guard.server");
        const abuso = await guard.barrarAbusivo(request, "whatsapp/evolution");
        if (abuso) return abuso;

        // Fail-closed, antes de ler o corpo: sem segredo no ambiente → 503;
        // segredo ausente/errado → 401. Vale para todas as sessões.
        const auth = autorizarWebhook(request.headers, segredo);
        if (!auth.ok) {
          if (auth.status === 503) {
            console.error("[evolution] webhook recusado: EVOLUTION_WEBHOOK_SECRET ausente");
            return new Response("Service unavailable", { status: 503 });
          }
          await guard.rejeitar(request, "whatsapp/evolution", auth.motivo);
          return new Response(null, { status: 401 });
        }

        const { lerCorpoLimitado } = await import("@/lib/webhooks/read-limited-body.server");
        const lido = await lerCorpoLimitado(request, 4 * 1024 * 1024);
        if ("status" in lido) {
          return new Response(
            lido.status === 413 ? "Payload too large" : "Invalid payload",
            { status: lido.status },
          );
        }
        let corpo: Record<string, unknown>;
        try {
          const payload: unknown = JSON.parse(lido.corpo);
          if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
            return new Response("Invalid payload", { status: 400 });
          }
          corpo = payload as Record<string, unknown>;
        } catch {
          return new Response("Invalid payload", { status: 400 });
        }

        const evento = String(corpo["event"] ?? "")
          .toLowerCase()
          .replace(/_/g, ".");
        const sessaoId = String(corpo["instance"] ?? "");
        if (!sessaoId) return new Response("Missing instance", { status: 400 });

        const limite = await guard.limiteAutenticado(request, "whatsapp/evolution");
        if (limite) return limite;
        const dados = (corpo["data"] as Record<string, unknown>) ?? {};

        const fluxo = await import("@/lib/whatsapp/fluxo.server");

        if (evento === "qrcode.updated") {
          const qr = (dados["qrcode"] as Record<string, unknown>) ?? dados;
          const base64 = (qr["base64"] as string) ?? (qr["code"] as string) ?? null;
          const atualizou = await fluxo.atualizarEstadoDaConexao(sessaoId, {
            status: base64 ? "qr_ready" : "pending",
            qrCode: base64,
            qrExpiraEm: new Date(Date.now() + 2 * 60_000).toISOString(),
            numero: null,
            nomeExibicao: null,
            erro: null,
          });
          return atualizou
            ? Response.json({ ok: true })
            : new Response("Unknown session", { status: 404 });
        }

        if (evento === "connection.update") {
          const estado = String(dados["state"] ?? dados["connection"] ?? "").trim();
          const conectado = estado === "open";
          // Horário do evento na Evolution: evento atrasado não sobrescreve estado mais novo.
          const bruto = corpo["date_time"] ?? dados["date_time"];
          const data = typeof bruto === "string" ? new Date(bruto) : null;
          const eventoEm = data && !Number.isNaN(data.getTime()) ? data.toISOString() : null;
          const atualizou = await fluxo.atualizarEstadoDaConexao(sessaoId, {
            origem: "webhook_evolution",
            eventoEm,
            status: estado,
            ...(conectado ? { qrCode: null, qrExpiraEm: null } : {}),
            numero: typeof dados["number"] === "string" ? (dados["number"] as string) : null,
            nomeExibicao:
              typeof dados["profileName"] === "string" ? (dados["profileName"] as string) : null,
            erro: null,
          });
          return atualizou
            ? Response.json({ ok: true })
            : new Response("Unknown session", { status: 404 });
        }

        if (evento === "messages.upsert") {
          const chave = (dados["key"] as Record<string, unknown>) ?? {};
          const remoteJid = String(chave["remoteJid"] ?? "");
          if (chave["fromMe"] === true) {
            // Mensagem do próprio número do negócio. Se não foi o Flow que enviou, alguém da equipe respondeu pelo
            // celular: o bot e a Flow IA ficam em silêncio naquela conversa por um tempo (nunca falam por cima).
            if (remoteJid.endsWith("@s.whatsapp.net")) {
              const { texto } = textoDaMensagem(
                dados["message"] as Record<string, unknown> | undefined,
              );
              const { registrarRespostaDoNegocio } = await import("@/lib/flow-bot/humano.server");
              const trabalho = registrarRespostaDoNegocio({
                sessaoId,
                telefone: remoteJid.split("@")[0] ?? "",
                mensagemExternaId: (chave["id"] as string) ?? null,
                texto,
              }).catch(() => console.error("[evolution] falha ao registrar resposta do negócio"));
              const { emSegundoPlano } = await import("@/lib/segundo-plano.server");
              if (!emSegundoPlano(trabalho)) await trabalho;
            }
            return Response.json({ ok: true, ignorada: true });
          }
          // Grupos e transmissões não são atendidos pela Flow IA.
          if (!remoteJid || !remoteJid.endsWith("@s.whatsapp.net")) {
            return Response.json({ ok: true, ignorada: true });
          }
          const telefone = remoteJid.split("@")[0] ?? "";
          const mensagem = dados["message"] as Record<string, unknown> | undefined;
          const { tipo, texto } = textoDaMensagem(mensagem);
          if (tipo === "audio") {
            // Áudio: transcrição em segundo plano para responder 200 rápido à Evolution.
            const audioMsg = (mensagem?.["audioMessage"] as Record<string, unknown>) ?? {};
            const b64 =
              (typeof mensagem?.["base64"] === "string" && (mensagem["base64"] as string)) ||
              (typeof dados["base64"] === "string" && (dados["base64"] as string)) ||
              null;
            const trabalho = fluxo
              .processarMensagemRecebida({
                sessaoId,
                mensagemExternaId: (chave["id"] as string) ?? null,
                telefone,
                nomeContato: (dados["pushName"] as string) ?? null,
                tipo,
                conteudo: "",
                midiaUrl: null,
                audio: {
                  base64: b64,
                  mensagemBruta: { key: chave, message: { audioMessage: audioMsg } },
                  mimetype: typeof audioMsg["mimetype"] === "string" ? audioMsg["mimetype"] : null,
                  duracaoS: Number(audioMsg["seconds"]) || null,
                },
              })
              .catch(() => console.error("[evolution] falha ao processar áudio"));
            const { emSegundoPlano } = await import("@/lib/segundo-plano.server");
            if (!emSegundoPlano(trabalho)) await trabalho;
            return Response.json({ ok: true, motivo: "audio_recebido" });
          }
          const r = await fluxo.processarMensagemRecebida({
            sessaoId,
            mensagemExternaId: (chave["id"] as string) ?? null,
            telefone,
            nomeContato: (dados["pushName"] as string) ?? null,
            tipo,
            conteudo: texto,
            midiaUrl: null,
          });
          if (!r.tratada) return new Response("Unknown session", { status: 404 });
          return Response.json({ ok: true, motivo: r.motivo ?? null });
        }

        return Response.json({ ok: true, ignorado: evento });
      },
    },
  },
});
