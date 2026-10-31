/**
 * Flow Bot dentro do Flow: atende a mensagem de texto do cliente no WhatsApp com o fluxo publicado do negócio (ou o
 * modelo padrão), depois das respostas a avisos e antes da Flow IA (docs/flow-bot-no-flow-analise.md §4).
 *
 * - desligado: não faz nada (padrão de todo negócio);
 * - sombra: decide e grava no rastro o que responderia, sem enviar; a conversa segue como antes;
 * - ligado: envia pelo caminho oficial do WhatsApp do Flow (`enviarPelaBarbearia`).
 *
 * Nunca trava o atendimento: qualquer falha devolve `false` e a mensagem segue para a Flow IA ou a orientação fixa.
 */
import {
  configDoBot,
  humanoNoControle,
  motivoParaNaoAtender,
  prazoDoHumano,
  textosDasAcoes,
} from "./decisao";
import { PerfilDeRealidade } from "./nucleo/contratos";
import {
  compilar,
  novaSessao,
  processar,
  type Acao,
  type Passo,
  type Plano,
  type Sessao,
} from "./nucleo/motor";
import { VERSAO_DO_NUCLEO } from "./nucleo/versao";
import modeloPadrao from "./modelos/atendimento.json";
import perfilFlow from "./modelos/perfil.json";
import { realidadeDoNegocio } from "./realidade.server";
import { tabelaAusente } from "@/lib/horarios-especiais.server";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

const PERFIL = PerfilDeRealidade.parse(perfilFlow);
/** Planos compilados por referência (`padrao@versão` ou `<negócio>:v<n>`): versão publicada não muda. */
const planos = new Map<string, Plano>();

function planoDe(ref: string, fluxo: unknown): Plano {
  const pronto = planos.get(ref);
  if (pronto) return pronto;
  const plano = compilar(fluxo, { perfis: [PERFIL] });
  if (planos.size > 200) planos.clear();
  planos.set(ref, plano);
  return plano;
}

export type EntradaDoBot = {
  tenantId: string;
  conversaId: string;
  conexaoId: string;
  sessaoId: string;
  telefone: string;
  texto: string;
  mensagemExternaId: string | null;
  nomeContato: string | null;
};

export async function responderComFlowBot(input: EntradaDoBot): Promise<boolean> {
  const db = await admin();
  const agora = Date.now();

  const { data: linhaConfig, error: erroConfig } = await db
    .from("flow_bot_config")
    .select("modo, horario, pausa_humano_min, versao_publicada")
    .eq("tenant_id", input.tenantId)
    .maybeSingle();
  if (erroConfig) {
    // Migração 0055 ainda não aplicada: o bot simplesmente não existe neste banco.
    if (!tabelaAusente(erroConfig, "flow_bot_config"))
      console.error("[flow-bot] config", erroConfig.message);
    return false;
  }
  const config = configDoBot(linhaConfig as Record<string, unknown> | null);
  if (!config || config.modo === "desligado") return false;

  const [{ data: conversa }, equipe, realidade] = await Promise.all([
    db.from("conversas_whatsapp").select("*").eq("id", input.conversaId).maybeSingle(),
    import("@/lib/whatsapp/identidade.server").then((m) =>
      m.identificarEquipe(input.tenantId, input.telefone).catch(() => null),
    ),
    realidadeDoNegocio(db, input.tenantId, agora),
  ]);
  const naoAtende = motivoParaNaoAtender({
    config,
    equipe: Boolean(equipe),
    humano: humanoNoControle(conversa as Record<string, unknown> | null, agora),
    aberto: realidade["reality.isOpen"] === true,
  });
  if (naoAtende) return false;

  // Fluxo: a versão publicada do negócio ou o modelo padrão do Flow.
  let fluxoRef = `padrao@${VERSAO_DO_NUCLEO}`;
  let fluxo: unknown = modeloPadrao;
  if (config.versaoPublicada !== null) {
    const { data: versao, error } = await db
      .from("flow_bot_versoes")
      .select("fluxo")
      .eq("tenant_id", input.tenantId)
      .eq("versao", config.versaoPublicada)
      .maybeSingle();
    if (error || !versao) {
      console.error(
        "[flow-bot] versão publicada não encontrada",
        input.tenantId,
        config.versaoPublicada,
      );
      return false;
    }
    fluxoRef = `${input.tenantId}:v${config.versaoPublicada}`;
    fluxo = versao.fluxo;
  }
  const plano = planoDe(fluxoRef, fluxo);

  // Conversa em andamento; versão nova do fluxo começa do zero.
  const { data: guardada } = await db
    .from("flow_bot_sessoes")
    .select("fluxo_ref, sessao")
    .eq("conversa_id", input.conversaId)
    .maybeSingle();
  let sessao: Sessao =
    guardada && guardada.fluxo_ref === fluxoRef
      ? (guardada.sessao as Sessao)
      : novaSessao(plano.doc.flow.id);

  const passos: Passo[] = [];
  // Prazo vencido (esperava resposta e o cliente sumiu): avança o estado sem mandar a mensagem atrasada.
  if (sessao.prazo !== null && sessao.prazo <= agora) {
    const vencido = processar(
      plano,
      sessao,
      { type: "timer", id: `prazo-${sessao.prazo}`, at: agora },
      { realidade },
    );
    sessao = vencido.sessao;
    passos.push(...vencido.passos);
  }
  const nome = input.nomeContato?.trim() || undefined;
  const r = processar(
    plano,
    sessao,
    {
      type: "message",
      id: input.mensagemExternaId ?? crypto.randomUUID(),
      at: agora,
      text: input.texto,
      ...(nome ? { contact: { name: nome, firstName: nome.split(/\s+/)[0] } } : {}),
    },
    { realidade },
  );
  passos.push(...r.passos);
  const textos = textosDasAcoes(r.acoes);
  const handoff = r.acoes.some((a: Acao) => a.type === "handoff");

  const { data: rastro, error: erroRastro } = await db
    .from("flow_bot_rastro")
    .insert({
      tenant_id: input.tenantId,
      conversa_id: input.conversaId,
      mensagem_externa_id: input.mensagemExternaId,
      modo: config.modo,
      fluxo_ref: fluxoRef,
      motivo: r.motivo,
      passos,
      respostas: textos,
      realidade_ausente: r.realidadeAusente,
      enviado: false,
    })
    .select("id")
    .single();
  // Mesma mensagem entregue de novo: já foi decidida (e, ligado, respondida).
  if (erroRastro?.code === "23505") return config.modo === "ligado";
  if (erroRastro) console.error("[flow-bot] rastro", erroRastro.message);

  await db.from("flow_bot_sessoes").upsert({
    conversa_id: input.conversaId,
    tenant_id: input.tenantId,
    fluxo_ref: fluxoRef,
    sessao: r.sessao,
    atualizado_em: new Date(agora).toISOString(),
  });

  if (config.modo === "sombra") return false;
  if (!textos.length && !handoff) return false;

  const { enviarPelaBarbearia } = await import("@/lib/whatsapp/fluxo.server");
  let enviou = 0;
  for (const texto of textos) {
    try {
      await enviarPelaBarbearia({
        tenantId: input.tenantId,
        conversaId: input.conversaId,
        conexaoId: input.conexaoId,
        sessaoId: input.sessaoId,
        telefone: input.telefone,
        texto,
        porIa: false,
      });
      enviou++;
    } catch (e) {
      console.error("[flow-bot] envio", e instanceof Error ? e.message : e);
      break;
    }
  }
  if (rastro && enviou === textos.length) {
    await db.from("flow_bot_rastro").update({ enviado: true }).eq("id", rastro.id);
  }

  if (handoff) {
    // Pediu alguém da equipe: o bot e a Flow IA ficam em silêncio pelo prazo do negócio e a equipe é avisada.
    await db
      .from("conversas_whatsapp")
      .update({ modo_humano_ate: prazoDoHumano(agora, config.pausaHumanoMin) })
      .eq("id", input.conversaId);
    const { LINKS_DE_TELA } = await import("@/lib/links-de-tela");
    await db
      .rpc("criar_notificacao", {
        _tenant: input.tenantId,
        _tipo: "whatsapp_humano",
        _titulo: "Cliente pediu atendimento",
        _corpo: `${input.telefone}: "${input.texto.slice(0, 100)}"`,
        _link: LINKS_DE_TELA.inicio,
      })
      .then(
        () => undefined,
        () => undefined,
      );
  }
  return enviou > 0 || handoff;
}
