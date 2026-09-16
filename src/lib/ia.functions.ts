import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { exigirPermissao, tenantIdDoMembro } from "@/lib/tenant";
import {
  PROVEDOR_PADRAO,
  type IntegracaoDeIA,
  type PersonaDoAgente,
  type StatusDaIntegracao,
  type ValorSimples,
} from "@/lib/ia/contrato";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function daLinha(tenantId: string, linha: Record<string, any> | null): IntegracaoDeIA {
  return {
    tenantId,
    provedor: PROVEDOR_PADRAO,
    status: (linha?.["status"] as StatusDaIntegracao) ?? "desconectado",
    externalTenantId: (linha?.["external_tenant_id"] as string) ?? null,
    externalAgentId: (linha?.["external_agent_id"] as string) ?? null,
    agentName: (linha?.["agent_name"] as string) ?? null,
    agentPersona: ((linha?.["agent_persona"] as PersonaDoAgente) ?? {}) as PersonaDoAgente,
    conectadoEm: (linha?.["conectado_em"] as string) ?? null,
    ultimaSincronizacaoEm: (linha?.["ultima_sincronizacao_em"] as string) ?? null,
    ultimoErro: (linha?.["ultimo_erro"] as string) ?? null,
    metadata: ((linha?.["metadata"] as Record<string, ValorSimples>) ?? {}) as Record<string, ValorSimples>,
  };
}

/** Endereço público, real, que a ALVO IA / CortAI chama para operar a agenda. */
export const URL_DA_PONTE = "https://cortai.dev/api/public/cortai/acoes";

export type PainelDeIntegracao = {
  integracao: IntegracaoDeIA;
  /** A ponte de atendimento pode ser ligada nesta barbearia. */
  disponivel: boolean;
  /** Há endpoint/credencial de SAÍDA (Cortaí → ALVO IA) neste ambiente? */
  saidaConfigurada: boolean;
  /** Estado da chave de acesso usada pelo atendente. Nunca traz o token. */
  ponte: { url: string; prefixo: string; criadoEm: string | null; usadoEm: string | null } | null;
  eventosPendentes: number;
};

export const getIntegracaoDeIA = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PainelDeIntegracao> => {
    const tenantId = await tenantIdDoMembro(context);
    const db = await admin();
    const [{ data: linha }, { count }] = await Promise.all([
      db
        .from("integracoes_de_ia")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("provedor", PROVEDOR_PADRAO)
        .maybeSingle(),
      db
        .from("eventos_de_ia")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("status", "pendente"),
    ]);
    const { provedorDeIA } = await import("@/lib/ia/alvo-ia.server");
    const bruto = linha as Record<string, any> | null;
    return {
      integracao: daLinha(tenantId, bruto),
      disponivel: true,
      saidaConfigurada: provedorDeIA().estaConfigurado(),
      ponte: bruto?.["token_prefixo"]
        ? {
            url: URL_DA_PONTE,
            prefixo: bruto["token_prefixo"] as string,
            criadoEm: (bruto["token_criado_em"] as string) ?? null,
            usadoEm: (bruto["token_usado_em"] as string) ?? null,
          }
        : null,
      eventosPendentes: count ?? 0,
    };
  });


const personaSchema = z.object({
  tom: z.string().trim().max(120).optional(),
  saudacao: z.string().trim().max(240).optional(),
  instrucoes: z.string().trim().max(1000).optional(),
});

/**
 * Salva o nome público e a persona do atendente. Não conecta em nada: enquanto
 * a ALVO IA não existir, o estado continua "não conectado".
 */
export const salvarAgenteDeIA = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ agentName: z.string().trim().min(2).max(40), persona: personaSchema.default({}) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "alterar_dados_barbearia");
    const db = await admin();
    const { error } = await db.from("integracoes_de_ia").upsert(
      {
        tenant_id: tenantId,
        provedor: PROVEDOR_PADRAO,
        agent_name: data.agentName,
        agent_persona: data.persona,
      },
      { onConflict: "tenant_id,provedor" },
    );
    if (error) throw new Error(error.message);
    await context.supabase.rpc("registrar_auditoria_barbearia", {
      _tenant_id: tenantId,
      _acao: "alvo_ia.agente_salvo",
      _alvo: data.agentName,
      _detalhes: {},
    });
    return { ok: true };
  });

/**
 * Liga o atendente à barbearia.
 *
 * A conexão que importa é a ponte de ENTRADA: o Cortaí emite uma chave
 * exclusiva da barbearia e o atendente passa a consultar serviços, preços,
 * profissionais, disponibilidade, clientes e agenda por ela. A chave em texto
 * puro só aparece UMA vez, aqui; depois só o começo dela é exibido.
 *
 * Se o ambiente também tiver saída configurada (Cortaí → ALVO IA), o vínculo
 * externo é criado no mesmo passo. Sem isso, a ponte continua válida.
 */
export const conectarAlvoIA = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "alterar_dados_barbearia");
    const db = await admin();
    const { gerarToken } = await import("@/lib/ia/ponte.server");
    const { provedorDeIA } = await import("@/lib/ia/alvo-ia.server");
    const provedor = provedorDeIA();

    const { data: tenant } = await db.from("tenants").select("nome").eq("id", tenantId).maybeSingle();
    const chave = await gerarToken();
    const agora = new Date().toISOString();

    let externalTenantId: string | null = tenantId;
    let aviso: string | null = null;
    if (provedor.estaConfigurado()) {
      try {
        const vinculo = await provedor.registrarTenant({ tenantId, nome: tenant?.nome ?? "Barbearia" });
        externalTenantId = vinculo.externalTenantId;
      } catch (erro) {
        aviso = erro instanceof Error ? erro.message : "Falha ao avisar a ALVO IA.";
      }
    }

    const { error } = await db.from("integracoes_de_ia").upsert(
      {
        tenant_id: tenantId,
        provedor: PROVEDOR_PADRAO,
        external_tenant_id: externalTenantId,
        status: "conectado" satisfies StatusDaIntegracao,
        conectado_em: agora,
        token_hash: chave.hash,
        token_prefixo: chave.prefixo,
        token_criado_em: agora,
        token_usado_em: null,
        ultimo_erro: aviso,
      },
      { onConflict: "tenant_id,provedor" },
    );
    if (error) throw new Error(error.message);

    await context.supabase.rpc("registrar_auditoria_barbearia", {
      _tenant_id: tenantId,
      _acao: "alvo_ia.conexao_ativada",
      _alvo: chave.prefixo,
      _detalhes: { saida_configurada: provedor.estaConfigurado() },
    });

    return {
      status: "conectado" as StatusDaIntegracao,
      url: URL_DA_PONTE,
      /** Aparece uma única vez. Depois não é possível recuperá-la. */
      token: chave.token,
      aviso,
    };
  });

/** Desliga a ponte: a chave deixa de funcionar imediatamente. */
export const desconectarAlvoIA = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "alterar_dados_barbearia");
    const db = await admin();
    const { error } = await db
      .from("integracoes_de_ia")
      .update({
        status: "desconectado" satisfies StatusDaIntegracao,
        token_hash: null,
        token_prefixo: null,
        token_criado_em: null,
        token_usado_em: null,
        conectado_em: null,
      })
      .eq("tenant_id", tenantId)
      .eq("provedor", PROVEDOR_PADRAO);
    if (error) throw new Error(error.message);
    await context.supabase.rpc("registrar_auditoria_barbearia", {
      _tenant_id: tenantId,
      _acao: "alvo_ia.conexao_desligada",
      _alvo: tenantId,
      _detalhes: {},
    });
    return { ok: true };
  });


/* ------------------------- Sincronização com o Cortaí --------------------- */

export type SincronizacaoDoCortai = {
  /** A chave de acesso da barbearia está emitida e ativa? */
  cortaiConectado: boolean;
  servicos: number;
  profissionais: number;
  clientes: number;
  agendamentosHoje: number;
  proximosAgendamentos: number;
  informacoes: number;
  /** A agenda pode ser consultada (há horário de funcionamento cadastrado). */
  agendaDisponivel: boolean;
  whatsapp: { status: string; numero: string | null };
  ultimaSincronizacao: string | null;
};

/**
 * Números reais da barbearia, usados para mostrar o que a ALVO IA enxerga.
 * Só lê dados — não altera atendimento nem agenda.
 */
export const getSincronizacaoDoCortai = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SincronizacaoDoCortai> => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "ver_cortai");
    const db = await admin();
    const agora = new Date();
    const inicioDoDia = new Date(agora);
    inicioDoDia.setHours(0, 0, 0, 0);
    const fimDoDia = new Date(inicioDoDia.getTime() + 24 * 60 * 60 * 1000);
    const contar = (tabela: string) =>
      db.from(tabela as never).select("id", { count: "exact", head: true }).eq("tenant_id", tenantId);

    const [servicos, profissionais, clientes, hoje, proximos, informacoes, horarios, conexao, integracao] =
      await Promise.all([
        contar("servicos").eq("ativo", true),
        contar("profissionais").eq("ativo", true),
        contar("clientes").is("arquivado_em", null),
        contar("agendamentos")
          .gte("inicio", inicioDoDia.toISOString())
          .lt("inicio", fimDoDia.toISOString())
          .not("status", "in", "(cancelado,falta)"),
        contar("agendamentos")
          .gte("inicio", agora.toISOString())
          .not("status", "in", "(cancelado,falta)"),
        contar("informacoes_da_barbearia").eq("ativo", true),
        contar("horarios_de_funcionamento").eq("fechado", false),
        db
          .from("conexoes_whatsapp")
          .select("status, numero")
          .eq("tenant_id", tenantId)
          .maybeSingle(),
        db
          .from("integracoes_de_ia")
          .select("token_hash, token_usado_em, status")
          .eq("tenant_id", tenantId)
          .eq("provedor", PROVEDOR_PADRAO)
          .maybeSingle(),
      ]);

    const chave = integracao.data as Record<string, any> | null;
    return {
      cortaiConectado: Boolean(chave?.["token_hash"]) && chave?.["status"] !== "suspenso",
      servicos: servicos.count ?? 0,
      profissionais: profissionais.count ?? 0,
      clientes: clientes.count ?? 0,
      agendamentosHoje: hoje.count ?? 0,
      proximosAgendamentos: proximos.count ?? 0,
      informacoes: informacoes.count ?? 0,
      agendaDisponivel: (horarios.count ?? 0) > 0,
      whatsapp: {
        status: (conexao.data?.status as string) ?? "desconectado",
        numero: (conexao.data?.numero as string) ?? null,
      },
      ultimaSincronizacao: (chave?.["token_usado_em"] as string) ?? null,
    };
  });

/* ------------------- Painel operacional do barbeiro (ALVO IA) ------------- */

export type AgendamentoDoPainel = {
  id: string;
  inicio: string;
  fim: string;
  status: string;
  valorCentavos: number;
  formaPagamento: string | null;
  cliente: { id: string; nome: string; telefone: string | null } | null;
  servico: { nome: string; duracaoMin: number; precoCentavos: number } | null;
  profissional: { nome: string } | null;
};

export type ClienteDoPainel = {
  id: string;
  nome: string;
  telefone: string | null;
  criadoEm: string;
  ultimaVisita: string | null;
  visitas: number;
};

export type PainelOperacional = {
  /** Estado real da ponte com o Cortaí — nunca "não encontrado". */
  estado: "conectado" | "nao_configurado" | "sem_dados" | "erro";
  motivo: string | null;
  barbearia: { nome: string; telefone: string | null; endereco: string | null };
  resumo: {
    agendamentosHoje: number;
    concluidosHoje: number;
    previstoHojeCentavos: number;
    proximos: number;
    clientes: number;
    servicos: number;
    profissionais: number;
  };
  hoje: AgendamentoDoPainel[];
  proximos: AgendamentoDoPainel[];
  clientes: ClienteDoPainel[];
  servicos: { id: string; nome: string; duracaoMin: number; precoCentavos: number; ativo: boolean }[];
  profissionais: { id: string; nome: string; ativo: boolean }[];
  horarios: { diaSemana: number; fechado: boolean; abre: string; fecha: string }[];
  whatsapp: { status: string; numero: string | null };
  ultimaSincronizacao: string | null;
};

function agendamentoDoPainel(linha: Record<string, any>): AgendamentoDoPainel {
  const cliente = linha["clientes"] as Record<string, any> | null;
  const servico = linha["servicos"] as Record<string, any> | null;
  const profissional = linha["profissionais"] as Record<string, any> | null;
  return {
    id: linha["id"] as string,
    inicio: linha["inicio"] as string,
    fim: linha["fim"] as string,
    status: (linha["status"] as string) ?? "confirmado",
    valorCentavos: (linha["valor_centavos"] as number) ?? 0,
    formaPagamento: (linha["forma_pagamento"] as string) ?? null,
    cliente: cliente
      ? { id: cliente["id"] as string, nome: cliente["nome"] as string, telefone: (cliente["telefone"] as string) ?? null }
      : null,
    servico: servico
      ? {
          nome: servico["nome"] as string,
          duracaoMin: (servico["duracao_min"] as number) ?? 0,
          precoCentavos: (servico["preco_centavos"] as number) ?? 0,
        }
      : null,
    profissional: profissional ? { nome: profissional["nome"] as string } : null,
  };
}

/**
 * Tudo que o barbeiro precisa para administrar a operação dentro do ALVO IA,
 * lido direto do Cortaí (fonte de verdade) e sempre da própria barbearia.
 */
export const getPainelOperacional = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PainelOperacional> => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "ver_cortai");
    const db = await admin();

    const agora = new Date();
    const inicioDoDia = new Date(agora);
    inicioDoDia.setHours(0, 0, 0, 0);
    const fimDoDia = new Date(inicioDoDia.getTime() + 24 * 60 * 60 * 1000);
    const selecao =
      "id, inicio, fim, status, valor_centavos, forma_pagamento, clientes(id, nome, telefone), servicos(nome, duracao_min, preco_centavos), profissionais(nome)";

    const [tenant, hoje, proximos, clientes, servicos, profissionais, horarios, conexao, integracao, totalClientes] =
      await Promise.all([
        db.from("tenants").select("nome, telefone, endereco").eq("id", tenantId).maybeSingle(),
        db
          .from("agendamentos")
          .select(selecao)
          .eq("tenant_id", tenantId)
          .gte("inicio", inicioDoDia.toISOString())
          .lt("inicio", fimDoDia.toISOString())
          .order("inicio", { ascending: true }),
        db
          .from("agendamentos")
          .select(selecao)
          .eq("tenant_id", tenantId)
          .gte("inicio", fimDoDia.toISOString())
          .not("status", "in", "(cancelado,falta)")
          .order("inicio", { ascending: true })
          .limit(20),
        db
          .from("clientes")
          .select("id, nome, telefone, criado_em")
          .eq("tenant_id", tenantId)
          .is("arquivado_em", null)
          .order("criado_em", { ascending: false })
          .limit(30),
        db
          .from("servicos")
          .select("id, nome, duracao_min, preco_centavos, ativo")
          .eq("tenant_id", tenantId)
          .order("ordem", { ascending: true }),
        db.from("profissionais").select("id, nome, ativo").eq("tenant_id", tenantId).order("nome"),
        db
          .from("horarios_de_funcionamento")
          .select("dia_semana, fechado, abre, fecha")
          .eq("tenant_id", tenantId)
          .order("dia_semana"),
        db.from("conexoes_whatsapp").select("status, numero").eq("tenant_id", tenantId).maybeSingle(),
        db
          .from("integracoes_de_ia")
          .select("token_hash, token_usado_em, status, ultimo_erro")
          .eq("tenant_id", tenantId)
          .eq("provedor", PROVEDOR_PADRAO)
          .maybeSingle(),
        db.from("clientes").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).is("arquivado_em", null),
      ]);

    const listaHoje = ((hoje.data ?? []) as Record<string, any>[]).map(agendamentoDoPainel);
    const listaProximos = ((proximos.data ?? []) as Record<string, any>[]).map(agendamentoDoPainel);
    const idsDeClientes = ((clientes.data ?? []) as Record<string, any>[]).map((c) => c["id"] as string);

    let visitasPorCliente = new Map<string, { total: number; ultima: string }>();
    if (idsDeClientes.length > 0) {
      const { data: visitas } = await db
        .from("agendamentos")
        .select("cliente_id, inicio")
        .eq("tenant_id", tenantId)
        .in("cliente_id", idsDeClientes)
        .not("status", "in", "(cancelado,falta)")
        .lte("inicio", agora.toISOString());
      for (const linha of (visitas ?? []) as Record<string, any>[]) {
        const id = linha["cliente_id"] as string;
        const inicio = linha["inicio"] as string;
        const atual = visitasPorCliente.get(id);
        visitasPorCliente.set(id, {
          total: (atual?.total ?? 0) + 1,
          ultima: !atual || inicio > atual.ultima ? inicio : atual.ultima,
        });
      }
    }

    const chave = integracao.data as Record<string, any> | null;
    const temChave = Boolean(chave?.["token_hash"]) && chave?.["status"] !== "suspenso";
    const semDados = (servicos.data ?? []).length === 0 && (profissionais.data ?? []).length === 0;
    const estado: PainelOperacional["estado"] = chave?.["ultimo_erro"]
      ? "erro"
      : !temChave
        ? "nao_configurado"
        : semDados
          ? "sem_dados"
          : "conectado";

    return {
      estado,
      motivo:
        estado === "erro"
          ? ((chave?.["ultimo_erro"] as string) ?? null)
          : estado === "nao_configurado"
            ? "A chave de acesso do atendente ainda não foi emitida em Integrações."
            : estado === "sem_dados"
              ? "Cadastre serviços e profissionais para o atendente trabalhar."
              : null,
      barbearia: {
        nome: (tenant.data?.nome as string) ?? "Barbearia",
        telefone: (tenant.data?.telefone as string) ?? null,
        endereco: (tenant.data?.endereco as string) ?? null,
      },
      resumo: {
        agendamentosHoje: listaHoje.filter((a) => a.status !== "cancelado" && a.status !== "falta").length,
        concluidosHoje: listaHoje.filter((a) => a.status === "concluido").length,
        previstoHojeCentavos: listaHoje
          .filter((a) => a.status !== "cancelado" && a.status !== "falta")
          .reduce((soma, a) => soma + (a.valorCentavos || (a.servico?.precoCentavos ?? 0)), 0),
        proximos: listaProximos.length,
        clientes: totalClientes.count ?? 0,
        servicos: ((servicos.data ?? []) as Record<string, any>[]).filter((s) => s["ativo"]).length,
        profissionais: ((profissionais.data ?? []) as Record<string, any>[]).filter((p) => p["ativo"]).length,
      },
      hoje: listaHoje,
      proximos: listaProximos,
      clientes: ((clientes.data ?? []) as Record<string, any>[]).map((c) => {
        const visitas = visitasPorCliente.get(c["id"] as string);
        return {
          id: c["id"] as string,
          nome: c["nome"] as string,
          telefone: (c["telefone"] as string) ?? null,
          criadoEm: c["criado_em"] as string,
          ultimaVisita: visitas?.ultima ?? null,
          visitas: visitas?.total ?? 0,
        };
      }),
      servicos: ((servicos.data ?? []) as Record<string, any>[]).map((s) => ({
        id: s["id"] as string,
        nome: s["nome"] as string,
        duracaoMin: (s["duracao_min"] as number) ?? 0,
        precoCentavos: (s["preco_centavos"] as number) ?? 0,
        ativo: Boolean(s["ativo"]),
      })),
      profissionais: ((profissionais.data ?? []) as Record<string, any>[]).map((p) => ({
        id: p["id"] as string,
        nome: p["nome"] as string,
        ativo: Boolean(p["ativo"]),
      })),
      horarios: ((horarios.data ?? []) as Record<string, any>[]).map((h) => ({
        diaSemana: (h["dia_semana"] as number) ?? 0,
        fechado: Boolean(h["fechado"]),
        abre: String(h["abre"] ?? "").slice(0, 5),
        fecha: String(h["fecha"] ?? "").slice(0, 5),
      })),
      whatsapp: {
        status: (conexao.data?.status as string) ?? "desconectado",
        numero: (conexao.data?.numero as string) ?? null,
      },
      ultimaSincronizacao: (chave?.["token_usado_em"] as string) ?? null,
    };
  });
