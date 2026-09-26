/**
 * Aviso para a equipe quando o cliente confirma o horário.
 *
 * Duas saídas, nenhuma delas obrigatória para o cliente:
 * - agenda: registro em `notificacoes` (sino do painel), com o resumo;
 * - WhatsApp do barbeiro: mesma infraestrutura já existente da barbearia.
 *
 * Nunca lança: falha aqui jamais desfaz a confirmação do cliente.
 */
import { fusoDoTenant } from "@/lib/fuso.server";

import { conversaDoTelefone, enviarPelaBarbearia } from "./fluxo.server";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function somenteDigitos(v: string) {
  return v.replace(/\D/g, "");
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

function reais(centavos: number | null | undefined) {
  if (!centavos || centavos <= 0) return null;
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Avisa a equipe (agenda + WhatsApp do barbeiro) que o cliente confirmou. */
export async function avisarEquipeDaConfirmacao(agendamentoId: string): Promise<void> {
  try {
    const db = await admin();
    const { data: ag } = await db
      .from("agendamentos")
      .select(
        "id, tenant_id, inicio, valor_centavos, profissional_id, clientes(nome, telefone), servicos(nome), profissionais(nome, user_id)",
      )
      .eq("id", agendamentoId)
      .maybeSingle();
    if (!ag) return;

    const link = `/barbeiro/agenda?agendamento=${ag.id}`;
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
      profissionais?: { nome?: string | null; user_id?: string | null } | null;
    };
    const cliente = rel.clientes?.nome ?? "Cliente";
    const servico = rel.servicos?.nome ?? null;
    const profissional = rel.profissionais?.nome ?? null;
    const quando = dataHoraBr(ag.inicio, fuso);
    const valor = reais(ag.valor_centavos);

    const resumo = [cliente, servico, profissional ? `com ${profissional}` : null, quando, valor]
      .filter(Boolean)
      .join(" — ");

    await db.from("notificacoes").insert({
      tenant_id: ag.tenant_id,
      tipo: "agendamento_confirmado",
      titulo: "Horário confirmado pelo cliente",
      corpo: resumo,
      link,
    });

    await avisarBarbeiroNoWhatsapp({
      tenantId: ag.tenant_id,
      userIdDoProfissional: rel.profissionais?.user_id ?? null,
      texto: [
        "✅ *Horário confirmado pelo cliente*",
        "",
        `👤 ${cliente}`,
        servico ? `✂️ ${servico}` : null,
        profissional ? `💈 ${profissional}` : null,
        `🗓️ ${quando}`,
        valor ? `💰 ${valor}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
    });
  } catch (e) {
    console.error("[whatsapp] aviso de confirmação falhou:", e instanceof Error ? e.message : e);
  }
}

/** Envia o resumo para o WhatsApp do barbeiro (ou o da barbearia, se ele não tiver número). */
async function avisarBarbeiroNoWhatsapp(input: {
  tenantId: string;
  userIdDoProfissional: string | null;
  texto: string;
}): Promise<void> {
  const db = await admin();

  let destino: string | null = null;
  if (input.userIdDoProfissional) {
    const { data: perfil } = await db
      .from("perfis")
      .select("telefone")
      .eq("user_id", input.userIdDoProfissional)
      .maybeSingle();
    if (perfil?.telefone && somenteDigitos(perfil.telefone).length >= 10) destino = perfil.telefone;
  }

  const { data: tenant } = await db
    .from("tenants")
    .select("whatsapp, telefone")
    .eq("id", input.tenantId)
    .maybeSingle();

  if (!destino) {
    const alternativo = tenant?.whatsapp ?? tenant?.telefone ?? null;
    if (alternativo && somenteDigitos(alternativo).length >= 10) destino = alternativo;
  }
  if (!destino) return;

  const { data: conexao } = await db
    .from("conexoes_whatsapp")
    .select("id, sessao_id, status, numero")
    .eq("tenant_id", input.tenantId)
    .maybeSingle();
  if (!conexao || conexao.status !== "conectado") return;

  // O número do próprio bot não manda mensagem para ele mesmo.
  if (conexao.numero && somenteDigitos(conexao.numero) === somenteDigitos(destino)) return;

  const conversa = await conversaDoTelefone({
    tenantId: input.tenantId,
    conexaoId: conexao.id,
    telefone: destino,
    nomeContato: "Equipe da barbearia",
  });

  await enviarPelaBarbearia({
    tenantId: input.tenantId,
    conversaId: conversa.id,
    conexaoId: conexao.id,
    sessaoId: conexao.sessao_id,
    telefone: destino,
    texto: input.texto,
    porIa: false,
    iniciadaPelaBarbearia: true,
  });
}
