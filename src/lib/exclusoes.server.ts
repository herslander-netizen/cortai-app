/** Registro permanente de quem excluiu o quê e quando (tabela da plataforma). */
export async function gravarExclusao(
  context: { userId: string; claims?: Record<string, unknown> },
  tipo: string,
  alvoId: string,
  tenantId: string | null,
  alvoNome: string | null = null,
): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const email = typeof context.claims?.["email"] === "string" ? (context.claims["email"] as string) : null;
  const { error } = await (supabaseAdmin as any).from("exclusoes_permanentes").insert({
    tipo, alvo_id: alvoId, alvo_nome: alvoNome, tenant_id: tenantId, ator_id: context.userId, ator_email: email,
  });
  if (error) console.error("[exclusoes] registro falhou:", error.message);
}
