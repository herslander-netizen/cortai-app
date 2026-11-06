/**
 * Agendamento na conversa dentro do Flow Bot ligado: roda antes das regras do bot e da Flow IA. Devolve `null` quando
 * a mensagem não é de agendar/remarcar/cancelar/consultar horário (ou o cliente saiu do fluxo): quem vem depois segue.
 *
 * Um emissor por mensagem (fluxo cooperativo, 04/11): quando este passo responde, nem o bot nem a Flow IA falam, e
 * a ação pendente da Flow IA é descartada para um "sim" antigo nunca executar outra coisa.
 */
import { conduzir, estadoValido } from "./conduzir";
import { TEXTOS } from "./textos";

export type EntradaDaAgenda = {
  tenantId: string;
  conversaId: string;
  conexaoId: string;
  sessaoId: string;
  telefone: string;
  texto: string;
  mensagemExternaId: string | null;
  conversa: Record<string, unknown> | null;
  agora: number;
};

export async function atenderAgendaNaConversa(e: EntradaDaAgenda): Promise<boolean | null> {
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const contexto = ((e.conversa?.["contexto"] ?? {}) as Record<string, unknown>) || {};
  const agora = new Date(e.agora);
  const anterior = estadoValido(contexto["agenda"], agora);

  const { data: tenant } = await db
    .from("tenants")
    .select("slug")
    .eq("id", e.tenantId)
    .maybeSingle();
  const { portasDoNegocio } = await import("./portas.server");
  const portas = await portasDoNegocio({
    tenantId: e.tenantId,
    telefone: e.telefone,
    slug: (tenant as { slug?: string } | null)?.slug ?? null,
    agora,
  });
  const r = await conduzir(e.texto, anterior, portas);

  const gravarEstado = (agenda: unknown, limparCerebro: boolean) =>
    db
      .from("conversas_whatsapp")
      .update({
        contexto: {
          ...contexto,
          agenda,
          ...(limparCerebro ? { cerebro: { pendente: null } } : {}),
        } as never,
      })
      .eq("id", e.conversaId);

  if (!r) return null;
  const { registrarOcorrencia } = await import("@/lib/whatsapp/aprendizado.server");
  const ocorrencia = (motivo: "fora_da_etapa" | "erro", detalhe: string) =>
    registrarOcorrencia({
      tenantId: e.tenantId,
      conversaId: e.conversaId,
      mensagemExternaId: e.mensagemExternaId,
      motivo,
      origem: "bot",
      texto: e.texto,
      etapa: anterior?.etapa ?? null,
      detalhe,
    });
  if (!r.textos.length) {
    // Saiu do fluxo (pediu pessoa, ou não deu para entender duas vezes): limpa e devolve a conversa.
    if (anterior) {
      await gravarEstado(null, false);
      await ocorrencia("fora_da_etapa", "Conversa devolvida no meio do agendamento.");
    }
    return null;
  }
  // Aprendizado: o Bot precisou repetir que não entendeu, ou não conseguiu gravar.
  if (r.textos.includes(TEXTOS.falhaGravar)) await ocorrencia("erro", "Não conseguiu gravar.");
  else if (
    anterior &&
    r.textos.some((t) =>
      [TEXTOS.naoEntendiHorario, TEXTOS.naoEntendiOpcao, TEXTOS.nomeInvalido].includes(
        t as (typeof TEXTOS)["naoEntendiOpcao"],
      ),
    )
  )
    await ocorrencia("fora_da_etapa", "O Bot não entendeu a resposta nesta etapa.");

  const { data: rastro, error: erroRastro } = await db
    .from("flow_bot_rastro")
    .insert({
      tenant_id: e.tenantId,
      conversa_id: e.conversaId,
      mensagem_externa_id: e.mensagemExternaId,
      modo: "ligado",
      fluxo_ref: "agenda-na-conversa",
      motivo: `agenda:${anterior?.etapa ?? "inicio"}->${r.estado?.etapa ?? "fim"}`,
      passos: [],
      respostas: r.textos,
      realidade_ausente: [],
      enviado: false,
    })
    .select("id")
    .single();
  // Mesma mensagem entregue de novo: já foi respondida.
  if (erroRastro?.code === "23505") return true;
  if (erroRastro) console.error("[agenda-na-conversa] rastro", erroRastro.message);

  await gravarEstado(r.estado, true);

  const { enviarPelaBarbearia } = await import("@/lib/whatsapp/fluxo.server");
  let enviou = 0;
  for (const texto of r.textos) {
    try {
      await enviarPelaBarbearia({
        tenantId: e.tenantId,
        conversaId: e.conversaId,
        conexaoId: e.conexaoId,
        sessaoId: e.sessaoId,
        telefone: e.telefone,
        texto,
        porIa: false,
      });
      enviou++;
    } catch (erro) {
      console.error("[agenda-na-conversa] envio", erro instanceof Error ? erro.message : erro);
      break;
    }
  }
  if (rastro && enviou === r.textos.length) {
    await db.from("flow_bot_rastro").update({ enviado: true }).eq("id", rastro.id);
  }
  return enviou > 0;
}
