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
