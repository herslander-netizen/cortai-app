import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { exigirPermissao, tenantIdDoMembro } from "@/lib/tenant";
import {
  PROVEDOR_PADRAO,
  type IntegracaoDeIA,
  type PersonaDoAgente,
  type StatusDaIntegracao,
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
    metadata: ((linha?.["metadata"] as Record<string, unknown>) ?? {}) as Record<string, unknown>,
  };
}

export type PainelDeIntegracao = {
  integracao: IntegracaoDeIA;
  /** Há endpoint/credencial da ALVO IA neste ambiente? */
  disponivel: boolean;
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
    return {
      integracao: daLinha(tenantId, linha as Record<string, any> | null),
      disponivel: provedorDeIA().estaConfigurado(),
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
 * Pede o vínculo da barbearia na ALVO IA. Só funciona quando o ambiente tiver
 * endpoint e credencial configurados — não existe conexão simulada.
 */
export const conectarAlvoIA = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "alterar_dados_barbearia");
    const { provedorDeIA } = await import("@/lib/ia/alvo-ia.server");
    const provedor = provedorDeIA();
    if (!provedor.estaConfigurado()) {
      throw new Error("A ALVO IA ainda não está disponível. Assim que liberarmos, a conexão aparece aqui.");
    }
    const db = await admin();
    const { data: tenant } = await db.from("tenants").select("nome").eq("id", tenantId).maybeSingle();
    try {
      const vinculo = await provedor.registrarTenant({ tenantId, nome: tenant?.nome ?? "Barbearia" });
      await db.from("integracoes_de_ia").upsert(
        {
          tenant_id: tenantId,
          provedor: PROVEDOR_PADRAO,
          external_tenant_id: vinculo.externalTenantId,
          status: vinculo.status,
          conectado_em: vinculo.status === "conectado" ? new Date().toISOString() : null,
          ultimo_erro: null,
        },
        { onConflict: "tenant_id,provedor" },
      );
      await context.supabase.rpc("registrar_auditoria_barbearia", {
        _tenant_id: tenantId,
        _acao: "alvo_ia.conexao_solicitada",
        _alvo: vinculo.externalTenantId,
        _detalhes: { status: vinculo.status },
      });
      return { status: vinculo.status as StatusDaIntegracao };
    } catch (erro) {
      const mensagem = erro instanceof Error ? erro.message : "Falha desconhecida";
      await db.from("integracoes_de_ia").upsert(
        { tenant_id: tenantId, provedor: PROVEDOR_PADRAO, status: "erro", ultimo_erro: mensagem },
        { onConflict: "tenant_id,provedor" },
      );
      throw new Error(mensagem);
    }
  });
