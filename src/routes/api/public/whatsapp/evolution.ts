/**
 * Entrada dos avisos da Evolution API para o Flow.
 *
 * Segurança:
 * - toda instância envia o PRÓPRIO segredo (HMAC do `EVOLUTION_WEBHOOK_SECRET` com o nome dela,
 *   `segredoDaInstancia`), conferido em tempo constante no cabeçalho `x-webhook-secret` ou `apikey` (nunca na URL);
 *   o segredo do ambiente só vale para instâncias antigas até reconectarem; sem segredo configurado, recusa tudo (503);
 * - a barbearia vem SEMPRE da sessão registrada (nome da instância), nunca de
 *   um tenant_id enviado pelo chamador;
 * - mensagens enviadas pela própria barbearia (fromMe) não são respondidas; se não foram enviadas pelo Flow,
 *   pausam o bot e a Flow IA naquela conversa (alguém da equipe respondeu pelo celular).
 */
import { createFileRoute } from "@tanstack/react-router";

import { SEGUNDOS_DE_CADA_CODIGO } from "@/lib/whatsapp/pareamento-telefone";
import { autorizarInstancia, segredoDoCabecalho } from "@/lib/whatsapp/segredo-webhook";

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
        if (!segredo) {
          console.error("[evolution] webhook recusado: EVOLUTION_WEBHOOK_SECRET ausente");
          return new Response("Service unavailable", { status: 503 });
        }
        if (!segredoDoCabecalho(request.headers)) {
          await guard.rejeitar(request, "whatsapp/evolution", "sem token");
          return new Response(null, { status: 401 });
        }

        const { lerCorpoLimitado } = await import("@/lib/webhooks/read-limited-body.server");
        const lido = await lerCorpoLimitado(request, 4 * 1024 * 1024);
        if ("status" in lido) {
          return new Response(lido.status === 413 ? "Payload too large" : "Invalid payload", {
            status: lido.status,
          });
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
        // O segredo é DESTA instância: uma instância nunca fala em nome de outra.
        const auth = autorizarInstancia(request.headers, segredo, sessaoId);
        if (!auth.ok) {
          await guard.rejeitar(request, "whatsapp/evolution", auth.motivo);
          return new Response(null, { status: 401 });
        }
        if (auth.origem === "ambiente_legado") {
          console.info("[evolution] webhook com segredo do ambiente (legado); reconectar migra", {
            sessao: sessaoId.slice(0, 16),
          });
        }

        const limite = await guard.limiteAutenticado(request, "whatsapp/evolution");
        if (limite) return limite;
        const dados = (corpo["data"] as Record<string, unknown>) ?? {};

        const fluxo = await import("@/lib/whatsapp/fluxo.server");

        if (evento === "qrcode.updated") {
          const qr = (dados["qrcode"] as Record<string, unknown>) ?? dados;
          // Texto do código primeiro: o Flow desenha o QR nas cores do tema (a imagem da Evolution vem azul).
          const base64 = (qr["code"] as string) ?? (qr["base64"] as string) ?? null;
          const atualizou = await fluxo.atualizarEstadoDaConexao(sessaoId, {
            status: base64 ? "qr_ready" : "pending",
            qrCode: base64,
            qrExpiraEm: new Date(Date.now() + SEGUNDOS_DE_CADA_CODIGO * 1000).toISOString(),
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
          // Caiu ainda abrindo (401): a tela explica que é o serviço, não o número.
          const { erroDaQueda } = await import("@/lib/whatsapp/queda-ao-abrir");
          const anterior = estado === "close" ? await fluxo.conexaoPorSessao(sessaoId) : null;
          const erro = erroDaQueda({
            estadoNovo: estado,
            motivo: dados["statusReason"],
            statusAnterior: anterior?.status,
          });
          const atualizou = await fluxo.atualizarEstadoDaConexao(sessaoId, {
            origem: "webhook_evolution",
            eventoEm,
            status: estado,
            ...(conectado ? { qrCode: null, qrExpiraEm: null } : {}),
            // Ao abrir, a Evolution manda o número da conta em `wuid` ("5579…@s.whatsapp.net").
            numero:
              typeof dados["number"] === "string"
                ? (dados["number"] as string)
                : typeof dados["wuid"] === "string"
                  ? ((dados["wuid"] as string).split("@")[0]?.split(":")[0] ?? null)
                  : null,
            nomeExibicao:
              typeof dados["profileName"] === "string" ? (dados["profileName"] as string) : null,
            erro,
          });
          return atualizou
            ? Response.json({ ok: true })
            : new Response("Unknown session", { status: 404 });
        }

        if (evento === "messages.upsert") {
          const chave = (dados["key"] as Record<string, unknown>) ?? {};
          const { remetenteDaEvolution } = await import("@/lib/whatsapp/remetente-evolution");
          const remetente = remetenteDaEvolution(dados);
          if (chave["fromMe"] === true) {
            // Uma mensagem de saída real é diferente de recibo, histórico, reação e sync.
            // Esses eventos jamais podem suspender o Flow Bot/IA como se a equipe tivesse respondido.
            const { eventoComMensagemDeSaidaReal } = await import("@/lib/flow-bot/intervencao-humana");
            if (!eventoComMensagemDeSaidaReal(dados)) {
              return Response.json({ ok: true, ignorada: true, motivo: "nao_e_resposta_humana" });
            }
            // O número de destino precisa vir do remoteJid desta instância;
            // autorizarInstancia já restringiu o evento à sessão autenticada.
            // registrarRespostaDoNegocio diferencia eco do Flow de envio humano pelo ID.
            if (remetente.tipo === "contato") {
              const { texto } = textoDaMensagem(
                dados["message"] as Record<string, unknown> | undefined,
              );
              const { registrarRespostaDoNegocio } = await import("@/lib/flow-bot/humano.server");
              const trabalho = registrarRespostaDoNegocio({
                sessaoId,
                telefone: remetente.telefone,
                mensagemExternaId: (chave["id"] as string) ?? null,
                texto,
              }).catch(() => console.error("[evolution] falha ao registrar resposta do negócio"));
              const { emSegundoPlano } = await import("@/lib/segundo-plano.server");
              if (!emSegundoPlano(trabalho)) await trabalho;
            }
            return Response.json({ ok: true, ignorada: true });
          }
          // Grupos e transmissões não são atendidos; contato por @lid usa o número que vem junto.
          if (remetente.tipo === "ignorar") {
            if (remetente.motivo === "lid_sem_numero")
              console.warn("[evolution] mensagem de contato @lid sem número; não atendida", {
                sessao: sessaoId.slice(0, 16),
              });
            return Response.json({ ok: true, ignorada: true, motivo: remetente.motivo });
          }
          const telefone = remetente.telefone;
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
          // Texto também em segundo plano (06/11/2026): o atendimento espera o cliente terminar de digitar (3 s),
          // roda o Flow Bot, grava e simula "digitando". Dentro da requisição, a Evolution desistia de esperar e o
          // Cloudflare cortava o trabalho no meio — agendamento gravado e confirmação nunca enviada (prévia, 05/11
          // 21:36; "Bom dia" sem resposta em 06/11). Responde 200 na hora; a deduplicação por mensagem continua no
          // fluxo. Sem `waitUntil` (testes, servidor local), segue como antes, esperando e devolvendo 404.
          const trabalho = fluxo.processarMensagemRecebida({
            sessaoId,
            mensagemExternaId: (chave["id"] as string) ?? null,
            telefone,
            nomeContato: (dados["pushName"] as string) ?? null,
            tipo,
            conteudo: texto,
            midiaUrl: null,
          });
          const { emSegundoPlano } = await import("@/lib/segundo-plano.server");
          const agendado = emSegundoPlano(
            trabalho.catch((e: unknown) =>
              console.error(
                "[evolution] falha ao processar mensagem",
                e instanceof Error ? e.message : e,
              ),
            ),
          );
          if (agendado) return Response.json({ ok: true, motivo: "recebida" });
          const r = await trabalho;
          if (!r.tratada) return new Response("Unknown session", { status: 404 });
          return Response.json({ ok: true, motivo: r.motivo ?? null });
        }

        return Response.json({ ok: true, ignorado: evento });
      },
    },
  },
});
