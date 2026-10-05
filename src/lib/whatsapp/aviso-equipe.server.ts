/**
 * Aviso para a equipe quando o cliente confirma o horário.
 *
 * Só o sininho (`notificacoes`): equipe não recebe aviso operacional por
 * WhatsApp (mensagem iniciada pela empresa falha fora da janela e gera custo).
 * O push da equipe vem em outra fase, a partir deste mesmo registro.
 *
 * Nunca lança: falha aqui jamais desfaz a confirmação do cliente.
 */
import { fusoDoTenant } from "@/lib/fuso.server";
import { linkDoAgendamento } from "@/lib/links-de-tela";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function dataHoraBr(iso: string, fuso: string) {
  const f = new Intl.DateTimeFormat("pt-BR", {
    timeZone: fuso,
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  return f.format(new Date(iso)).replace(",", "");
}

/** Registra no sininho do negócio que o cliente confirmou. */
export async function avisarEquipeDaConfirmacao(agendamentoId: string): Promise<void> {
  try {
    const db = await admin();
    const { data: ag } = await db
      .from("agendamentos")
      .select("id, tenant_id, inicio, clientes(nome), servicos(nome), profissionais(nome)")
      .eq("id", agendamentoId)
      .maybeSingle();
    if (!ag) return;

    const link = linkDoAgendamento(ag.id);
    // Idempotente: um aviso por agendamento confirmado.
    const { data: jaAvisado } = await db
      .from("notificacoes")
      .select("id")
      .eq("tenant_id", ag.tenant_id)
      .eq("tipo", "agendamento_confirmado")
      .eq("link", link)
      .limit(1)
      .maybeSingle();
    if (jaAvisado) return;

    const fuso = await fusoDoTenant(ag.tenant_id);
    const rel = ag as unknown as {
      clientes?: { nome?: string | null } | null;
      servicos?: { nome?: string | null } | null;
      profissionais?: { nome?: string | null } | null;
    };
    const cliente = rel.clientes?.nome ?? "Cliente";
    const servico = rel.servicos?.nome ?? null;
    const profissional = rel.profissionais?.nome ?? null;
    const resumo = [
      cliente,
      servico,
      profissional ? `com ${profissional}` : null,
      dataHoraBr(ag.inicio, fuso),
    ]
      .filter(Boolean)
      .join(" · ");

    await db.from("notificacoes").insert({
      tenant_id: ag.tenant_id,
      tipo: "agendamento_confirmado",
      titulo: "Horário confirmado pelo cliente",
      corpo: resumo,
      link,
    });
  } catch (e) {
    console.error("[whatsapp] aviso de confirmação falhou:", e instanceof Error ? e.message : e);
  }
}
