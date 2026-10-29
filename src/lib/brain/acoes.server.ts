/**
 * Catálogo de ações do cérebro Flow IA.
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
import { origemDoCortai } from "@/lib/origem-agendamento";
import { normalizarTelefone, variantesDoTelefone } from "@/lib/telefone";
import { filtrarCandidatos, padraoDoBanco, termosDaBusca } from "./busca-cliente";
import type { ItemDeConferencia } from "./conferencia";
import { execucaoDiretaLigada, POLITICA_DE_CONFIRMACAO } from "./execucao-direta";
import type { FerramentaDoModelo } from "./gateway.server";

export type Canal = "painel" | "whatsapp" | "site";

export type ContextoDoCerebro = {
  tenantId: string;
  canal: Canal;
  /** userId (painel), telefone (WhatsApp) ou identificador anônimo (site). */
  ator: string;
  /** Telefone do cliente quando o canal é o próprio cliente (WhatsApp). */
  telefoneCliente?: string | null;
  /** Quem fala no WhatsApp: cliente (padrão) ou equipe com telefone verificado. */
  papel?: Papel;
  /** Profissional da pessoa da equipe (limita a agenda dela). */
  profissionalId?: string | null;
  /**
   * Painel: permissões efetivas da pessoa no negócio (resolvidas no servidor por
   * `has_tenant_permission`). Ausente = nenhuma: ação que exige permissão fica barrada.
   */
  permissoes?: readonly string[];
};

export type Papel = "cliente" | "profissional" | "dono";

/** Cliente falando pelo próprio telefone (WhatsApp) — só vê o que é dele. */
export function ehCliente(ctx: ContextoDoCerebro) {
  return ctx.canal === "whatsapp" && (ctx.papel ?? "cliente") === "cliente";
}

/** Equipe falando pelo WhatsApp (telefone verificado). */
export function ehEquipeNoWhatsapp(ctx: ContextoDoCerebro) {
  return ctx.canal === "whatsapp" && (ctx.papel === "profissional" || ctx.papel === "dono");
}

type Risco = "leitura" | "escrita" | "controle";

type Definicao = {
  descricao: string;
  parametros: Record<string, unknown>;
  risco: Risco;
  canais: Canal[];
  /** Papéis no WhatsApp; sem isso: cliente, se o canal incluir whatsapp. */
  papeis?: Papel[];
  /** No painel, a pessoa precisa ter TODAS estas permissões (as mesmas que as telas exigem). */
  permissoes?: readonly string[];
  executar: (ctx: ContextoDoCerebro, dados: any) => Promise<unknown>;
  resumir?: (ctx: ContextoDoCerebro, dados: any) => Promise<string>;
  /**
   * Verificações que a pessoa VÊ antes de gravar (painel). Só lê, nunca grava; devolve itens
   * em vez de lançar erro, para a tela mostrar o que está certo e o que impede.
   */
  conferir?: (ctx: ContextoDoCerebro, dados: any) => Promise<ItemDeConferencia[]>;
};

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function agenteDe(ctx: ContextoDoCerebro): dominio.ContextoDoAgente {
  return {
    tenantId: ctx.tenantId,
    externalAgentId: `cortai:${ctx.canal}:${ctx.ator}`,
    origemCortai: origemDoCortai(ctx.canal, ctx.papel),
  };
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
  if (ehCliente(ctx)) {
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

/**
 * Profissional (WhatsApp ou painel) só mexe nos atendimentos dele; sem profissional
 * ligado ao usuário, em nenhum. Pura, para testar sem banco.
 */
export function atendimentoDeOutroProfissional(
  ctx: Pick<ContextoDoCerebro, "canal" | "papel" | "profissionalId">,
  profissionalDoAtendimento: string | null | undefined,
): boolean {
  if (ctx.papel !== "profissional" || (ctx.canal !== "whatsapp" && ctx.canal !== "painel"))
    return false;
  return !ctx.profissionalId || profissionalDoAtendimento !== ctx.profissionalId;
}

/** Profissional agenda sempre para si; os demais escolhem. */
function profissionalEfetivo(ctx: ContextoDoCerebro, escolhido: unknown): string {
  return ctx.papel === "profissional" && ctx.profissionalId
    ? ctx.profissionalId
    : String(escolhido);
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
  if (ehCliente(ctx)) {
    const proprio = await clienteDoTelefone(ctx);
    if (!proprio || proprio.id !== data.cliente_id)
      throw new Error("Esse agendamento não pertence a este telefone.");
  }
  if (atendimentoDeOutroProfissional(ctx, data.profissional_id))
    throw new Error("Esse atendimento é de outro profissional.");
  return data;
}

async function nomes(
  ctx: ContextoDoCerebro,
  ids: { servicoId?: string | undefined; profissionalId?: string | undefined },
) {
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

function minutosValidos(v: unknown) {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(Math.max(n, 1), 120) : 10;
}

/** Próximo atendimento (ainda não iniciado) do profissional hoje. */
async function proximoDoProfissional(ctx: ContextoDoCerebro) {
  if (!ctx.profissionalId) return null;
  const db = await admin();
  const { data } = await db
    .from("agendamentos")
    .select("id, inicio, clientes(nome)")
    .eq("tenant_id", ctx.tenantId)
    .eq("profissional_id", ctx.profissionalId)
    .in("status", ["agendado", "chegou"])
    .gte("inicio", new Date(Date.now() - 30 * 60_000).toISOString())
    .lte("inicio", new Date(Date.now() + 12 * 60 * 60_000).toISOString())
    .order("inicio")
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id as string,
    inicio: data.inicio as string,
    cliente: (data as any).clientes?.nome ?? null,
  };
}

function reais(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

type AlvoDoAgendamento = {
  clienteId: string;
  servicoId: string;
  profissionalId: string;
  inicio: string;
};

/**
 * Já existe exatamente este agendamento (mesmo cliente, serviço, profissional e horário, ainda
 * ativo)? Torna o agendar idempotente: reenvio de mensagem ou de áudio, "sim" repetido e nova
 * tentativa depois de um timeout nunca criam um segundo horário.
 */
export async function agendamentoIdentico(ctx: ContextoDoCerebro, alvo: AlvoDoAgendamento) {
  const ms = Date.parse(alvo.inicio);
  if (!Number.isFinite(ms)) return null;
  const { STATUS_QUE_OCUPAM } = await import("@/lib/agenda-regras.server");
  const db = await admin();
  const { data } = await db
    .from("agendamentos")
    .select("id")
    .eq("tenant_id", ctx.tenantId)
    .eq("cliente_id", alvo.clienteId)
    .eq("servico_id", alvo.servicoId)
    .eq("profissional_id", alvo.profissionalId)
    .eq("inicio", new Date(ms).toISOString())
    .in("status", [...STATUS_QUE_OCUPAM])
    .limit(1)
    .maybeSingle();
  return (data as { id: string } | null) ?? null;
}

/**
 * Sucesso só depois de reler o que foi gravado: o registro existe neste negócio, com o
 * cliente, o serviço, o profissional e o horário pedidos. Qualquer divergência vira erro.
 */
export async function verificarGravacao(
  ctx: ContextoDoCerebro,
  agendamentoId: unknown,
  alvo: AlvoDoAgendamento,
) {
  if (typeof agendamentoId !== "string" || !agendamentoId)
    throw new Error("Não consegui confirmar que o horário foi gravado.");
  const db = await admin();
  const { data } = await db
    .from("agendamentos")
    .select("id, cliente_id, servico_id, profissional_id, inicio, status")
    .eq("id", agendamentoId)
    .eq("tenant_id", ctx.tenantId)
    .maybeSingle();
  const a = data as Record<string, string> | null;
  const confere =
    a &&
    a["cliente_id"] === alvo.clienteId &&
    a["servico_id"] === alvo.servicoId &&
    a["profissional_id"] === alvo.profissionalId &&
    Date.parse(a["inicio"] ?? "") === Date.parse(alvo.inicio);
  if (!confere) throw new Error("Não consegui confirmar que o horário foi gravado.");
  return a;
}

/** Agendar com idempotência e verificação, sobre a ação de domínio já existente. */
export async function agendarComSeguranca(
  ctx: ContextoDoCerebro,
  alvo: AlvoDoAgendamento,
  agendar: () => Promise<unknown>,
) {
  const ja = await agendamentoIdentico(ctx, alvo);
  if (ja) return { agendamento_id: ja.id, jaExistia: true, verificado: true };
  let gravado: unknown;
  try {
    gravado = await agendar();
  } catch (erro) {
    // Pedido idêntico em paralelo pode ter gravado entre a checagem e a gravação.
    const depois = await agendamentoIdentico(ctx, alvo);
    if (depois) return { agendamento_id: depois.id, jaExistia: true, verificado: true };
    throw erro;
  }
  const id = (gravado as { agendamento_id?: string } | null)?.agendamento_id;
  await verificarGravacao(ctx, id, alvo);
  return { ...(gravado as object), jaExistia: false, verificado: true };
}

/**
 * Conferência do agendamento: entidades do negócio + regras OFICIAIS da agenda
 * (`validarAgendamento`: expediente, antecedência, profissional×serviço, choque de horários,
 * outro horário do mesmo cliente). Só lê. Cada item diz o que foi verificado e o resultado.
 */
export async function conferirAgendamento(
  ctx: ContextoDoCerebro,
  d: { clienteId?: unknown; servicoId?: unknown; profissionalId?: unknown; inicio?: unknown },
): Promise<ItemDeConferencia[]> {
  const itens: ItemDeConferencia[] = [];
  const profissionalId = profissionalEfetivo(ctx, d.profissionalId);
  const clienteId = d.clienteId ? String(d.clienteId) : null;
  const servicoId = String(d.servicoId ?? "");
  const inicioMs = Date.parse(String(d.inicio ?? ""));
  const db = await admin();

  const [cli, srv, prof] = await Promise.all([
    clienteId && !ehCliente(ctx)
      ? db
          .from("clientes")
          .select("id, nome, telefone")
          .eq("id", clienteId)
          .eq("tenant_id", ctx.tenantId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    db
      .from("servicos")
      .select("id, nome, preco_centavos, duracao_min, profissional_ids")
      .eq("id", servicoId)
      .eq("tenant_id", ctx.tenantId)
      .eq("ativo", true)
      .maybeSingle(),
    db
      .from("profissionais")
      .select("id, nome")
      .eq("id", profissionalId)
      .eq("tenant_id", ctx.tenantId)
      .eq("ativo", true)
      .maybeSingle(),
  ]);
  const cliente = cli.data as { nome: string; telefone: string | null } | null;
  const servico = srv.data as {
    id: string;
    nome: string;
    preco_centavos: number;
    duracao_min: number;
    profissional_ids: string[] | null;
  } | null;
  const profissional = prof.data as { nome: string } | null;

  if (!ehCliente(ctx)) {
    itens.push(
      cliente
        ? {
            id: "cliente",
            rotulo: "Cliente",
            valor: `${cliente.nome}${
              cliente.telefone ? ` (final ${cliente.telefone.replace(/\D/g, "").slice(-4)})` : ""
            }`,
            estado: "ok",
          }
        : {
            id: "cliente",
            rotulo: "Cliente",
            valor: "Não encontrado neste negócio",
            estado: "erro",
            detalhe: "Esse cliente não existe neste negócio.",
          },
    );
  }
  itens.push(
    servico
      ? {
          id: "servico",
          rotulo: "Serviço",
          valor: `${servico.nome} · ${servico.duracao_min} min · ${reais(servico.preco_centavos)}`,
          estado: "ok",
        }
      : {
          id: "servico",
          rotulo: "Serviço",
          valor: "Não encontrado",
          estado: "erro",
          detalhe: "Esse serviço não está ativo no catálogo do negócio.",
        },
    profissional
      ? { id: "profissional", rotulo: "Profissional", valor: profissional.nome, estado: "ok" }
      : {
          id: "profissional",
          rotulo: "Profissional",
          valor: "Não encontrado",
          estado: "erro",
          detalhe: "Esse profissional não está ativo neste negócio.",
        },
    Number.isFinite(inicioMs)
      ? {
          id: "quando",
          rotulo: "Dia e hora",
          valor: await quando(ctx, new Date(inicioMs).toISOString()),
          estado: "ok",
        }
      : {
          id: "quando",
          rotulo: "Dia e hora",
          valor: "Horário inválido",
          estado: "erro",
          detalhe: "Não entendi o dia e a hora.",
        },
  );

  // Regras da agenda só fazem sentido com tudo identificado.
  if (servico && profissional && Number.isFinite(inicioMs) && (ehCliente(ctx) || cliente)) {
    try {
      const identico = clienteId
        ? await agendamentoIdentico(ctx, {
            clienteId,
            servicoId,
            profissionalId,
            inicio: new Date(inicioMs).toISOString(),
          })
        : null;
      if (identico) {
        itens.push({
          id: "regras",
          rotulo: "Regras da agenda",
          valor: "Esse horário já está registrado para este cliente",
          estado: "atencao",
          detalhe: "Confirmar não cria outro: o sistema avisa que já existia.",
        });
      } else {
        const { validarAgendamento } = await import("@/lib/agenda-regras.server");
        const conflito = await validarAgendamento(db, {
          tenantId: ctx.tenantId,
          servico,
          profissionalId,
          inicio: new Date(inicioMs),
          clienteId,
        });
        itens.push(
          conflito
            ? {
                id: "regras",
                rotulo: "Regras da agenda",
                valor: `O cliente já tem um horário às ${conflito.hora} nesse dia`,
                estado: "erro",
                detalhe: `O cliente já tem um horário às ${conflito.hora} nesse dia.`,
              }
            : {
                id: "regras",
                rotulo: "Regras da agenda",
                valor: "Horário livre e dentro do expediente",
                estado: "ok",
              },
        );
      }
    } catch (erro) {
      // A validação oficial lança mensagens claras (fora do horário, ocupado, antecedência…).
      const motivo = erro instanceof Error ? erro.message : "Não consegui conferir a agenda agora.";
      itens.push({
        id: "regras",
        rotulo: "Regras da agenda",
        valor: motivo,
        estado: "erro",
        detalhe: motivo,
      });
    }
  }
  itens.push({
    id: "permissao",
    rotulo: "Permissão",
    valor: acaoPermitida("criar_agendamento", ctx)
      ? "Você pode agendar"
      : "Sem permissão para agendar",
    estado: acaoPermitida("criar_agendamento", ctx) ? "ok" : "erro",
    detalhe: acaoPermitida("criar_agendamento", ctx)
      ? null
      : "Seu usuário não pode criar agendamentos.",
  });
  return itens;
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
    executar: (ctx, d) =>
      dominio.consultarServico(agenteDe(ctx), { servicoId: String(d.servicoId) }),
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
    permissoes: ["visualizar_clientes"],
    executar: async (ctx, d) => {
      if (ehCliente(ctx)) return clienteDoTelefone(ctx);
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
  buscar_cliente_por_nome: {
    descricao:
      "Procura clientes do negócio pelo NOME (como a pessoa falou). Devolve até 6 candidatos com id, nome e final do telefone. Se vier mais de um, pergunte qual; se nenhum, pergunte se deve cadastrar.",
    parametros: obj({ nome: { type: "string" } }, ["nome"]),
    risco: "leitura",
    // Só painel; a equipe no WhatsApp entra por `papeis`. Cliente e site nunca (listaria outros clientes).
    canais: ["painel"],
    papeis: ["profissional", "dono"],
    permissoes: ["visualizar_clientes"],
    executar: async (ctx, d) => {
      const termos = termosDaBusca(String(d.nome ?? ""));
      if (!termos.length) return { encontrados: 0, clientes: [] };
      const maior = [...termos].sort((a, b) => b.length - a.length)[0]!;
      const db = await admin();
      const { data } = await db
        .from("clientes")
        .select("id, nome, telefone")
        .eq("tenant_id", ctx.tenantId)
        .is("arquivado_em", null)
        .ilike("nome", padraoDoBanco(maior))
        .limit(60);
      const { clientes, total } = filtrarCandidatos((data ?? []) as never, termos);
      return { encontrados: total, clientes, maisResultados: total > clientes.length };
    },
  },
  consultar_agendamentos_cliente: {
    descricao: "Próximos agendamentos do cliente (no WhatsApp, do próprio telefone).",
    parametros: obj({ clienteId: { type: ["string", "null"] } }, ["clienteId"]),
    risco: "leitura",
    canais: ATENDIMENTO,
    executar: async (ctx, d) => {
      const clienteId = await clienteAlvo(ctx, d.clienteId);
      const lista = await dominio.listarAgendamentosDoCliente(agenteDe(ctx), { clienteId });
      // Profissional só enxerga os atendimentos dele, mesmo do cliente que atende.
      return ctx.papel === "profissional"
        ? lista.filter((a) => !atendimentoDeOutroProfissional(ctx, a.profissional_id))
        : lista;
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
      const { inicioDoDiaNoFuso, hojeNoFuso } = await import("@/lib/horarios");
      const fuso = await fusoDoTenant(ctx.tenantId);
      const hoje = hojeNoFuso(fuso);
      const inicio = inicioDoDiaNoFuso(fuso);
      const fim = new Date(inicio.getTime() + 24 * 60 * 60_000);
      const db = await admin();
      const { data } = await db
        .from("agendamentos")
        .select("status")
        .eq("tenant_id", ctx.tenantId)
        .gte("inicio", inicio.toISOString())
        .lt("inicio", fim.toISOString());
      const porStatus: Record<string, number> = {};
      for (const a of data ?? []) porStatus[a.status] = (porStatus[a.status] ?? 0) + 1;
      return { dia: hoje, total: data?.length ?? 0, porStatus };
    },
  },

  consultar_caixa_hoje: {
    descricao:
      "Consulta os movimentos financeiros registrados no caixa de HOJE: entradas, saídas, líquido e entradas por forma de pagamento. Não é lucro contábil. Só disponível a quem tem visualizar_financeiro.",
    parametros: obj({}),
    risco: "leitura",
    canais: ["painel"],
    permissoes: ["visualizar_financeiro"],
    executar: async (ctx) => {
      const [{ fusoDoTenant }, horarios] = await Promise.all([
        import("@/lib/fuso.server"),
        import("@/lib/horarios"),
      ]);
      const fuso = await fusoDoTenant(ctx.tenantId);
      const dia = horarios.hojeNoFuso(fuso);
      // Limites civis do dia no fuso do negócio; não presumir que um dia sempre tenha 24 h.
      const inicio = new Date(horarios.isoNoFusoDaBarbearia(dia, "00:00", fuso));
      const fim = new Date(
        horarios.isoNoFusoDaBarbearia(horarios.somarDias(dia, 1), "00:00", fuso),
      );
      const db = await admin();
      const { data, error } = await db
        .from("caixa_movimentos")
        .select("tipo, valor_centavos, forma_pagamento")
        .eq("tenant_id", ctx.tenantId)
        .gte("criado_em", inicio.toISOString())
        .lt("criado_em", fim.toISOString())
        .order("criado_em");
      if (error) throw new Error("Não consegui consultar o caixa agora.");

      const movimentos = data ?? [];
      const somar = (itens: readonly { valor_centavos: number }[]) =>
        itens.reduce((total, item) => total + Number(item.valor_centavos || 0), 0);
      const entradas = movimentos.filter((m) => m.tipo === "entrada");
      const saidas = movimentos.filter((m) => m.tipo !== "entrada");
      const porForma = (forma: string) =>
        somar(entradas.filter((m) => m.forma_pagamento === forma));
      return {
        dia,
        entradasCentavos: somar(entradas),
        saidasCentavos: somar(saidas),
        liquidoCentavos: somar(entradas) - somar(saidas),
        quantidadeMovimentos: movimentos.length,
        entradasPorFormaCentavos: {
          pix: porForma("pix"),
          dinheiro: porForma("dinheiro"),
          cartao: porForma("cartao"),
          outras: somar(
            entradas.filter(
              (m) =>
                m.forma_pagamento !== "pix" &&
                m.forma_pagamento !== "dinheiro" &&
                m.forma_pagamento !== "cartao",
            ),
          ),
        },
        criterio: "Movimentos registrados no caixa do negócio no dia local informado; líquido de entradas menos saídas, não lucro.",
      };
    },
  },

  /* ------------------------------ Escrita ------------------------------ */
  cadastrar_servicos: {
    descricao:
      "Cadastra uma lista de serviços do negócio. Só use nomes, durações e preços informados pela equipe; se faltar um dado essencial, pergunte antes.",
    parametros: obj(
      {
        servicos: {
          type: "array",
          items: {
            type: "object",
            properties: {
              nome: { type: "string" },
              duracaoMin: { type: "integer" },
              precoCentavos: { type: "integer" },
            },
            required: ["nome", "duracaoMin", "precoCentavos"],
            additionalProperties: false,
          },
        },
      },
      ["servicos"],
    ),
    risco: "escrita",
    canais: ["painel"],
    permissoes: ["alterar_dados_barbearia"],
    resumir: async (_ctx, d) => {
      const servicos = Array.isArray(d.servicos) ? d.servicos : [];
      if (!servicos.length) throw new Error("Nenhum serviço para cadastrar.");
      return `Cadastrar ${servicos.map((s: any) => `${String(s.nome).trim()} (${s.duracaoMin} min, ${reais(Number(s.precoCentavos))})`).join(", ")}.`;
    },
    executar: (ctx, d) =>
      dominio.cadastrarServicos(agenteDe(ctx), {
        servicos: (Array.isArray(d.servicos) ? d.servicos : []).map((s: any) => ({
          nome: String(s.nome ?? ""),
          duracaoMin: Number(s.duracaoMin),
          precoCentavos: Number(s.precoCentavos),
        })),
      }),
  },
  definir_horarios: {
    descricao:
      "Define os horários de funcionamento do negócio. Informe os sete dias quando a equipe fornecer a semana completa; não invente dias ou horários ausentes.",
    parametros: obj(
      {
        horarios: {
          type: "array",
          items: {
            type: "object",
            properties: {
              diaSemana: { type: "integer", description: "0 domingo até 6 sábado" },
              fechado: { type: "boolean" },
              abre: { type: "string" },
              fecha: { type: "string" },
            },
            required: ["diaSemana", "fechado", "abre", "fecha"],
            additionalProperties: false,
          },
        },
      },
      ["horarios"],
    ),
    risco: "escrita",
    canais: ["painel"],
    permissoes: ["alterar_dados_barbearia"],
    resumir: async (_ctx, d) => {
      const horarios = Array.isArray(d.horarios) ? d.horarios : [];
      if (!horarios.length) throw new Error("Nenhum horário para salvar.");
      return `Definir ${horarios.length} dia(s) de funcionamento. Confira a semana antes de confirmar.`;
    },
    executar: (ctx, d) =>
      dominio.definirHorarios(agenteDe(ctx), {
        horarios: (Array.isArray(d.horarios) ? d.horarios : []).map((h: any) => ({
          diaSemana: Number(h.diaSemana),
          fechado: Boolean(h.fechado),
          abre: String(h.abre ?? ""),
          fecha: String(h.fecha ?? ""),
        })),
      }),
  },
  criar_cliente: {
    descricao: "Cadastra o cliente (no WhatsApp, com o telefone da conversa).",
    parametros: obj({ nome: { type: "string" }, telefone: { type: ["string", "null"] } }, [
      "nome",
      "telefone",
    ]),
    risco: "escrita",
    canais: ATENDIMENTO,
    permissoes: ["editar_clientes"],
    resumir: async (ctx, d) => `Cadastrar ${String(d.nome).trim()} como cliente.`,
    executar: (ctx, d) =>
      dominio.registrarCliente(agenteDe(ctx), {
        nome: String(d.nome).trim().slice(0, 80),
        telefone: normalizarTelefone(
          ehCliente(ctx) ? ctx.telefoneCliente : String(d.telefone ?? ""),
        ),
        optInWhatsapp: ehCliente(ctx),
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
    permissoes: ["editar_clientes"],
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
    permissoes: ["editar_clientes"],
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
    permissoes: ["agendamento_manual"],
    resumir: async (ctx, d) => {
      if (ctx.papel === "profissional" && !ctx.profissionalId)
        throw new Error("Seu usuário não está ligado a um profissional.");
      const { servico, profissional } = await nomes(ctx, {
        servicoId: d.servicoId,
        profissionalId: profissionalEfetivo(ctx, d.profissionalId),
      });
      if (!servico || !profissional) throw new Error("Serviço ou profissional não encontrado.");
      // Equipe agenda para um cliente escolhido: o resumo diz QUEM, para conferência.
      let paraQuem = "";
      if (!ehCliente(ctx) && d.clienteId) {
        const db = await admin();
        const { data: c } = await db
          .from("clientes")
          .select("nome")
          .eq("id", String(d.clienteId))
          .eq("tenant_id", ctx.tenantId)
          .maybeSingle();
        if (!c) throw new Error("Cliente não encontrado neste negócio.");
        paraQuem = ` para ${(c as { nome: string }).nome}`;
      }
      return `Agendar ${servico.nome} (${reais(servico.preco_centavos)}, ${servico.duracao_min} min) com ${profissional.nome} em ${await quando(ctx, String(d.inicio))}${paraQuem}.`;
    },
    conferir: (ctx, d) => conferirAgendamento(ctx, d),
    executar: async (ctx, d) => {
      if (ctx.papel === "profissional" && !ctx.profissionalId)
        throw new Error("Seu usuário não está ligado a um profissional.");
      let clienteId: string;
      if (ehCliente(ctx)) {
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
      const alvo = {
        clienteId,
        servicoId: String(d.servicoId),
        profissionalId: profissionalEfetivo(ctx, d.profissionalId),
        inicio: String(d.inicio),
      };
      // Mesma ação de domínio de sempre (regras, conflitos, RPC), agora idempotente e verificada.
      return agendarComSeguranca(ctx, alvo, () =>
        dominio.ACOES_DO_AGENTE.criar_agendamento(agenteDe(ctx), {
          ...alvo,
          formaPagamento: "balcao",
        }),
      );
    },
  },
  cancelar_agendamento: {
    descricao: "Cancela um agendamento existente.",
    parametros: obj({ agendamentoId: { type: "string" } }, ["agendamentoId"]),
    risco: "escrita",
    canais: ATENDIMENTO,
    permissoes: ["cancelar_agendamento"],
    resumir: async (ctx, d) => {
      const a = await exigirAgendamentoPermitido(ctx, String(d.agendamentoId));
      const { servico } = await nomes(ctx, { servicoId: a.servico_id ?? undefined });
      return `Cancelar ${servico?.nome ?? "o atendimento"} de ${await quando(ctx, a.inicio)}.`;
    },
    executar: async (ctx, d) => {
      await exigirAgendamentoPermitido(ctx, String(d.agendamentoId));
      if (ehCliente(ctx)) {
        const { exigirPrazoDeCancelamento } = await import("@/lib/prazo-cancelamento.server");
        await exigirPrazoDeCancelamento(await admin(), String(d.agendamentoId));
      }
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
    permissoes: ["agendamento_manual", "cancelar_agendamento"],
    resumir: async (ctx, d) => {
      const a = await exigirAgendamentoPermitido(ctx, String(d.agendamentoId));
      return `Remarcar o atendimento de ${await quando(ctx, a.inicio)} para ${await quando(ctx, String(d.novoInicio))}.`;
    },
    executar: async (ctx, d) => {
      await exigirAgendamentoPermitido(ctx, String(d.agendamentoId));
      return dominio.remarcarAgendamento(agenteDe(ctx), {
        agendamentoId: String(d.agendamentoId),
        novoInicio: String(d.novoInicio),
        // Profissional remarca só na própria agenda; os demais podem trocar de profissional.
        profissionalId:
          ctx.papel === "profissional" ? (ctx.profissionalId ?? null) : (d.profissionalId ?? null),
      });
    },
  },

  /* --------------------------- Equipe (WhatsApp) --------------------------- */
  minha_agenda: {
    descricao:
      "Agenda de um dia (AAAA-MM-DD; padrão hoje) com horário, cliente, serviço e situação. Profissional vê só a própria; dono vê a do negócio.",
    parametros: obj({ dia: { type: ["string", "null"] } }, ["dia"]),
    risco: "leitura",
    canais: [],
    papeis: ["profissional", "dono"],
    executar: async (ctx, d) => {
      const { fusoDoTenant } = await import("@/lib/fuso.server");
      const { inicioDoDiaNoFuso, hojeNoFuso } = await import("@/lib/horarios");
      const fuso = await fusoDoTenant(ctx.tenantId);
      const dia = /^\d{4}-\d{2}-\d{2}$/.test(String(d.dia ?? ""))
        ? String(d.dia)
        : hojeNoFuso(fuso);
      const inicio = inicioDoDiaNoFuso(fuso, new Date(`${dia}T12:00:00Z`));
      const fim = new Date(inicio.getTime() + 24 * 60 * 60_000);
      const db = await admin();
      let q = db
        .from("agendamentos")
        .select("id, inicio, fim, status, clientes(nome), servicos(nome), profissionais(nome)")
        .eq("tenant_id", ctx.tenantId)
        .gte("inicio", inicio.toISOString())
        .lt("inicio", fim.toISOString())
        .not("status", "in", "(cancelado,nao_compareceu)")
        .order("inicio");
      if (ctx.papel === "profissional") {
        if (!ctx.profissionalId)
          return { dia, aviso: "Seu usuário não está ligado a um profissional.", itens: [] };
        q = q.eq("profissional_id", ctx.profissionalId);
      }
      const { data } = await q;
      const agora = Date.now();
      const itens = (data ?? []).map((a: any) => ({
        id: a.id,
        inicio: a.inicio,
        status: a.status,
        cliente: a.clientes?.nome ?? null,
        servico: a.servicos?.nome ?? null,
        profissional: a.profissionais?.nome ?? null,
        jaPassou: new Date(a.inicio).getTime() < agora,
      }));
      return { dia, total: itens.length, itens };
    },
  },
  consultar_fila: {
    descricao: "Quem está na lista de espera agora (nome, serviço, desde quando).",
    parametros: obj({}),
    risco: "leitura",
    canais: [],
    papeis: ["profissional", "dono"],
    executar: async (ctx) => {
      const db = await admin();
      let q = db
        .from("fila_de_espera")
        .select("id, posicao, criado_em, status, clientes(nome), servicos(nome), profissional_id")
        .eq("tenant_id", ctx.tenantId)
        .in("status", ["aguardando", "avisado"])
        .order("posicao");
      if (ctx.papel === "profissional" && ctx.profissionalId)
        q = q.or(`profissional_id.is.null,profissional_id.eq.${ctx.profissionalId}`);
      const { data } = await q;
      return (data ?? []).map((f: any) => ({
        posicao: f.posicao,
        cliente: f.clientes?.nome ?? null,
        servico: f.servicos?.nome ?? null,
        desde: f.criado_em,
      }));
    },
  },
  avisar_atraso: {
    descricao:
      "Avisa o próximo cliente do profissional que o atendimento vai atrasar alguns minutos. Não muda o horário na agenda.",
    parametros: obj({ minutos: { type: "integer" } }, ["minutos"]),
    risco: "escrita",
    canais: [],
    papeis: ["profissional"],
    resumir: async (ctx, d) => {
      const prox = await proximoDoProfissional(ctx);
      if (!prox) throw new Error("Você não tem próximo atendimento hoje.");
      return `Avisar ${prox.cliente ?? "o cliente"} (${await quando(ctx, prox.inicio)}) de um atraso de ${minutosValidos(d.minutos)} min.`;
    },
    executar: async (ctx, d) => {
      const prox = await proximoDoProfissional(ctx);
      if (!prox) throw new Error("Você não tem próximo atendimento hoje.");
      const { avisarClienteDoAtraso } = await import("@/lib/whatsapp/aviso-atraso.server");
      const r = await avisarClienteDoAtraso({
        tenantId: ctx.tenantId,
        agendamentoId: prox.id,
        minutos: minutosValidos(d.minutos),
      });
      // Sem envio real não há sucesso: a ação falha e o texto não diz que o cliente foi avisado.
      if (!r.enviado) {
        throw new Error(
          `O cliente não recebeu o aviso pelo WhatsApp (${r.motivo ?? "falha no envio"}). O atraso ficou registrado só no sininho.`,
        );
      }
      return r;
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

/** Equipe no WhatsApp: ações do painel + as dela; profissional sem indicadores do negócio. */
const SO_DONO = new Set(["consultar_movimento", "consultar_caixa_hoje"]);

export function acaoPermitida(nome: string, ctx: ContextoDoCerebro): boolean {
  const a = ACOES[nome];
  if (!a) return false;
  if (ehEquipeNoWhatsapp(ctx)) {
    const papel = ctx.papel as Papel;
    // Ações exclusivas de papel (agenda da equipe/atraso) usam a própria guarda
    // de papel e não pertencem ao catálogo do painel.
    if (a.papeis) return a.papeis.includes(papel);
    if (nome === "encaminhar_humano") return false;
    if (papel === "profissional" && SO_DONO.has(nome)) return false;
    if (!a.canais.includes("painel")) return false;
    // Ações operacionais da equipe no WhatsApp usam a mesma matriz efetiva do painel.
    // Dono tem todas as permissões pela regra central do banco; demais papéis falham fechado.
    if (papel !== "dono" && a.permissoes?.length) {
      return a.permissoes.every((p) => ctx.permissoes?.includes(p));
    }
    return true;
  }
  if (a.papeis && !a.canais.length) return false;
  return a.canais.includes(ctx.canal) && permitidoNoPainel(nome, a, ctx);
}

/**
 * Painel: a Flow IA age com a chave de serviço (ignora o RLS), então o papel e as permissões
 * da pessoa precisam ser conferidos AQUI — as mesmas que as telas exigem. Profissional não vê
 * indicadores; sem a permissão (ou sem permissões resolvidas) a ação nem é oferecida ao modelo
 * e é recusada também na hora de executar uma ação pendente confirmada.
 */
function permitidoNoPainel(nome: string, a: Definicao, ctx: ContextoDoCerebro): boolean {
  if (ctx.canal !== "painel") return true;
  if (ctx.papel === "profissional" && SO_DONO.has(nome)) return false;
  if (!a.permissoes?.length) return true;
  return a.permissoes.every((p) => ctx.permissoes?.includes(p));
}

/** Permissões que o painel precisa resolver para a pessoa (todas as exigidas pelas ações). */
export function permissoesUsadasNoPainel(): string[] {
  return [...new Set(Object.values(ACOES).flatMap((a) => a.permissoes ?? []))];
}

export function acoesDoContexto(ctx: ContextoDoCerebro) {
  return Object.entries(ACOES).filter(([nome]) => acaoPermitida(nome, ctx));
}

export function ferramentasDoContexto(ctx: ContextoDoCerebro): FerramentaDoModelo[] {
  return acoesDoContexto(ctx).map(([nome, a]) => ({
    type: "function",
    name: nome,
    description:
      a.risco === "escrita"
        ? `${a.descricao} ${
            POLITICA_DE_CONFIRMACAO[nome] === "dispensavel" &&
            ctx.canal === "painel" &&
            execucaoDiretaLigada()
              ? "(Escrita: o sistema valida tudo. Se o cliente foi encontrado sem ambiguidade, o serviço está no catálogo e o horário veio de consultar_disponibilidade, ele executa na hora e devolve o resultado; senão prepara um resumo e espera a confirmação.)"
              : "(Escrita: o sistema prepara um resumo e só executa depois que a pessoa confirmar.)"
          }`
        : a.descricao,
    parameters: a.parametros,
    strict: false,
  }));
}
