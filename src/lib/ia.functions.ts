import { createServerFn } from "@tanstack/react-start";
import { inicioDoDiaNoFuso, inicioDoMesNoFuso } from "@/lib/horarios";
import { fusoDoTenant } from "@/lib/fuso.server";
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
    metadata: ((linha?.["metadata"] as Record<string, ValorSimples>) ?? {}) as Record<
      string,
      ValorSimples
    >,
  };
}

/** Endereço público, real, que a ALVO IA / CortAI chama para operar a agenda. */
export const URL_DA_PONTE = "https://cortai.dev/api/public/cortai/acoes";

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
    const inicioDoDia = inicioDoDiaNoFuso(await fusoDoTenant(tenantId), agora);
    const fimDoDia = new Date(inicioDoDia.getTime() + 24 * 60 * 60 * 1000);
    const contar = (tabela: string) =>
      db
        .from(tabela as never)
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId);

    const [
      servicos,
      profissionais,
      clientes,
      hoje,
      proximos,
      informacoes,
      horarios,
      conexao,
      integracao,
    ] = await Promise.all([
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
      db.from("conexoes_whatsapp").select("status, numero").eq("tenant_id", tenantId).maybeSingle(),
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
