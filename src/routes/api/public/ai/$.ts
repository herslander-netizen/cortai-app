/**
 * Camada REST do Cortaí para a ALVO IA.
 *
 * Não duplica regra alguma: cada rota chama exatamente as mesmas ações usadas
 * pelo atendente em /api/public/cortai/acoes, que por sua vez usam as RPCs do
 * banco (mesmas regras do painel).
 *
 * Segurança:
 * - `Authorization: Bearer cortai_…` (token exclusivo da barbearia);
 * - a barbearia vem SEMPRE do token, nunca do corpo ou da query;
 * - entradas validadas com Zod; erros com status coerente.
 *
 * Rotas (prefixo /api/public/ai):
 *   GET    /barbershop
 *   GET    /services            GET /services/:id
 *   GET    /professionals
 *   GET    /clients?phone=...   POST /clients
 *   GET    /clients/:id/appointments
 *   GET    /availability?date=AAAA-MM-DD&professionalId=&serviceId=
 *   GET    /appointments?clientId=...
 *   POST   /appointments
 *   PATCH  /appointments/:id    (remarcar)
 *   DELETE /appointments/:id    (cancelar)
 */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const uuid = z.string().uuid();
const dia = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use o formato AAAA-MM-DD");
const instante = z.string().datetime({ offset: true });

function json(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { "content-type": "application/json" },
  });
}

type Ctx = { tenantId: string; externalAgentId: string | null };

async function autenticar(request: Request): Promise<Ctx | null> {
  const { contextoDoToken, tokenDaRequisicao } = await import("@/lib/ia/ponte.server");
  return contextoDoToken(tokenDaRequisicao(request));
}

async function proteger(request: Request): Promise<Ctx | Response> {
  const guard = await import("@/lib/webhook-guard.server");
  const abuso = await guard.barrarAbusivo(request, "ai");
  if (abuso) return abuso;
  const ctx = await autenticar(request);
  if (!ctx) {
    await guard.rejeitar(request, "ai", "token invalido");
    return json({ erro: "Token inválido ou negócio sem integração ativa." }, 401);
  }
  const limite = await guard.limiteAutenticado(request, "ai");
  if (limite) return limite;
  const { limiteDaApiExcedido } = await import("@/lib/ia/limite.server");
  if (await limiteDaApiExcedido(ctx.tenantId)) {
    return json({ erro: "Muitas chamadas em pouco tempo. Tente novamente em instantes." }, 429);
  }
  return ctx;
}

async function executar(nome: string, ctx: Ctx, dados: unknown) {
  const { ACOES_DO_AGENTE } = await import("@/lib/ia/acoes.server");
  const { registrarChamadaDaApi } = await import("@/lib/ia/limite.server");
  const acoes = ACOES_DO_AGENTE as unknown as Record<
    string,
    (c: Ctx, d: unknown) => Promise<unknown>
  >;
  const acao = acoes[nome];
  if (!acao) return json({ erro: `Ação desconhecida: ${nome}` }, 400);
  const comecou = Date.now();
  try {
    const resultado = await acao(ctx, dados);
    await registrarChamadaDaApi({
      tenantId: ctx.tenantId,
      acao: nome,
      sucesso: true,
      duracaoMs: Date.now() - comecou,
    });
    return json({ ok: true, resultado });
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "Falha ao executar a ação.";
    await registrarChamadaDaApi({
      tenantId: ctx.tenantId,
      acao: nome,
      sucesso: false,
      duracaoMs: Date.now() - comecou,
      erro: mensagem,
    });
    return json({ ok: false, erro: mensagem }, 409);
  }
}

function partes(splat: string | undefined) {
  return (splat ?? "").split("/").filter(Boolean);
}

async function corpoJson(request: Request) {
  try {
    return (await request.json()) as unknown;
  } catch {
    return null;
  }
}

function invalido(resultado: z.SafeParseReturnType<unknown, unknown>) {
  return json(
    {
      erro: "Dados inválidos.",
      detalhes: resultado.success ? [] : resultado.error.issues.map((i) => i.message),
    },
    422,
  );
}

export const Route = createFileRoute("/api/public/ai/$")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const protegido = await proteger(request);
        if (protegido instanceof Response) return protegido;
        const ctx = protegido;
        const p = partes(params._splat);
        const url = new URL(request.url);

        if (p[0] === "barbershop" && p.length === 1)
          return executar("consultar_barbearia", ctx, {});
        if (p[0] === "services" && p.length === 1) return executar("listar_servicos", ctx, {});
        if (p[0] === "services" && p.length === 2) {
          const id = uuid.safeParse(p[1]);
          if (!id.success) return invalido(id);
          return executar("consultar_servico", ctx, { servicoId: id.data });
        }
        if (p[0] === "professionals" && p.length === 1)
          return executar("listar_profissionais", ctx, {});
        if (p[0] === "hours" && p.length === 1) return executar("consultar_horarios", ctx, {});
        if (p[0] === "faq" && p.length === 1) return executar("consultar_informacoes", ctx, {});

        if (p[0] === "clients" && p.length === 1) {
          const telefone = z
            .string()
            .trim()
            .min(8)
            .max(20)
            .safeParse(url.searchParams.get("phone") ?? "");
          if (!telefone.success)
            return json({ erro: "Informe ?phone= com o telefone do cliente." }, 400);
          return executar("consultar_cliente", ctx, { telefone: telefone.data });
        }
        if (p[0] === "clients" && p.length === 3 && p[2] === "appointments") {
          const id = uuid.safeParse(p[1]);
          if (!id.success) return invalido(id);
          return executar("listar_agendamentos_do_cliente", ctx, { clienteId: id.data });
        }
        if (p[0] === "clients" && p.length === 3 && p[2] === "history") {
          const id = uuid.safeParse(p[1]);
          if (!id.success) return invalido(id);
          return executar("historico_do_cliente", ctx, { clienteId: id.data });
        }

        if (p[0] === "availability" && p.length === 1) {
          const entrada = z
            .object({
              dia,
              profissionalId: uuid.nullish(),
              servicoId: uuid.nullish(),
            })
            .safeParse({
              dia: url.searchParams.get("date") ?? "",
              profissionalId: url.searchParams.get("professionalId"),
              servicoId: url.searchParams.get("serviceId"),
            });
          if (!entrada.success) return invalido(entrada);
          return executar("consultar_disponibilidade", ctx, entrada.data);
        }

        if (p[0] === "appointments" && p.length === 1) {
          const id = uuid.safeParse(url.searchParams.get("clientId") ?? "");
          if (!id.success)
            return json({ erro: "Informe ?clientId= para listar agendamentos." }, 400);
          return executar("listar_agendamentos_do_cliente", ctx, { clienteId: id.data });
        }

        return json({ erro: "Recurso não encontrado." }, 404);
      },

      POST: async ({ request, params }) => {
        const protegido = await proteger(request);
        if (protegido instanceof Response) return protegido;
        const ctx = protegido;
        const p = partes(params._splat);
        const corpo = await corpoJson(request);
        if (corpo === null) return json({ erro: "Corpo inválido: envie JSON." }, 400);

        if (p[0] === "clients" && p.length === 1) {
          const entrada = z
            .object({
              nome: z.string().trim().min(2).max(80),
              telefone: z.string().trim().min(8).max(20),
              optInWhatsapp: z.boolean().default(false),
            })
            .safeParse(corpo);
          if (!entrada.success) return invalido(entrada);
          return executar("registrar_cliente", ctx, entrada.data);
        }

        if (p[0] === "appointments" && p.length === 1) {
          const entrada = z
            .object({
              clienteId: uuid,
              profissionalId: uuid,
              servicoId: uuid,
              inicio: instante,
              formaPagamento: z.enum(["credito", "pix", "balcao", "fiado"]),
            })
            .safeParse(corpo);
          if (!entrada.success) return invalido(entrada);
          return executar("criar_agendamento", ctx, entrada.data);
        }

        if (p[0] === "appointments" && p.length === 3 && p[2] === "confirm") {
          const id = uuid.safeParse(p[1]);
          if (!id.success) return invalido(id);
          return executar("confirmar_agendamento", ctx, { agendamentoId: id.data });
        }

        return json({ erro: "Recurso não encontrado." }, 404);
      },

      PATCH: async ({ request, params }) => {
        const protegido = await proteger(request);
        if (protegido instanceof Response) return protegido;
        const ctx = protegido;
        const p = partes(params._splat);
        const corpo = await corpoJson(request);
        if (corpo === null) return json({ erro: "Corpo inválido: envie JSON." }, 400);

        if (p[0] === "appointments" && p.length === 2) {
          const id = uuid.safeParse(p[1]);
          if (!id.success) return invalido(id);
          const entrada = z
            .object({ novoInicio: instante, profissionalId: uuid.nullish() })
            .safeParse(corpo);
          if (!entrada.success) return invalido(entrada);
          return executar("remarcar_agendamento", ctx, { agendamentoId: id.data, ...entrada.data });
        }

        return json({ erro: "Recurso não encontrado." }, 404);
      },

      DELETE: async ({ request, params }) => {
        const protegido = await proteger(request);
        if (protegido instanceof Response) return protegido;
        const ctx = protegido;
        const p = partes(params._splat);

        if (p[0] === "appointments" && p.length === 2) {
          const id = uuid.safeParse(p[1]);
          if (!id.success) return invalido(id);
          return executar("cancelar_agendamento", ctx, { agendamentoId: id.data });
        }

        return json({ erro: "Recurso não encontrado." }, 404);
      },
    },
  },
});
