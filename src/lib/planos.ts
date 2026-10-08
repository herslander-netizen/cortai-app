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
  secretaria_whatsapp: "WhatsApp, lembretes e automações do WhatsApp",
  equipe_avancada: "Gestão avançada de equipe e permissões",
} as const;

export type ChaveDeRecurso = keyof typeof RECURSOS;
export const PLANOS = ["essencial", "pro", "conecta", "studio"] as const;
export type Plano = (typeof PLANOS)[number];

export const ROTULO_DO_PLANO: Record<string, string> = {
  essencial: "Essencial",
  pro: "Profissional",
  conecta: "Conecta",
  studio: "Studio",
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
  const { data: tenant } = await db
    .from("tenants")
    .select("plano, assinatura_status, teste_fim")
    .eq("id", tenantId)
    .maybeSingle();
  const { planoEfetivo } = await import("@/lib/teste-gratis");
  const plano = planoEfetivo({
    status: (tenant?.assinatura_status as string) ?? null,
    testeFim: (tenant?.teste_fim as string) ?? null,
    plano: (tenant?.plano as string) ?? null,
  });
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
      `O recurso "${RECURSOS[chave]}" não está incluído no plano ${ROTULO_DO_PLANO[plano] ?? plano}. Disponível no plano ${chave === "equipe_avancada" ? "Studio" : "Conecta"}.`,
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
 * Agendamento feito pelo próprio cliente (página pública, app do cliente) vale
 * em todos os planos; só o limite mensal de agendamentos (Essencial) o fecha.
 * Mensagem sem falar de plano: o cliente final nunca vê limite nem upgrade.
 */
export async function exigirAgendamentoPeloCliente(tenantId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { usoDaAgendaOnline } = await import("@/lib/agenda-online.server");
  const { estado } = await usoDaAgendaOnline(supabaseAdmin, tenantId);
  if (estado === "limite_atingido") {
    throw new Error(
      "A agenda online está indisponível no momento. Fale direto com o negócio para marcar.",
    );
  }
}
