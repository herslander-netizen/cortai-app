/**
 * Entrada dos avisos da Evolution API para o Cortaí.
 *
 * Segurança:
 * - se `EVOLUTION_WEBHOOK_SECRET` (ou `WHATSAPP_WEBHOOK_SECRET`) estiver
 *   configurado, o cabeçalho `x-webhook-secret` é conferido em tempo constante;
 * - TEMPORÁRIO (integração/teste): a instância `cortai` é aceita sem segredo
 *   para o teste ponta a ponta com a Evolution; qualquer outra instância
 *   continua exigindo o segredo. Em produção, remova a exceção e configure
 *   `EVOLUTION_WEBHOOK_SECRET` na Evolution e no ambiente;
 * - a barbearia vem SEMPRE da sessão registrada (nome da instância), nunca de
 *   um tenant_id enviado pelo chamador;
 * - mensagens enviadas pela própria barbearia (fromMe) são ignoradas.
 */
import { createFileRoute } from "@tanstack/react-router";

async function segredoConfere(recebido: string | null, segredo: string) {
  if (!recebido) return false;
  const { timingSafeEqual } = await import("node:crypto");
  const a = Buffer.from(recebido, "utf8");
  const b = Buffer.from(segredo, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

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

        const corpo = (await request.json().catch(() => null)) as Record<string, unknown> | null;
        if (!corpo) return new Response("Invalid payload", { status: 400 });

        const evento = String(corpo["event"] ?? "")
          .toLowerCase()
          .replace(/_/g, ".");
        const sessaoId = String(corpo["instance"] ?? "");
        if (!sessaoId) return new Response("Missing instance", { status: 400 });

        // TEMPORÁRIO (integração/teste): a instância "cortai" é aceita sem
        // segredo para o teste ponta a ponta com a Evolution. Qualquer outra
        // instância continua exigindo o segredo configurado. Em produção,
        // remova esta exceção e configure EVOLUTION_WEBHOOK_SECRET na Evolution.
        // TODO(segurança): o segredo já existe no ambiente, mas a instância
        // "cortai" na Evolution ainda não envia o cabeçalho x-webhook-secret.
        // Assim que a Evolution enviar o segredo, apague esta exceção.
        const instanciaDeTesteSemSegredo = sessaoId === "cortai";
        if (segredo && !instanciaDeTesteSemSegredo) {
          const recebido =
            request.headers.get("x-webhook-secret") ??
            request.headers.get("apikey") ??
            request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
            new URL(request.url).searchParams.get("token") ??
            null;
          if (!(await segredoConfere(recebido, segredo))) {
            return guard.rejeitar(
              request,
              "whatsapp/evolution",
              recebido ? "token invalido" : "sem token",
            );
          }
        }
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
          if (chave["fromMe"] === true) return Response.json({ ok: true, ignorada: true });
          const remoteJid = String(chave["remoteJid"] ?? "");
          // Grupos e transmissões não são atendidos pelo CortAI.
          if (!remoteJid || !remoteJid.endsWith("@s.whatsapp.net")) {
            return Response.json({ ok: true, ignorada: true });
          }
          const telefone = remoteJid.split("@")[0] ?? "";
          const { tipo, texto } = textoDaMensagem(
            dados["message"] as Record<string, unknown> | undefined,
          );
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
