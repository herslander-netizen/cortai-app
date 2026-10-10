/**
 * Registro das ocorrências do serviço Evolution (instável → indisponível → recuperado).
 * Reaproveita a auditoria do negócio (`auditoria_da_barbearia`) como histórico e como memória
 * da ocorrência: o último evento diz em que ponto estamos. Alertas saem pelo sininho/push do
 * gestor (canal independente do WhatsApp) e, para a plataforma, por `alertas_da_plataforma`.
 * Nada aqui lança: falha de alerta nunca interrompe o monitoramento.
 */
import {
  decidirIncidente,
  ROTULO_DA_FALHA,
  type ClasseDaFalha,
  type EventoDoServico,
} from "./incidente-evolution";
import { logConexao } from "./saude-conexao";

const ACOES: Record<EventoDoServico, string> = {
  evolution_instavel: "whatsapp.evolution_instavel",
  evolution_indisponivel: "whatsapp.evolution_indisponivel",
  evolution_recuperado: "whatsapp.evolution_recuperado",
};

export type LinhaMonitorada = {
  id: string;
  tenant_id: string | null;
  sessao_id: string;
};

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function ultimoEventoDoServico(tenantId: string, sessaoId: string) {
  const db = await admin();
  const { data } = await db
    .from("auditoria_da_barbearia")
    .select("acao, criado_em")
    .eq("tenant_id", tenantId)
    .eq("alvo", sessaoId)
    .in("acao", Object.values(ACOES))
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return { evento: null, em: null } as const;
  const evento = (Object.keys(ACOES) as EventoDoServico[]).find((k) => ACOES[k] === data.acao);
  return { evento: evento ?? null, em: data.criado_em as string | null };
}

async function gravar(
  linha: LinhaMonitorada,
  evento: EventoDoServico,
  detalhes: Record<string, unknown>,
) {
  const db = await admin();
  await db.from("auditoria_da_barbearia").insert({
    tenant_id: linha.tenant_id as string,
    ator_user_id: null,
    acao: ACOES[evento],
    alvo: linha.sessao_id,
    detalhes: detalhes as never,
  });
}

async function alertarGestor(
  linha: LinhaMonitorada,
  titulo: string,
  corpo: string,
  versao: string,
) {
  try {
    const { emitirAviso } = await import("@/lib/avisos/emitir.server");
    await emitirAviso({
      tenantId: linha.tenant_id as string,
      evento: "whatsapp_conexao",
      titulo,
      corpo,
      link: "/barbeiro/automacao",
      referencia: linha.id,
      versao,
      alvos: [{ destinatario: "gestor" }],
    });
  } catch (e) {
    logConexao("alerta_do_gestor_falhou", {
      tenantId: linha.tenant_id,
      erro: e instanceof Error ? e.message : "",
    });
  }
}

async function alertaDaPlataforma(
  linha: LinhaMonitorada,
  acao: "abrir" | "resolver",
  classe?: ClasseDaFalha,
) {
  try {
    const db = await admin();
    const titulo = "WhatsApp: serviço Evolution indisponível para um negócio";
    if (acao === "abrir") {
      const { data: aberto } = await db
        .from("alertas_da_plataforma")
        .select("id")
        .eq("origem", "whatsapp_evolution")
        .eq("tenant_id", linha.tenant_id as string)
        .is("resolvido_em", null)
        .limit(1)
        .maybeSingle();
      if (!aberto)
        await db.from("alertas_da_plataforma").insert({
          origem: "whatsapp_evolution",
          nivel: "critico",
          titulo,
          tenant_id: linha.tenant_id as string,
          detalhes: { sessao: linha.sessao_id, classe: classe ?? "desconhecido" } as never,
        });
    } else {
      await db
        .from("alertas_da_plataforma")
        .update({ resolvido_em: new Date().toISOString() })
        .eq("origem", "whatsapp_evolution")
        .eq("tenant_id", linha.tenant_id as string)
        .is("resolvido_em", null);
    }
  } catch (e) {
    logConexao("alerta_da_plataforma_falhou", { erro: e instanceof Error ? e.message : "" });
  }
}

/** A consulta ao serviço falhou: registra instabilidade ou confirma a queda (sem duplicar). */
export async function registrarFalhaDoServico(
  linha: LinhaMonitorada,
  classe: ClasseDaFalha,
  agora: Date,
) {
  if (!linha.tenant_id) return "ignorado" as const;
  try {
    const ultimo = await ultimoEventoDoServico(linha.tenant_id, linha.sessao_id);
    const d = decidirIncidente({
      resultado: "falha",
      classe,
      ultimoEvento: ultimo.evento,
      ultimoEventoEm: ultimo.em,
      agora,
    });
    if (d.tipo === "registrar_instavel") {
      await gravar(linha, "evolution_instavel", { classe });
      logConexao("evolution_instavel", { tenantId: linha.tenant_id, classe });
      return "instavel" as const;
    }
    if (d.tipo === "confirmar_queda") {
      await gravar(linha, "evolution_indisponivel", {
        classe,
        descricao: ROTULO_DA_FALHA[classe],
        impacto: "Atendimento e avisos pelo WhatsApp podem estar interrompidos.",
      });
      logConexao("evolution_queda_confirmada", { tenantId: linha.tenant_id, classe });
      await alertarGestor(
        linha,
        "WhatsApp indisponível",
        "O serviço do WhatsApp não está respondendo. O atendimento e os avisos pelo WhatsApp podem estar interrompidos; a agenda continua funcionando.",
        `evolution-${agora.toISOString().slice(0, 13)}`,
      );
      await alertaDaPlataforma(linha, "abrir", classe);
      return "queda" as const;
    }
  } catch (e) {
    logConexao("registro_de_falha_do_servico_falhou", {
      tenantId: linha.tenant_id,
      erro: e instanceof Error ? e.message : "",
    });
  }
  return "nada" as const;
}

/** A consulta ao serviço respondeu: encerra a ocorrência aberta e avisa a recuperação. */
export async function registrarServicoOk(linha: LinhaMonitorada, agora: Date) {
  if (!linha.tenant_id) return "ignorado" as const;
  try {
    const ultimo = await ultimoEventoDoServico(linha.tenant_id, linha.sessao_id);
    const d = decidirIncidente({
      resultado: "ok",
      ultimoEvento: ultimo.evento,
      ultimoEventoEm: ultimo.em,
      agora,
    });
    if (d.tipo !== "recuperar") return "nada" as const;
    await gravar(linha, "evolution_recuperado", { silencioso: !d.alertar });
    logConexao("evolution_recuperado", { tenantId: linha.tenant_id, alertou: d.alertar });
    if (d.alertar) {
      await alertarGestor(
        linha,
        "WhatsApp voltou a responder",
        "O serviço do WhatsApp se recuperou. Confira em Automação do WhatsApp se a conexão está ativa.",
        `evolution-ok-${ultimo.em ?? agora.toISOString()}`,
      );
      await alertaDaPlataforma(linha, "resolver");
    }
    return d.alertar ? ("recuperado" as const) : ("nada" as const);
  } catch (e) {
    logConexao("registro_de_recuperacao_falhou", {
      tenantId: linha.tenant_id,
      erro: e instanceof Error ? e.message : "",
    });
    return "nada" as const;
  }
}
