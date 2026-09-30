/**
 * API operacional do Cortaí para o atendente inteligente (ALVO IA / CortAI).
 *
 * Segurança:
 * - autenticação por token exclusivo da barbearia (`Authorization: Bearer cortai_…`);
 * - a barbearia vem SEMPRE do token, nunca do corpo da requisição;
 * - cada ação tem validação de entrada própria;
 * - as regras de negócio são as mesmas do painel (RPCs `criar_agendamento`,
 *   `cancelar_agendamento`), então o atendente não consegue burlar nada.
 *
 * Este endpoint substitui zero funcionalidade existente: o `/api/public/alvo-ia`
 * (eventos Cortaí ← ALVO IA) continua igual.
 */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { acharValidador, type NomeDeAcao, ENTRADAS } from "@/lib/ia/entradas-da-api";

function json(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const Route = createFileRoute("/api/public/cortai/acoes")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const guard = await import("@/lib/webhook-guard.server");
        const abuso = await guard.barrarAbusivo(request, "cortai/acoes");
        if (abuso) return abuso;
        const { contextoDoToken, tokenDaRequisicao } = await import("@/lib/ia/ponte.server");
        const ctx = await contextoDoToken(tokenDaRequisicao(request));
        if (!ctx) {
          await guard.rejeitar(request, "cortai/acoes", "token invalido");
          return json({ erro: "Token inválido ou barbearia sem conexão ativa." }, 401);
        }

        let corpo: unknown;
        try {
          corpo = await request.json();
        } catch {
          return json({ erro: "Corpo inválido: envie JSON." }, 400);
        }

        const envelope = z
          .object({ acao: z.string(), dados: z.unknown().optional() })
          .safeParse(corpo);
        if (!envelope.success) return json({ erro: "Informe { acao, dados }." }, 400);

        const nome = envelope.data.acao as NomeDeAcao;
        const validador = acharValidador(envelope.data.acao);
        if (!validador) {
          return json({ erro: `Ação desconhecida: ${envelope.data.acao}`, acoes: Object.keys(ENTRADAS) }, 400);
        }

        const entrada = validador.safeParse(envelope.data.dados ?? {});
        if (!entrada.success) {
          return json({ erro: "Dados inválidos.", detalhes: entrada.error.issues.map((i) => i.message) }, 422);
        }

        const { limiteDaApiExcedido, registrarChamadaDaApi } = await import("@/lib/ia/limite.server");
        if (await limiteDaApiExcedido(ctx.tenantId)) {
          return json({ erro: "Muitas chamadas em pouco tempo. Tente novamente em instantes." }, 429);
        }

        const { ACOES_DO_AGENTE } = await import("@/lib/ia/acoes.server");
        const comecou = Date.now();
        try {
          const executar = ACOES_DO_AGENTE[nome] as (c: typeof ctx, d: unknown) => Promise<unknown>;
          const resultado = await executar(ctx, entrada.data);
          await registrarChamadaDaApi({
            tenantId: ctx.tenantId,
            acao: nome,
            sucesso: true,
            duracaoMs: Date.now() - comecou,
          });
          return json({ ok: true, acao: nome, resultado });
        } catch (erro) {
          const mensagem = erro instanceof Error ? erro.message : "Falha ao executar a ação.";
          await registrarChamadaDaApi({
            tenantId: ctx.tenantId,
            acao: nome,
            sucesso: false,
            duracaoMs: Date.now() - comecou,
            erro: mensagem,
          });
          return json({ ok: false, acao: nome, erro: mensagem }, 409);
        }
      },
    },
  },
});
