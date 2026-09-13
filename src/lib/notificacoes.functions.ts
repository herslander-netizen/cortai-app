import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type CategoriaNotificacao = "agendamento" | "pagamento" | "equipe" | "estoque" | "sistema";
export type TomNotificacao = "sucesso" | "atencao" | "erro" | "info";

export type Notificacao = {
  id: string;
  categoria: CategoriaNotificacao;
  tom: TomNotificacao;
  titulo: string;
  detalhe: string;
  quando: string;
  destino: string | null;
};

/**
 * Central de notificações do Cortaí.
 * Tudo aqui vem de dados reais do banco (agendamentos, pagamentos, estoque,
 * fila, avaliações e auditoria). Nada é inventado nem gerado para demonstração.
 * As consultas usam o cliente autenticado: a RLS mantém o isolamento por
 * barbearia, e cada bloco só é montado quando a permissão existe.
 */
export const getNotificacoes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ papel: "barbearia" | "cliente"; itens: Notificacao[] }> => {
    const db = context.supabase;
    const itens: Notificacao[] = [];

    const { data: vinculo } = await db
      .from("tenant_usuarios")
      .select("tenant_id, papel, permissoes")
      .eq("user_id", context.userId)
      .limit(1)
      .maybeSingle();

    if (!vinculo) return { papel: "cliente", itens: await notificacoesDoCliente(db, context.userId) };

    const tenantId = vinculo.tenant_id as string;
    const dono = vinculo.papel === "dono";
    const permissoes = (vinculo.permissoes ?? []) as string[];
    const pode = (p: string) => dono || permissoes.includes(p);

    const { data: recursos } = await db.from("recursos_do_tenant").select("chave, ativo").eq("tenant_id", tenantId);
    const ativo = (chave: string) => (recursos ?? []).find((r: any) => r.chave === chave)?.ativo ?? true;

    const agora = new Date();
    const inicioDoDia = new Date(agora);
    inicioDoDia.setHours(0, 0, 0, 0);

    // Agenda do dia — relevante para qualquer pessoa da barbearia.
    const { data: agendaHoje } = await db
      .from("agendamentos")
      .select("id, inicio, status, valor_centavos, pagamento_confirmado_em, clientes(nome), servicos(nome)")
      .eq("tenant_id", tenantId)
      .gte("inicio", inicioDoDia.toISOString())
      .not("status", "in", "(cancelado,falta)")
      .order("inicio", { ascending: true })
      .limit(20);

    for (const item of agendaHoje ?? []) {
      if (new Date(item.inicio) < agora) continue;
      itens.push({
        id: `agenda-${item.id}`,
        categoria: "agendamento",
        tom: "info",
        titulo: `${(item as any).clientes?.nome ?? "Cliente"} às ${hora(item.inicio)}`,
        detalhe: (item as any).servicos?.nome ?? "Atendimento agendado",
        quando: item.inicio,
        destino: "/barbeiro/agenda",
      });
    }

    if (pode("confirmar_pagamento")) {
      const pendentes = (agendaHoje ?? []).filter(
        (a: any) => !a.pagamento_confirmado_em && new Date(a.inicio) < agora,
      );
      for (const item of pendentes) {
        itens.push({
          id: `pagamento-${item.id}`,
          categoria: "pagamento",
          tom: "atencao",
          titulo: "Pagamento a confirmar",
          detalhe: `${(item as any).clientes?.nome ?? "Cliente"} · ${hora(item.inicio)}`,
          quando: item.inicio,
          destino: "/barbeiro/pedidos",
        });
      }
    }

    if (ativo("produtos_estoque") && pode("visualizar_estoque")) {
      const { data: produtos } = await db
        .from("produtos")
        .select("id, nome, quantidade, estoque_minimo, atualizado_em")
        .eq("tenant_id", tenantId)
        .eq("ativo", true)
        .eq("controla_estoque", true)
        .limit(50);
      for (const p of produtos ?? []) {
        if (p.quantidade > p.estoque_minimo) continue;
        itens.push({
          id: `estoque-${p.id}`,
          categoria: "estoque",
          tom: p.quantidade === 0 ? "erro" : "atencao",
          titulo: p.quantidade === 0 ? `${p.nome} sem estoque` : `${p.nome} acabando`,
          detalhe: `${p.quantidade} em estoque · mínimo ${p.estoque_minimo}`,
          quando: p.atualizado_em,
          destino: "/barbeiro/produtos",
        });
      }
    }

    if (ativo("fila_espera")) {
      const { data: fila } = await db
        .from("fila_de_espera")
        .select("id, criado_em, avisado_em, clientes(nome)")
        .eq("tenant_id", tenantId)
        .is("avisado_em", null)
        .order("posicao", { ascending: true })
        .limit(10);
      for (const f of fila ?? []) {
        itens.push({
          id: `fila-${f.id}`,
          categoria: "agendamento",
          tom: "info",
          titulo: "Cliente na lista de espera",
          detalhe: `${(f as any).clientes?.nome ?? "Cliente"} aguarda um horário`,
          quando: f.criado_em,
          destino: "/barbeiro/fila",
        });
      }
    }

    const seteDias = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: avaliacoes } = await db
      .from("avaliacoes")
      .select("id, nota, comentario, criado_em")
      .eq("tenant_id", tenantId)
      .gte("criado_em", seteDias)
      .order("criado_em", { ascending: false })
      .limit(10);
    for (const a of avaliacoes ?? []) {
      itens.push({
        id: `avaliacao-${a.id}`,
        categoria: "sistema",
        tom: a.nota >= 4 ? "sucesso" : "atencao",
        titulo: `Nova avaliação: ${a.nota} de 5`,
        detalhe: a.comentario ?? "Sem comentário.",
        quando: a.criado_em,
        destino: "/barbeiro/avaliacoes",
      });
    }

    if (pode("gerenciar_permissoes")) {
      const { data: auditoria } = await db
        .from("auditoria_da_barbearia")
        .select("id, acao, alvo, criado_em")
        .eq("tenant_id", tenantId)
        .order("criado_em", { ascending: false })
        .limit(8);
      for (const a of auditoria ?? []) {
        itens.push({
          id: `equipe-${a.id}`,
          categoria: "equipe",
          tom: "info",
          titulo: rotuloDeAcao(a.acao),
          detalhe: a.alvo,
          quando: a.criado_em,
          destino: "/barbeiro/auditoria",
        });
      }
    }

    return { papel: "barbearia", itens: ordenar(itens) };
  });

async function notificacoesDoCliente(db: any, userId: string): Promise<Notificacao[]> {
  const itens: Notificacao[] = [];
  const { data: clientes } = await db.from("clientes").select("id, tenant_id").eq("user_id", userId).limit(5);
  const ids = (clientes ?? []).map((c: any) => c.id);
  if (!ids.length) return itens;

  const agora = new Date().toISOString();
  const { data: proximos } = await db
    .from("agendamentos")
    .select("id, inicio, status, servicos(nome), tenants(nome)")
    .in("cliente_id", ids)
    .gte("inicio", agora)
    .not("status", "in", "(cancelado,falta)")
    .order("inicio", { ascending: true })
    .limit(5);
  for (const a of proximos ?? []) {
    itens.push({
      id: `meu-agendamento-${a.id}`,
      categoria: "agendamento",
      tom: "sucesso",
      titulo: `Horário confirmado · ${hora(a.inicio)}`,
      detalhe: `${(a as any).servicos?.nome ?? "Atendimento"} em ${(a as any).tenants?.nome ?? "sua barbearia"}`,
      quando: a.inicio,
      destino: "/app/historico",
    });
  }

  const { data: fila } = await db
    .from("fila_de_espera")
    .select("id, posicao, criado_em, avisado_em")
    .in("cliente_id", ids)
    .order("criado_em", { ascending: false })
    .limit(3);
  for (const f of fila ?? []) {
    itens.push({
      id: `minha-fila-${f.id}`,
      categoria: "agendamento",
      tom: f.avisado_em ? "sucesso" : "info",
      titulo: f.avisado_em ? "Vagou um horário para você" : `Você é o ${f.posicao}º da lista de espera`,
      detalhe: f.avisado_em ? "A barbearia já avisou: garanta o seu horário." : "Avisamos assim que vagar.",
      quando: f.avisado_em ?? f.criado_em,
      destino: "/app/espera",
    });
  }

  return ordenar(itens);
}

function ordenar(itens: Notificacao[]) {
  return itens.sort((a, b) => new Date(b.quando).getTime() - new Date(a.quando).getTime()).slice(0, 40);
}

function hora(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function rotuloDeAcao(acao: string) {
  const mapa: Record<string, string> = {
    equipe_salvar: "Permissões atualizadas",
    equipe_remover: "Acesso removido",
    recurso_alterado: "Recurso da barbearia alterado",
    pagamento_confirmado: "Pagamento confirmado",
  };
  return mapa[acao] ?? "Ação registrada na equipe";
}
