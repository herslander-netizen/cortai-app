/**
 * Catálogo de ações do cérebro CortAI.
 *
 * O modelo só ESCOLHE ações; quem executa é este módulo, sobre as ações de
 * domínio oficiais (`src/lib/ia/acoes.server.ts`), que já filtram por negócio
 * e usam as RPCs do banco. Regras deste catálogo:
 * - o negócio e o canal vêm do servidor (nunca do modelo);
 * - no WhatsApp/site o cliente só enxerga e altera o que é dele (pelo telefone);
 * - escrita nunca roda direto: vira "pendente" e só executa após confirmação;
 * - não existe ação de pagamento: o recebimento é sempre conferido pela equipe.
 */
import * as dominio from "@/lib/ia/acoes.server";
import { normalizarTelefone, variantesDoTelefone } from "@/lib/telefone";
import type { FerramentaDoModelo } from "./gateway.server";

export type Canal = "painel" | "whatsapp" | "site";

export type ContextoDoCerebro = {
  tenantId: string;
  canal: Canal;
  /** userId (painel), telefone (WhatsApp) ou identificador anônimo (site). */
  ator: string;
  /** Telefone do cliente quando o canal é o próprio cliente (WhatsApp). */
  telefoneCliente?: string | null;
};

type Risco = "leitura" | "escrita" | "controle";

type Definicao = {
  descricao: string;
  parametros: Record<string, unknown>;
  risco: Risco;
  canais: Canal[];
  executar: (ctx: ContextoDoCerebro, dados: Record<string, any>) => Promise<unknown>;
  resumir?: (ctx: ContextoDoCerebro, dados: Record<string, any>) => Promise<string>;
};

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function agenteDe(ctx: ContextoDoCerebro): dominio.ContextoDoAgente {
  return { tenantId: ctx.tenantId, externalAgentId: `cortai:${ctx.canal}:${ctx.ator}` };
}

function obj(props: Record<string, unknown>, required: string[] = []) {
  return { type: "object", properties: props, required, additionalProperties: false };
}

const TODOS: Canal[] = ["painel", "whatsapp", "site"];
const ATENDIMENTO: Canal[] = ["painel", "whatsapp"];

/** Cliente do próprio telefone da conversa (WhatsApp), dentro do negócio. */
async function clienteDoTelefone(ctx: ContextoDoCerebro) {
  if (!ctx.telefoneCliente) return null;
  const db = await admin();
  const { data } = await db
    .from("clientes")
    .select("id, nome, telefone")
    .eq("tenant_id", ctx.tenantId)
    .in("telefone", variantesDoTelefone(ctx.telefoneCliente))
    .is("arquivado_em", null)
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

async function clienteAlvo(ctx: ContextoDoCerebro, clienteId?: string | null) {
  if (ctx.canal === "whatsapp") {
    const proprio = await clienteDoTelefone(ctx);
    if (!proprio) throw new Error("Ainda não há cadastro para este telefone.");
    return proprio.id as string;
  }
  if (!clienteId) throw new Error("Informe o cliente.");
  const db = await admin();
  const { data } = await db
    .from("clientes")
    .select("id")
    .eq("id", clienteId)
    .eq("tenant_id", ctx.tenantId)
    .maybeSingle();
  if (!data) throw new Error("Cliente não encontrado neste negócio.");
  return data.id as string;
}

/** No canal do cliente, o agendamento precisa ser dele. */
async function exigirAgendamentoPermitido(ctx: ContextoDoCerebro, agendamentoId: string) {
  const db = await admin();
  const { data } = await db
    .from("agendamentos")
    .select("id, cliente_id, inicio, status, servico_id, profissional_id")
    .eq("id", agendamentoId)
    .eq("tenant_id", ctx.tenantId)
    .maybeSingle();
  if (!data) throw new Error("Agendamento não encontrado neste negócio.");
  if (ctx.canal === "whatsapp") {
    const proprio = await clienteDoTelefone(ctx);
    if (!proprio || proprio.id !== data.cliente_id)
      throw new Error("Esse agendamento não pertence a este telefone.");
  }
  return data;
}

async function nomes(ctx: ContextoDoCerebro, ids: { servicoId?: string; profissionalId?: string }) {
  const db = await admin();
  const [s, p] = await Promise.all([
    ids.servicoId
      ? db
          .from("servicos")
          .select("nome, preco_centavos, duracao_min")
          .eq("id", ids.servicoId)
          .eq("tenant_id", ctx.tenantId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    ids.profissionalId
      ? db
          .from("profissionais")
          .select("nome")
          .eq("id", ids.profissionalId)
          .eq("tenant_id", ctx.tenantId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  return { servico: s.data as any, profissional: p.data as any };
}

async function quando(ctx: ContextoDoCerebro, iso: string) {
  const { fusoDoTenant } = await import("@/lib/fuso.server");
  const fuso = await fusoDoTenant(ctx.tenantId);
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: fuso,
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

function reais(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export const ACOES: Record<string, Definicao> = {
  /* ------------------------------ Leitura ------------------------------ */
  listar_servicos: {
    descricao: "Lista os serviços ativos com id, nome, duração (min) e preço (centavos).",
    parametros: obj({}),
    risco: "leitura",
    canais: TODOS,
    executar: (ctx) => dominio.listarServicos(agenteDe(ctx)),
  },
  consultar_servico: {
    descricao: "Detalhes de um serviço pelo id.",
    parametros: obj({ servicoId: { type: "string" } }, ["servicoId"]),
    risco: "leitura",
    canais: TODOS,
    executar: (ctx, d) => dominio.consultarServico(agenteDe(ctx), { servicoId: String(d.servicoId) }),
  },
  listar_profissionais: {
    descricao: "Lista os profissionais ativos (id e nome).",
    parametros: obj({}),
    risco: "leitura",
    canais: TODOS,
    executar: (ctx) => dominio.listarProfissionais(agenteDe(ctx)),
  },
  consultar_horarios_funcionamento: {
    descricao: "Horários de funcionamento (dia_semana 0=domingo).",
    parametros: obj({}),
    risco: "leitura",
    canais: TODOS,
    executar: (ctx) => dominio.consultarHorariosDeFuncionamento(agenteDe(ctx)),
  },
  consultar_informacoes: {
    descricao: "Informações oficiais do negócio (endereço, pagamento, políticas).",
    parametros: obj({}),
    risco: "leitura",
    canais: TODOS,
    executar: (ctx) => dominio.consultarInformacoes(agenteDe(ctx)),
  },
  consultar_disponibilidade: {
    descricao:
      "Horários livres reais de um dia (AAAA-MM-DD) para um serviço e, opcionalmente, um profissional. Única fonte de horários que podem ser oferecidos.",
    parametros: obj(
      {
        dia: { type: "string" },
        servicoId: { type: ["string", "null"] },
        profissionalId: { type: ["string", "null"] },
      },
      ["dia", "servicoId", "profissionalId"],
    ),
    risco: "leitura",
    canais: TODOS,
    executar: (ctx, d) =>
      dominio.consultarDisponibilidade(agenteDe(ctx), {
        dia: String(d.dia),
        servicoId: d.servicoId ?? null,
        profissionalId: d.profissionalId ?? null,
      }),
  },
  buscar_cliente: {
    descricao:
      "Busca o cadastro do cliente. No WhatsApp sempre usa o telefone da própria conversa; no painel, informe o telefone.",
    parametros: obj({ telefone: { type: ["string", "null"] } }, ["telefone"]),
    risco: "leitura",
    canais: ATENDIMENTO,
    executar: async (ctx, d) => {
      if (ctx.canal === "whatsapp") return clienteDoTelefone(ctx);
      const db = await admin();
      const { data } = await db
        .from("clientes")
        .select("id, nome, telefone")
        .eq("tenant_id", ctx.tenantId)
        .in("telefone", variantesDoTelefone(String(d.telefone ?? "")))
        .is("arquivado_em", null)
        .limit(1)
        .maybeSingle();
      return data ?? null;
    },
  },
  consultar_agendamentos_cliente: {
    descricao: "Próximos agendamentos do cliente (no WhatsApp, do próprio telefone).",
    parametros: obj({ clienteId: { type: ["string", "null"] } }, ["clienteId"]),
    risco: "leitura",
    canais: ATENDIMENTO,
    executar: async (ctx, d) => {
      const clienteId = await clienteAlvo(ctx, d.clienteId);
      return dominio.listarAgendamentosDoCliente(agenteDe(ctx), { clienteId });
    },
  },
  consultar_agendamento: {
    descricao: "Detalhes de um agendamento pelo id.",
    parametros: obj({ agendamentoId: { type: "string" } }, ["agendamentoId"]),
    risco: "leitura",
    canais: ATENDIMENTO,
    executar: (ctx, d) => exigirAgendamentoPermitido(ctx, String(d.agendamentoId)),
  },
  consultar_movimento: {
    descricao: "Indicadores do dia de hoje: agendamentos por situação. Só para a equipe.",
    parametros: obj({}),
    risco: "leitura",
    canais: ["painel"],
    executar: async (ctx) => {
      const { fusoDoTenant } = await import("@/lib/fuso.server");
      const { inicioDoDiaNoFuso, hojeNoFuso, somarDias } = await import("@/lib/horarios");
      const fuso = await fusoDoTenant(ctx.tenantId);
      const hoje = hojeNoFuso(fuso);
      const db = await admin();
      const { data } = await db
        .from("agendamentos")
        .select("status")
        .eq("tenant_id", ctx.tenantId)
        .gte("inicio", inicioDoDiaNoFuso(hoje, fuso).toISOString())
        .lt("inicio", inicioDoDiaNoFuso(somarDias(hoje, 1), fuso).toISOString());
      const porStatus: Record<string, number> = {};
      for (const a of data ?? []) porStatus[a.status] = (porStatus[a.status] ?? 0) + 1;
      return { dia: hoje, total: data?.length ?? 0, porStatus };
    },
  },

  /* ------------------------------ Escrita ------------------------------ */
  criar_cliente: {
    descricao: "Cadastra o cliente (no WhatsApp, com o telefone da conversa).",
    parametros: obj({ nome: { type: "string" }, telefone: { type: ["string", "null"] } }, [
      "nome",
      "telefone",
    ]),
    risco: "escrita",
    canais: ATENDIMENTO,
    resumir: async (ctx, d) => `Cadastrar ${String(d.nome).trim()} como cliente.`,
    executar: (ctx, d) =>
      dominio.registrarCliente(agenteDe(ctx), {
        nome: String(d.nome).trim().slice(0, 80),
        telefone: normalizarTelefone(
          ctx.canal === "whatsapp" ? ctx.telefoneCliente : String(d.telefone ?? ""),
        ),
        optInWhatsapp: ctx.canal === "whatsapp",
      }),
  },
  atualizar_dados_cliente: {
    descricao: "Atualiza o nome do cliente.",
    parametros: obj({ clienteId: { type: ["string", "null"] }, nome: { type: "string" } }, [
      "clienteId",
      "nome",
    ]),
    risco: "escrita",
    canais: ATENDIMENTO,
    resumir: async (_ctx, d) => `Atualizar o nome do cliente para ${String(d.nome).trim()}.`,
    executar: async (ctx, d) => {
      const clienteId = await clienteAlvo(ctx, d.clienteId);
      const db = await admin();
      const nome = String(d.nome).trim().slice(0, 80);
      if (nome.length < 2) throw new Error("Nome muito curto.");
      const { error } = await db
        .from("clientes")
        .update({ nome })
        .eq("id", clienteId)
        .eq("tenant_id", ctx.tenantId);
      if (error) throw new Error(error.message);
      return { clienteId, nome };
    },
  },
  registrar_nota: {
    descricao: "Registra uma preferência/observação do cliente na ficha. Só para a equipe.",
    parametros: obj(
      { clienteId: { type: "string" }, chave: { type: "string" }, valor: { type: "string" } },
      ["clienteId", "chave", "valor"],
    ),
    risco: "escrita",
    canais: ["painel"],
    resumir: async (_ctx, d) => `Anotar na ficha: ${d.chave} = ${d.valor}.`,
    executar: (ctx, d) =>
      dominio.salvarPreferenciaDoCliente(agenteDe(ctx), {
        clienteId: String(d.clienteId),
        chave: String(d.chave).slice(0, 40),
        valor: String(d.valor).slice(0, 200),
      }),
  },
  criar_agendamento: {
    descricao:
      "Agenda um horário que saiu de consultar_disponibilidade. No WhatsApp o cliente é o da conversa (informe nomeCliente se ainda não houver cadastro).",
    parametros: obj(
      {
        clienteId: { type: ["string", "null"] },
        nomeCliente: { type: ["string", "null"] },
        servicoId: { type: "string" },
        profissionalId: { type: "string" },
        inicio: { type: "string", description: "ISO 8601 exatamente como veio da disponibilidade" },
      },
      ["clienteId", "nomeCliente", "servicoId", "profissionalId", "inicio"],
    ),
    risco: "escrita",
    canais: ATENDIMENTO,
    resumir: async (ctx, d) => {
      const { servico, profissional } = await nomes(ctx, d);
      if (!servico || !profissional) throw new Error("Serviço ou profissional não encontrado.");
      return `Agendar ${servico.nome} (${reais(servico.preco_centavos)}, ${servico.duracao_min} min) com ${profissional.nome} em ${await quando(ctx, String(d.inicio))}.`;
    },
    executar: async (ctx, d) => {
      let clienteId: string;
      if (ctx.canal === "whatsapp") {
        const proprio = await clienteDoTelefone(ctx);
        if (proprio) clienteId = proprio.id;
        else {
          const nome = String(d.nomeCliente ?? "").trim();
          if (nome.length < 2) throw new Error("Preciso do nome do cliente para agendar.");
          const novo = (await dominio.registrarCliente(agenteDe(ctx), {
            nome,
            telefone: normalizarTelefone(ctx.telefoneCliente),
            optInWhatsapp: true,
          })) as { id: string };
          clienteId = novo.id;
        }
      } else clienteId = await clienteAlvo(ctx, d.clienteId);
      return dominio.ACOES_DO_AGENTE.criar_agendamento(agenteDe(ctx), {
        clienteId,
        servicoId: String(d.servicoId),
        profissionalId: String(d.profissionalId),
        inicio: String(d.inicio),
        formaPagamento: "balcao",
      });
    },
  },
  cancelar_agendamento: {
    descricao: "Cancela um agendamento existente.",
    parametros: obj({ agendamentoId: { type: "string" } }, ["agendamentoId"]),
    risco: "escrita",
    canais: ATENDIMENTO,
    resumir: async (ctx, d) => {
      const a = await exigirAgendamentoPermitido(ctx, String(d.agendamentoId));
      const { servico } = await nomes(ctx, { servicoId: a.servico_id ?? undefined });
      return `Cancelar ${servico?.nome ?? "o atendimento"} de ${await quando(ctx, a.inicio)}.`;
    },
    executar: async (ctx, d) => {
      await exigirAgendamentoPermitido(ctx, String(d.agendamentoId));
      return dominio.cancelarAgendamento(agenteDe(ctx), { agendamentoId: String(d.agendamentoId) });
    },
  },
  reagendar_agendamento: {
    descricao: "Remarca um agendamento para um novo horário vindo de consultar_disponibilidade.",
    parametros: obj(
      {
        agendamentoId: { type: "string" },
        novoInicio: { type: "string" },
        profissionalId: { type: ["string", "null"] },
      },
      ["agendamentoId", "novoInicio", "profissionalId"],
    ),
    risco: "escrita",
    canais: ATENDIMENTO,
    resumir: async (ctx, d) => {
      const a = await exigirAgendamentoPermitido(ctx, String(d.agendamentoId));
      return `Remarcar o atendimento de ${await quando(ctx, a.inicio)} para ${await quando(ctx, String(d.novoInicio))}.`;
    },
    executar: async (ctx, d) => {
      await exigirAgendamentoPermitido(ctx, String(d.agendamentoId));
      return dominio.remarcarAgendamento(agenteDe(ctx), {
        agendamentoId: String(d.agendamentoId),
        novoInicio: String(d.novoInicio),
        profissionalId: d.profissionalId ?? null,
      });
    },
  },

  /* ------------------------------ Controle ------------------------------ */
  encaminhar_humano: {
    descricao:
      "Passa a conversa para a equipe do negócio (quando o cliente pede uma pessoa ou o assunto foge do que você resolve).",
    parametros: obj({ motivo: { type: "string" } }, ["motivo"]),
    risco: "controle",
    canais: ["whatsapp"],
    executar: async () => ({ ok: true }),
  },
};

export function acoesDoCanal(canal: Canal) {
  return Object.entries(ACOES).filter(([, a]) => a.canais.includes(canal));
}

export function ferramentasDoCanal(canal: Canal): FerramentaDoModelo[] {
  return acoesDoCanal(canal).map(([nome, a]) => ({
    type: "function",
    name: nome,
    description:
      a.risco === "escrita"
        ? `${a.descricao} (Escrita: o sistema prepara um resumo e só executa depois que a pessoa confirmar.)`
        : a.descricao,
    parameters: a.parametros,
    strict: false,
  }));
}
