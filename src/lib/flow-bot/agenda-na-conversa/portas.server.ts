/**
 * Portas do agendamento na conversa: cada leitura e gravação passa pelas ações oficiais da Flow IA
 * (`brain/acoes.server.ts`), como cliente do próprio telefone — mesma disponibilidade, mesmas regras da agenda,
 * mesma idempotência e conferência do que foi gravado, mesmo prazo de cancelamento. Nenhuma regra nova aqui.
 */
import type { AgendamentoDoCliente, Livre, Portas, Profissional, Servico } from "./conduzir";
import type { ContextoDoCerebro } from "@/lib/brain/acoes.server";

export async function portasDoNegocio(p: {
  tenantId: string;
  telefone: string;
  agora: Date;
}): Promise<Portas> {
  const { ACOES } = await import("@/lib/brain/acoes.server");
  const { fusoDoTenant } = await import("@/lib/fuso.server");
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const ctx: ContextoDoCerebro = {
    tenantId: p.tenantId,
    canal: "whatsapp",
    ator: p.telefone,
    telefoneCliente: p.telefone,
    papel: "cliente",
  };
  const fuso = await fusoDoTenant(p.tenantId);
  const acao = (nome: string, dados: Record<string, unknown> = {}) =>
    ACOES[nome]!.executar(ctx, dados);

  let servicos: Servico[] | null = null;
  const lerServicos = async () => (servicos ??= (await acao("listar_servicos")) as Servico[]);
  let equipe: Profissional[] | null = null;
  const lerEquipe = async () => (equipe ??= (await acao("listar_profissionais")) as Profissional[]);
  const quemFaz = new Map<string, Profissional[]>();

  const lerAgendamentosDoCliente = async (): Promise<AgendamentoDoCliente[]> => {
    const c = await acao("buscar_cliente", { telefone: null });
    if (!c) return [];
    const [lista, todosServicos, todos] = await Promise.all([
      acao("consultar_agendamentos_cliente", { clienteId: null }) as Promise<
        {
          id: string;
          inicio: string;
          servico_id: string | null;
          profissional_id: string | null;
        }[]
      >,
      lerServicos(),
      lerEquipe(),
    ]);
    return lista.map((a): AgendamentoDoCliente => ({
      id: a.id,
      inicio: a.inicio,
      servicoId: a.servico_id,
      servicoNome: todosServicos.find((s) => s.id === a.servico_id)?.nome ?? "Atendimento",
      profissionalId: a.profissional_id,
      profissionalNome: todos.find((x) => x.id === a.profissional_id)?.nome ?? "",
    }));
  };

  return {
    fuso,
    agora: p.agora,
    servicos: lerServicos,
    async profissionais(servicoId) {
      const pronto = quemFaz.get(servicoId);
      if (pronto) return pronto;
      const [todos, { data, error }] = await Promise.all([
        lerEquipe(),
        db
          .from("servicos")
          .select("profissional_ids")
          .eq("tenant_id", p.tenantId)
          .eq("id", servicoId)
          .maybeSingle(),
      ]);
      if (error) throw new Error(error.message);
      const ids = (data as { profissional_ids?: string[] | null } | null)?.profissional_ids;
      // Sem lista no serviço, todos os profissionais ativos fazem (mesma regra da disponibilidade).
      const lista = ids?.length ? todos.filter((x) => ids.includes(x.id)) : todos;
      quemFaz.set(servicoId, lista);
      return lista;
    },
    async livres(dia, servicoId, profissionalId) {
      const r = (await acao("consultar_disponibilidade", { dia, servicoId, profissionalId })) as {
        livres?: Livre[];
      };
      return r.livres ?? [];
    },
    async cliente() {
      const c = (await acao("buscar_cliente", { telefone: null })) as { nome?: string } | null;
      return c?.nome ? { nome: c.nome } : null;
    },
    agendamentos: lerAgendamentosDoCliente,
    async criar(d) {
      await acao("criar_agendamento", {
        clienteId: null,
        nomeCliente: d.nomeCliente,
        servicoId: d.servicoId,
        profissionalId: d.profissionalId,
        inicio: d.inicio,
      });
    },
    async remarcar(d) {
      await acao("reagendar_agendamento", {
        agendamentoId: d.agendamentoId,
        novoInicio: d.inicio,
        profissionalId: d.profissionalId,
      });
    },
    async cancelar(agendamentoId) {
      await acao("cancelar_agendamento", { agendamentoId });
    },
    async avisarAtraso({ agendamentoId, minutos }) {
      // Só avisa sobre agendamento do próprio cliente deste telefone (a lista já vem filtrada por ele).
      const meus = await lerAgendamentosDoCliente();
      const a = meus.find((x) => x.id === agendamentoId);
      if (!a) throw new Error("Agendamento não é deste cliente.");
      const { linkDoAgendamento } = await import("@/lib/links-de-tela");
      const { linkDoWhatsApp } = await import("@/lib/whatsapp/link-whatsapp");
      const hora = new Intl.DateTimeFormat("pt-BR", {
        timeZone: fuso,
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).format(new Date(a.inicio));
      const { error } = await db.rpc("criar_notificacao", {
        _tenant: p.tenantId,
        _tipo: "cliente_atrasou",
        _titulo: "Cliente vai atrasar",
        _corpo: `${a.servicoNome} das ${hora}: chega com ${minutos} min de atraso.`,
        _link: linkDoWhatsApp(p.telefone) ?? linkDoAgendamento(agendamentoId),
      });
      if (error) throw new Error(error.message);
    },
  };
}
