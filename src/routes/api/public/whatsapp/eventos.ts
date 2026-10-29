/**
 * Entrada de avisos do serviço de WhatsApp (gateway) para o Flow.
 *
 * Segurança:
 * - sem `WHATSAPP_WEBHOOK_SECRET` configurado, o endpoint responde 503: não
 *   existe caminho aberto nem entrada simulada;
 * - a assinatura HMAC do corpo cru é conferida em tempo constante;
 * - a barbearia vem SEMPRE da sessão registrada, nunca do corpo da requisição;
 * - a mesma entrega nunca é processada duas vezes.
 */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const evento = z.object({
  tipo: z.enum(["status", "qr", "conectado", "desconectado", "erro", "mensagem", "entrega"]),
  sessaoId: z.string().min(4).max(200),
  status: z.string().max(40).optional(),
  qrCode: z.string().max(20000).nullish(),
  qrExpiraEm: z.string().max(40).nullish(),
  numero: z.string().max(30).nullish(),
  nomeExibicao: z.string().max(120).nullish(),
  erro: z.string().max(500).nullish(),
  mensagem: z
    .object({
      id: z.string().max(200).nullish(),
      de: z.string().min(6).max(30),
      nome: z.string().max(120).nullish(),
      tipo: z
        .enum(["text", "audio", "image", "document", "location", "interactive", "unknown"])
        .default("text"),
      texto: z.string().max(4000).default(""),
      midiaUrl: z.string().url().max(2000).nullish(),
    })
    .optional(),
});

async function assinaturaValida(corpo: string, assinatura: string | null, segredo: string) {
  if (!assinatura) return false;
  const { createHmac, timingSafeEqual } = await import("node:crypto");
  const esperado = createHmac("sha256", segredo).update(corpo, "utf8").digest("hex");
  const a = Buffer.from(assinatura.replace(/^sha256=/, ""), "utf8");
  const b = Buffer.from(esperado, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export const Route = createFileRoute("/api/public/whatsapp/eventos")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { segredoDoWebhookDeWhatsapp } = await import("@/lib/whatsapp/gateway.server");
        const segredo = segredoDoWebhookDeWhatsapp();
        if (!segredo) return new Response("Integration not enabled", { status: 503 });
        const guard = await import("@/lib/webhook-guard.server");
        const abuso = await guard.barrarAbusivo(request, "whatsapp/eventos");
        if (abuso) return abuso;

        const corpo = await request.text();
        const assinatura =
          request.headers.get("x-whatsapp-signature") ?? request.headers.get("x-hub-signature-256");
        if (!(await assinaturaValida(corpo, assinatura, segredo))) {
          return guard.rejeitar(
            request,
            "whatsapp/eventos",
            assinatura ? "assinatura invalida" : "sem assinatura",
          );
        }
        const limite = await guard.limiteAutenticado(request, "whatsapp/eventos");
        if (limite) return limite;

        const analise = evento.safeParse(JSON.parse(corpo || "{}"));
        if (!analise.success) return new Response("Invalid payload", { status: 400 });
        const dados = analise.data;

        const fluxo = await import("@/lib/whatsapp/fluxo.server");

        if (dados.tipo === "mensagem") {
          if (!dados.mensagem) return new Response("Missing message", { status: 400 });
          const r = await fluxo.processarMensagemRecebida({
            sessaoId: dados.sessaoId,
            mensagemExternaId: dados.mensagem.id ?? null,
            telefone: dados.mensagem.de,
            nomeContato: dados.mensagem.nome ?? null,
            tipo: dados.mensagem.tipo,
            conteudo: dados.mensagem.texto,
            midiaUrl: dados.mensagem.midiaUrl ?? null,
          });
          if (!r.tratada) return new Response("Unknown session", { status: 404 });
          return Response.json({ ok: true, motivo: r.motivo ?? null });
        }

        if (dados.tipo === "entrega") return Response.json({ ok: true });

        const status =
          dados.status ??
          (dados.tipo === "qr"
            ? "qr_ready"
            : dados.tipo === "conectado"
              ? "connected"
              : dados.tipo === "desconectado"
                ? "disconnected"
                : dados.tipo === "erro"
                  ? "error"
                  : "pending");

        const atualizou = await fluxo.atualizarEstadoDaConexao(dados.sessaoId, {
          status,
          qrCode: dados.qrCode ?? null,
          qrExpiraEm: dados.qrExpiraEm ?? null,
          numero: dados.numero ?? null,
          nomeExibicao: dados.nomeExibicao ?? null,
          erro: dados.erro ?? null,
        });
        if (!atualizou) return new Response("Unknown session", { status: 404 });
        return Response.json({ ok: true });
      },
    },
  },
});
