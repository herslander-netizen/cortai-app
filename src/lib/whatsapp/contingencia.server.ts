/**
 * Quem responde pelo negócio na contingência (nome do dono) e o aviso para ele (sininho/push com o WhatsApp do
 * cliente). Falha nunca bloqueia a mensagem ao cliente: sem nome, o texto fala em "a equipe".
 */
import { avisoDePedidoDeAtendimento } from "./pedido-de-atendimento";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function responsavelDoNegocio(tenantId: string): Promise<string | null> {
  try {
    const db = await admin();
    const { data: dono } = await db
      .from("tenant_usuarios")
      .select("user_id")
      .eq("tenant_id", tenantId)
      .eq("papel", "dono")
      .eq("ativo", true)
      .limit(1)
      .maybeSingle();
    if (!dono?.user_id) return null;
    // Nome que o dono usa na equipe primeiro (é o que o cliente conhece); depois o do perfil da conta.
    const { data: prof } = await db
      .from("profissionais")
      .select("nome")
      .eq("tenant_id", tenantId)
      .eq("user_id", dono.user_id)
      .limit(1)
      .maybeSingle();
    if (prof?.nome?.trim()) return prof.nome;
    const { data: perfil } = await db
      .from("perfis")
      .select("nome")
      .eq("user_id", dono.user_id)
      .maybeSingle();
    return perfil?.nome?.trim() || null;
  } catch {
    return null;
  }
}

/** Avisa a equipe (o mesmo aviso de "Cliente pediu atendimento", que abre a conversa no WhatsApp). */
export async function avisarEquipeDaContingencia(input: {
  tenantId: string;
  telefone: string;
  texto: string;
}): Promise<void> {
  try {
    const db = await admin();
    await db.rpc("criar_notificacao", {
      _tenant: input.tenantId,
      ...avisoDePedidoDeAtendimento(input.telefone, input.texto || "Áudio"),
    });
  } catch {
    /* o aviso nunca impede a resposta ao cliente */
  }
}
