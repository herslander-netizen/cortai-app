/**
 * Matriz de recursos por plano.
 * A chave do recurso + o plano da barbearia decidem o acesso; a verificação
 * acontece sempre no servidor, nunca no navegador.
 */
export const RECURSOS = {
  loja_online: "Loja online",
  produtos_estoque: "Produtos e estoque",
  fidelidade: "Fidelidade",
  fila_espera: "Fila de espera",
  indicacoes: "Indicações",
  crescimento: "Crescimento e análises",
  agendamento_manual: "Encaixes",
  personalizacao_cliente: "Personalização avançada do cliente",
  branding_avancado: "Página e branding avançado",
  modo_foco: "Modo Foco",
  comanda_caixa: "Comanda e caixa",
  historico_completo: "Histórico completo",
  secretaria_whatsapp: "Secretária Cortaí, WhatsApp e agendamento pelo cliente",
  equipe_avancada: "Gestão avançada de equipe e permissões",
} as const;

export type ChaveDeRecurso = keyof typeof RECURSOS;
export const PLANOS = ["essencial", "pro", "conecta", "studio"] as const;
export type Plano = (typeof PLANOS)[number];

export const ROTULO_DO_PLANO: Record<string, string> = {
  essencial: "Essencial",
  pro: "Profissional",
  conecta: "Conecta",
  studio: "Equipe",
};

/**
 * Lê a matriz e responde se o plano do tenant libera o recurso.
 * A matriz é configuração interna da plataforma: a leitura acontece sempre
 * pelo servidor, nunca pela sessão do usuário.
 */
export async function recursoLiberado(
  db: any,
  tenantId: string,
  chave: ChaveDeRecurso,
): Promise<{ liberado: boolean; plano: string }> {
  const { data: tenant } = await db.from("tenants").select("plano").eq("id", tenantId).maybeSingle();
  const plano = (tenant?.plano as string) ?? "essencial";
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: regra } = await supabaseAdmin
    .from("recursos_de_plano")
    .select("liberado")
    .eq("chave", chave)
    .eq("plano", plano)
    .maybeSingle();
  // Sem linha na matriz o recurso é considerado liberado (evita travar o app
  // quando um recurso novo ainda não foi mapeado pelo dono da plataforma).
  return { liberado: regra?.liberado ?? true, plano };
}

export class RecursoBloqueadoError extends Error {
  constructor(chave: ChaveDeRecurso, plano: string) {
    super(
      `O recurso "${RECURSOS[chave]}" não está incluído no plano ${ROTULO_DO_PLANO[plano] ?? plano}. Faça upgrade para liberar.`,
    );
    this.name = "RecursoBloqueadoError";
  }
}

/** Garante o recurso no servidor; lança erro legível quando bloqueado. */
export async function exigirRecurso(db: any, tenantId: string, chave: ChaveDeRecurso) {
  const { liberado, plano } = await recursoLiberado(db, tenantId, chave);
  if (!liberado) throw new RecursoBloqueadoError(chave, plano);
  return plano;
}

/**
 * Agendamento feito pelo próprio cliente (página pública, app do cliente) só
 * existe a partir do Conecta. Usa a mesma checagem do banco que a Secretária
 * e o WhatsApp (plano + interruptor do negócio).
 */
export async function exigirAgendamentoPeloCliente(tenantId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("recurso_do_tenant_ativo", {
    _tenant_id: tenantId,
    _chave: "secretaria_whatsapp",
  });
  if (!error && data === false) {
    throw new Error("Este negócio ainda não recebe agendamentos online. Fale direto com o negócio para marcar.");
  }
}
