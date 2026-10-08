/**
 * Profissional avisa atraso pelo WhatsApp → o próximo cliente recebe o aviso.
 *
 * Sininho primeiro (fonte da verdade, com dedupe por agendamento + minutos);
 * depois o WhatsApp do cliente pela regra de formato oficial. Falha de canal
 * vira resultado honesto (enviado: false) e fica visível no sininho.
 */
import { linkDoAgendamento } from "@/lib/links-de-tela";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function avisarClienteDoAtraso(input: {
  tenantId: string;
  agendamentoId: string;
  minutos: number;
}): Promise<{ enviado: boolean; motivo: string | null; cliente: string | null }> {
  const db = await admin();
  const { data: ag } = await db
    .from("agendamentos")
    .select("id, tenant_id, inicio, clientes(nome, telefone), profissionais(nome), tenants(nome)")
    .eq("id", input.agendamentoId)
    .eq("tenant_id", input.tenantId)
    .maybeSingle();
  if (!ag) throw new Error("Agendamento não encontrado.");
  const rel = ag as any;
  const cliente: string | null = rel.clientes?.nome ?? null;
  const telefone: string | null = rel.clientes?.telefone ?? null;
  const { fusoDoTenant } = await import("@/lib/fuso.server");
  const fuso = await fusoDoTenant(input.tenantId);
  const hora = new Intl.DateTimeFormat("pt-BR", {
    timeZone: fuso,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(ag.inicio));

  const link = `${linkDoAgendamento(ag.id)}#atraso-${input.minutos}`;
  const { data: ja } = await db
    .from("notificacoes")
    .select("id")
    .eq("tenant_id", input.tenantId)
    .eq("tipo", "atraso_avisado")
    .eq("link", link)
    .limit(1)
    .maybeSingle();
  if (ja) return { enviado: true, motivo: "ja_avisado", cliente };
  await db.from("notificacoes").insert({
    tenant_id: input.tenantId,
    tipo: "atraso_avisado",
    titulo: `${rel.profissionais?.nome ?? "Profissional"} avisou atraso de ${input.minutos} min`,
    corpo: `${cliente ?? "Cliente"} · ${hora}`,
    link,
  });

  if (!telefone) return { enviado: false, motivo: "Cliente sem telefone.", cliente };
  try {
    const { conexaoDeEnvio } = await import("./conexao-envio.server");
    const conexao = await conexaoDeEnvio(input.tenantId, "notificacoes");
    if (!conexao) return { enviado: false, motivo: "Nenhum WhatsApp disponível.", cliente };
    const { conversaDoTelefone, enviarPelaBarbearia } = await import("./fluxo.server");
    const conversa = await conversaDoTelefone({
      tenantId: input.tenantId,
      conexaoId: conexao.id,
      telefone,
      nomeContato: cliente,
    });
    const primeiro = (cliente ?? "").split(" ")[0] || "Olá";
    await enviarPelaBarbearia({
      tenantId: input.tenantId,
      conversaId: conversa.id,
      conexaoId: conexao.id,
      sessaoId: conexao.sessao_id,
      telefone,
      texto: `${primeiro}, seu atendimento das ${hora} em ${rel.tenants?.nome ?? "nosso negócio"} vai atrasar cerca de ${input.minutos} min. Se precisar remarcar, responda aqui.`,
      porIa: true,
      iniciadaPelaBarbearia: true,
    });
    return { enviado: true, motivo: null, cliente };
  } catch (e) {
    return {
      enviado: false,
      motivo: e instanceof Error ? e.message : "Falha ao enviar pelo WhatsApp.",
      cliente,
    };
  }
}
