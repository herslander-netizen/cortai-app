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

const uuid = z.string().uuid();
const dia = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use o formato AAAA-MM-DD");
const instante = z.string().datetime({ offset: true });

const ENTRADAS = {
  consultar_barbearia: z.object({}).default({}),
  listar_servicos: z.object({}).default({}),
  listar_profissionais: z.object({}).default({}),
  consultar_disponibilidade: z.object({
    dia,
    profissionalId: uuid.nullish(),
    servicoId: uuid.nullish(),
  }),
  consultar_cliente: z.object({ telefone: z.string().trim().min(8).max(20) }),
  registrar_cliente: z.object({
    nome: z.string().trim().min(2).max(80),
    telefone: z.string().trim().min(8).max(20),
    optInWhatsapp: z.boolean(),
  }),
  listar_agendamentos_do_cliente: z.object({ clienteId: uuid }),
  criar_agendamento: z.object({
    clienteId: uuid,
    profissionalId: uuid,
    servicoId: uuid,
    inicio: instante,
    formaPagamento: z.enum(["credito", "pix", "balcao", "fiado"]),
  }),
  remarcar_agendamento: z.object({
    agendamentoId: uuid,
    novoInicio: instante,
    profissionalId: uuid.nullish(),
  }),
  cancelar_agendamento: z.object({ agendamentoId: uuid }),
} as const;

type NomeDeAcao = keyof typeof ENTRADAS;

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
        const { contextoDoToken, tokenDaRequisicao } = await import("@/lib/ia/ponte.server");
        const ctx = await contextoDoToken(tokenDaRequisicao(request));
        if (!ctx) return json({ erro: "Token inválido ou barbearia sem conexão ativa." }, 401);

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
        const validador = ENTRADAS[nome];
        if (!validador) {
          return json({ erro: `Ação desconhecida: ${envelope.data.acao}`, acoes: Object.keys(ENTRADAS) }, 400);
        }

        const entrada = validador.safeParse(envelope.data.dados ?? {});
        if (!entrada.success) {
          return json({ erro: "Dados inválidos.", detalhes: entrada.error.issues.map((i) => i.message) }, 422);
        }

        const { ACOES_DO_AGENTE } = await import("@/lib/ia/acoes.server");
        try {
          const executar = ACOES_DO_AGENTE[nome] as (c: typeof ctx, d: unknown) => Promise<unknown>;
          const resultado = await executar(ctx, entrada.data);
          return json({ ok: true, acao: nome, resultado });
        } catch (erro) {
          const mensagem = erro instanceof Error ? erro.message : "Falha ao executar a ação.";
          return json({ ok: false, acao: nome, erro: mensagem }, 409);
        }
      },
    },
  },
});
